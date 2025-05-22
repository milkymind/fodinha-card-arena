import { NextApiRequest, NextApiResponse } from 'next';
import { getLobby, setLobby } from '../persistent-store';

const SUITS = ['♣', '♥', '♠', '♦'];
const VALUES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

function shuffle<T>(array: T[]): T[] {
  const result = [...array]; // Create a copy to avoid mutating the original
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]; // Swap elements
  }
  return result;
}

function createDeck() {
  const deck = SUITS.flatMap((suit) => VALUES.map((value) => ({ value, suit })));
  return shuffle(deck);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }
  
  try {
    const { id } = req.query;
    console.log(`Starting game with ID: ${id}`);
    
    if (!id || typeof id !== 'string') {
      console.error('Invalid game ID');
      return res.status(400).json({ status: 'error', error: 'Invalid game ID' });
    }
    
    const lobby = await getLobby(id);
    
    if (!lobby) {
      console.error(`Lobby not found for game ${id}`);
      return res.status(404).json({ status: 'error', error: 'Lobby not found' });
    }
    
    if (lobby.players.length < 2) {
      console.error(`Not enough players in game ${id} - only ${lobby.players.length} player(s)`);
      return res.status(400).json({ status: 'error', error: 'At least 2 players are required to start the game' });
    }
    
    // Mark the lobby as started
    lobby.gameStarted = true;
    console.log(`Initializing game state for game ${id} with ${lobby.players.length} players`);

    // Initialize game state
    const players = lobby.players.map((p) => p.id);
    const player_names = Object.fromEntries(lobby.players.map((p) => [p.id, p.name]));
    const vidas = Object.fromEntries(lobby.players.map((p) => [p.id, lobby.lives]));
    const round = 1;
    const deck = createDeck();
    const hands: Record<number, string[]> = {};
    const cardsPerPlayer = round;
    
    console.log(`Dealing ${cardsPerPlayer} card(s) to each player`);
    for (const pid of players) {
      hands[pid] = deck.splice(0, cardsPerPlayer).map(card => card.value + card.suit);
    }
    
    const carta_meio = deck.shift();
    const manilha = carta_meio ? VALUES[(VALUES.indexOf(carta_meio.value) + 1) % VALUES.length] : undefined;
    console.log(`Middle card: ${carta_meio?.value}${carta_meio?.suit}, Manilha: ${manilha}`);

    // For one-card hands, also keep the original hands for later reference
    // (since we'll remove cards as they're played)
    const original_hands = JSON.parse(JSON.stringify(hands));
    
    // Select the first dealer (player 1 by default)
    const dealer = players[0];
    
    // In Fodinha, the first player is always the one after the dealer
    const dealerIndex = players.indexOf(dealer);
    const firstPlayerIndex = (dealerIndex + 1) % players.length;
    const firstPlayer = players[firstPlayerIndex];
    
    console.log(`Dealer: Player ${dealer}, First player: Player ${firstPlayer}`);
    
    // Create the order of play, starting with the first player
    const playOrder = [
      ...players.slice(firstPlayerIndex),
      ...players.slice(0, firstPlayerIndex)
    ];
    
    console.log(`Play order: ${playOrder.join(', ')}`);

    const gameState = {
      players,
      player_names,
      vidas,
      estado: 'apostas',
      carta_meio: carta_meio ? carta_meio.value + carta_meio.suit : '',
      manilha,
      maos: hands,
      original_maos: original_hands, // Add original hands for one-card games
      palpites: {},
      initial_lives: lobby.lives,
      current_round: 1,
      current_hand: 0,
      current_player_idx: 0,
      ordem_jogada: playOrder,
      multiplicador: 1,
      soma_palpites: 0,
      mesa: [],
      vitorias: Object.fromEntries(players.map(pid => [pid, 0])),
      dealer: dealer,
      first_player: firstPlayer,
      cartas: cardsPerPlayer,
      eliminados: [],
      // For tracking player activity
      last_activity: Object.fromEntries(players.map(pid => [pid, Date.now()])),
    };
    
    // Set first player to play
    gameState.current_player_idx = gameState.ordem_jogada.indexOf(gameState.first_player);
    if (gameState.current_player_idx === -1) gameState.current_player_idx = 0;
    
    lobby.gameState = gameState;
    
    // Save the updated lobby and game state
    const success = await setLobby(lobby);
    
    if (!success) {
      console.error(`Failed to save game state for game ${id}`);
      return res.status(500).json({ status: 'error', error: 'Failed to save game state' });
    }
    
    console.log(`Game ${id} successfully started`);
    
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Error starting game:', error);
    return res.status(500).json({ 
      status: 'error', 
      error: 'Failed to start game',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 