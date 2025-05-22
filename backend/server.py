from flask import Flask, request, jsonify
from flask_cors import CORS
from main import Carta, criar_baralho, definir_manilha
import random
from collections import deque

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Game state
games = {}

@app.route('/api/create-game', methods=['POST', 'OPTIONS'])
def create_game():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        data = request.get_json() or {}
        lives = data.get('lives', 3)  # Default to 3 lives if not specified
        player_name = data.get('player_name', 'Player 1')
        
        game_id = str(random.randint(1000, 9999))
        games[game_id] = {
            'players': [],
            'player_names': {},
            'vidas': {},
            'dealer_idx': 0,
            'cartas': 1,
            'crescendo': True,
            'estado': 'aguardando',
            'initial_lives': lives,
            'current_round': 0,
            'current_turn': None,
            'current_player_idx': None,
            'multiplicador': 1,
            'mesa': [],
            'vitorias': {},
            'canceladas': []
        }
        
        # Add the creator as the first player
        player_id = 1
        games[game_id]['players'].append(player_id)
        games[game_id]['player_names'][player_id] = player_name
        games[game_id]['vidas'][player_id] = lives
        games[game_id]['vitorias'][player_id] = 0
        
        return jsonify({
            'game_id': game_id, 
            'player_id': player_id,
            'game_state': games[game_id],
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/api/join-game/<game_id>', methods=['POST', 'OPTIONS'])
def join_game(game_id):
    if request.method == 'OPTIONS':
        return '', 204
    try:
        if game_id not in games:
            return jsonify({'error': 'Jogo não encontrado', 'status': 'error'}), 404
        
        data = request.get_json()
        player_name = data.get('player_name', f'Player {len(games[game_id]["players"]) + 1}')
        
        if len(games[game_id]['players']) >= 4:
            return jsonify({'error': 'Jogo cheio', 'status': 'error'}), 400
        
        # Check if game has already started
        if games[game_id]['estado'] != 'aguardando':
            return jsonify({'error': 'Jogo já iniciado', 'status': 'error'}), 400
        
        player_id = len(games[game_id]['players']) + 1
        games[game_id]['players'].append(player_id)
        games[game_id]['player_names'][player_id] = player_name
        games[game_id]['vidas'][player_id] = games[game_id]['initial_lives']
        games[game_id]['vitorias'][player_id] = 0
        
        return jsonify({
            'player_id': player_id,
            'game_state': games[game_id],
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e), 'status': 'error'}), 500

@app.route('/api/start-round/<game_id>', methods=['POST'])
def start_round(game_id):
    if game_id not in games:
        return jsonify({'error': 'Jogo não encontrado'}), 404
    
    game = games[game_id]
    
    # Need at least 2 players to start
    if len(game['players']) < 2:
        return jsonify({'error': 'Precisa de pelo menos 2 jogadores', 'status': 'error'}), 400
    
    # Reset round-specific state
    game['palpites'] = {}
    game['vitorias'] = {j: 0 for j in game['players']}
    game['mesa'] = []
    game['canceladas'] = []
    game['multiplicador'] = 1
    game['current_round'] = 0
    
    # Deal cards
    baralho = criar_baralho()
    carta_meio = baralho.popleft()
    manilha = definir_manilha(carta_meio)
    
    # Determine dealer and first player
    dealer_idx = game['dealer_idx']
    dealer = game['players'][dealer_idx]
    
    # Setup order of play (player after dealer goes first)
    idx_primeiro = (dealer_idx + 1) % len(game['players'])
    ordem_palpites = game['players'][idx_primeiro:] + game['players'][:idx_primeiro]
    game['ordem_jogada'] = ordem_palpites.copy()
    game['current_player_idx'] = 0
    
    # Distribute cards
    maos = {j: [str(baralho.popleft()) for _ in range(game['cartas'])] for j in game['players']}
    
    # Update game state
    game['estado'] = 'apostas'  # Start with betting phase
    game['carta_meio'] = str(carta_meio)
    game['manilha'] = manilha
    game['maos'] = maos
    game['dealer'] = dealer
    game['first_player'] = ordem_palpites[0]
    game['soma_palpites'] = 0
    
    return jsonify({
        'game_state': game,
        'carta_meio': str(carta_meio),
        'manilha': manilha,
        'status': 'success'
    })

@app.route('/api/make-bet/<game_id>', methods=['POST'])
def make_bet(game_id):
    if game_id not in games:
        return jsonify({'error': 'Jogo não encontrado'}), 404
    
    game = games[game_id]
    
    # Check if we're in the betting phase
    if game['estado'] != 'apostas':
        return jsonify({'error': 'Não é a fase de apostas', 'status': 'error'}), 400
    
    data = request.get_json()
    player_id = data.get('player_id')
    bet = data.get('bet')
    
    # Validate player turn
    if game['ordem_jogada'][game['current_player_idx']] != player_id:
        return jsonify({'error': 'Não é a sua vez', 'status': 'error'}), 400
    
    # Validate bet
    if bet < 0 or bet > game['cartas']:
        return jsonify({'error': 'Aposta inválida', 'status': 'error'}), 400
    
    # Check if last player and bet would make sum equal to number of cards
    is_last_player = game['current_player_idx'] == len(game['ordem_jogada']) - 1
    if is_last_player and game['soma_palpites'] + bet == game['cartas']:
        return jsonify({'error': 'Último jogador não pode fechar', 'status': 'error'}), 400
    
    # Register bet
    game['palpites'][player_id] = bet
    game['soma_palpites'] += bet
    
    # Move to next player or start playing phase
    game['current_player_idx'] += 1
    if game['current_player_idx'] >= len(game['ordem_jogada']):
        # All bets are in, start playing phase
        game['estado'] = 'jogando'
        game['current_player_idx'] = 0
        game['current_round'] = 1
    
    return jsonify({
        'game_state': game,
        'status': 'success'
    })

@app.route('/api/play-card/<game_id>', methods=['POST'])
def play_card(game_id):
    if game_id not in games:
        return jsonify({'error': 'Jogo não encontrado'}), 404
    
    game = games[game_id]
    
    # Check if we're in the playing phase
    if game['estado'] != 'jogando':
        return jsonify({'error': 'Não é a fase de jogo', 'status': 'error'}), 400
    
    data = request.get_json()
    player_id = int(data.get('player_id'))
    card_index = int(data.get('card_index'))
    
    # Validate player turn
    current_player = game['ordem_jogada'][game['current_player_idx']]
    if current_player != player_id:
        return jsonify({
            'error': 'Não é a sua vez',
            'status': 'error',
            'current_player': current_player,
            'your_id': player_id
        }), 400
    
    # Validate card index
    if card_index < 0 or card_index >= len(game['maos'][player_id]):
        return jsonify({'error': 'Índice de carta inválido', 'status': 'error'}), 400
    
    # Play the card
    carta = game['maos'][player_id][card_index]
    game['maos'][player_id].pop(card_index)
    
    # Add card to the table
    game['mesa'].append((player_id, carta))
    
    # Process card strength
    lead_strength = None
    lead_cards = []
    
    for player, card_str in game['mesa']:
        # Convert string representation back to Carta object for strength calculation
        valor = card_str[0]
        naipe = card_str[1]
        card = Carta(valor, naipe)
        
        # Calculate card strength
        strength = card.forca(game['manilha'])
        
        if lead_strength is None or strength > lead_strength:
            lead_strength = strength
            lead_cards = [(player, card_str)]
        elif strength == lead_strength:
            game['canceladas'].extend(lead_cards + [(player, card_str)])
            lead_strength = None
            lead_cards = []
    
    # Move to next player
    game['current_player_idx'] = (game['current_player_idx'] + 1) % len(game['ordem_jogada'])
    
    # If all players have played a card in this round
    if len(game['mesa']) == len(game['players']):
        if lead_cards:  # There is a winner
            winner_id = lead_cards[0][0]
            game['vitorias'][winner_id] += game['multiplicador']
            game['multiplicador'] = 1
            
            # Set winner as first player for next round
            winner_idx = game['players'].index(winner_id)
            game['ordem_jogada'] = game['players'][winner_idx:] + game['players'][:winner_idx]
            game['current_player_idx'] = 0
        else:  # No winner (all cards canceled out)
            if game['current_round'] == game['cartas']:
                # Final round, determine winner by suit
                highest_suit_card = None
                highest_suit_player = None
                
                for player, card_str in game['canceladas']:
                    valor = card_str[0]
                    naipe = card_str[1]
                    card = Carta(valor, naipe)
                    
                    if highest_suit_card is None or card.naipe > highest_suit_card.naipe:
                        highest_suit_card = card
                        highest_suit_player = player
                
                if highest_suit_player:
                    game['vitorias'][highest_suit_player] += game['multiplicador']
            else:
                # Not final round, increase multiplier
                game['multiplicador'] += 1
                
                # Last player goes first in next round
                last_player = game['mesa'][-1][0]
                last_idx = game['players'].index(last_player)
                game['ordem_jogada'] = game['players'][last_idx:] + game['players'][:last_idx]
                game['current_player_idx'] = 0
        
        # Clear table and start next round
        game['mesa'] = []
        game['current_round'] += 1
        
        # Check if round is over
        if game['current_round'] > game['cartas']:
            # Round is over, update lives
            for player_id in game['players']:
                palpite = game['palpites'].get(player_id, 0)
                vitorias = game['vitorias'].get(player_id, 0)
                
                # Deduct lives based on difference between bets and wins
                game['vidas'][player_id] -= abs(vitorias - palpite)
            
            # Check for eliminated players
            eliminated = [p for p in game['players'] if game['vidas'][p] <= 0]
            
            if eliminated:
                # Game over if any player is eliminated
                game['estado'] = 'terminado'
                game['eliminated'] = eliminated
            else:
                # Prepare for next round
                game['estado'] = 'aguardando'
                game['dealer_idx'] = (game['dealer_idx'] + 1) % len(game['players'])
                
                # Update number of cards for next round
                if game['crescendo']:
                    game['cartas'] += 1
                    max_cartas = 10 * 4 // len(game['players'])  # Maximum possible cards
                    if game['cartas'] >= max_cartas:
                        game['crescendo'] = False
                        game['cartas'] -= 1
                else:
                    game['cartas'] -= 1
                    if game['cartas'] <= 1:
                        game['crescendo'] = True
                        game['cartas'] += 1
    
    return jsonify({
        'game_state': game,
        'status': 'success'
    })

@app.route('/api/game-state/<game_id>', methods=['GET'])
def get_game_state(game_id):
    if game_id not in games:
        return jsonify({'error': 'Jogo não encontrado'}), 404
    
    return jsonify({
        'game_state': games[game_id],
        'status': 'success'
    })

@app.route('/api/test', methods=['GET'])
def test_api():
    return jsonify({
        'message': 'API is working!',
        'status': 'success'
    })

if __name__ == '__main__':
    app.run(debug=True, port=5002, host='0.0.0.0') 