import { NextApiRequest, NextApiResponse } from 'next';
import { getLobby, setLobby } from '../persistent-store';
import { Server as SocketServer } from 'socket.io';

const SUITS = ['♣', '♥', '♠', '♦'];
const VALUES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function createDeck() {
  const deck = SUITS.flatMap((suit) => VALUES.map((value) => ({ value, suit })));
  return shuffle(deck);
}

function getNextManilha(carta: string): string {
  const value = carta.substring(0, carta.length - 1);
  const valueIndex = VALUES.indexOf(value);
  return VALUES[(valueIndex + 1) % VALUES.length];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }
  
  const { id } = req.query;
  const lobby = await getLobby(id as string);
  
  if (!lobby) {
    return res.status(404).json({ status: 'error', error: 'Game not found' });
  }
  
  if (!lobby.gameState) {
    // If game state doesn't exist, initialize it
    const players = lobby.players.map((p) => p.id);
    const player_names = Object.fromEntries(lobby.players.map((p) => [p.id, p.name]));
    const vidas = Object.fromEntries(lobby.players.map((p) => [p.id, lobby.lives]));
    
    lobby.gameState = {
      players,
      player_names,
      vidas,
      estado: 'aguardando',
      initial_lives: lobby.lives,
      current_round: 0,
      current_hand: 0,
      multiplicador: 1,
      mesa: [],
      palpites: {},
      vitorias: {},
      eliminados: [],
      direction: 'up', // Track if we're going up or down in cards per hand
    };
  }
  
  const gameState = lobby.gameState;
  
  console.log(`Starting round request received. Current state: ${gameState.estado}, Round: ${gameState.current_round}, Hand: ${gameState.current_hand}, Cards per hand: ${gameState.cartas}`);
  
  if (gameState.estado !== 'aguardando' && gameState.estado !== 'round_over') {
    return res.status(400).json({ status: 'error', error: 'Cannot start round now' });
  }
  
  // If we're in round_over and it's the final round of a hand, clear any trick winners
  // and make sure we reset properly for the next hand
  if (gameState.estado === 'round_over' && 
      gameState.current_round === gameState.cartas) {
    console.log('Final round completed, transitioning to next hand');
  }
  
  // Update dealer for next round (rotate)
  if (gameState.dealer === undefined) {
    // First round, pick a random dealer
    gameState.dealer = gameState.players[Math.floor(Math.random() * gameState.players.length)];
  } else {
    // Rotate dealer
    const currentDealerIdx = gameState.players.indexOf(gameState.dealer);
    gameState.dealer = gameState.players[(currentDealerIdx + 1) % gameState.players.length];
  }
  
  // First player is after the dealer
  const nextDealerIdx = gameState.players.indexOf(gameState.dealer);
  gameState.first_player = gameState.players[(nextDealerIdx + 1) % gameState.players.length];
  
  // Reset game state for new round/hand
  gameState.multiplicador = 1;
  gameState.palpites = {};
  gameState.vitorias = {};
  gameState.mesa = [];
  gameState.eliminados = gameState.eliminados || [];
  
  // Reset tie flags for new round/hand
  gameState.tie_in_previous_round = false;
  gameState.tie_resolved_by_tiebreaker = false;
  gameState.winning_card_played_by = undefined;
  gameState.cancelled_cards = [];
  
  // Increment the hand counter if we're starting a new hand (not continuing a round)
  if (gameState.estado === 'aguardando') {
    gameState.current_hand = (gameState.current_hand || 0) + 1;
    gameState.current_round = 1; // Reset round counter for new hand
  } else {
    // If we're in a round_over state, we're continuing with the same hand
    gameState.current_round = (gameState.current_round || 0) + 1;
  }
  
  // Calculate the maximum number of cards per player
  const maxCardsPerPlayer = 5; // Maximum of 5 cards per player in a hand
  
  // Implement the wave pattern for cards per hand
  if (!gameState.direction) {
    gameState.direction = 'up';
  }
  
  // If we're starting a new hand, calculate the cards per player
  if (gameState.estado === 'aguardando') {
    if (gameState.cartas === undefined) {
      // First hand always starts with 1 card
      gameState.cartas = 1;
    } else {
      if (gameState.direction === 'up') {
        gameState.cartas++;
        // If we hit the max, change direction
        if (gameState.cartas >= maxCardsPerPlayer) {
          gameState.cartas = maxCardsPerPlayer;
          gameState.direction = 'down';
        }
      } else {
        gameState.cartas--;
        // If we hit the min, change direction
        if (gameState.cartas <= 1) {
          gameState.cartas = 1;
          gameState.direction = 'up';
        }
      }
    }
  }
  
  // Create and shuffle deck
  const deck = createDeck();
  
  // Deal middle card (for manilha)
  const middleCard = deck.shift();
  if (middleCard) {
    gameState.carta_meio = middleCard.value + middleCard.suit;
    gameState.manilha = getNextManilha(gameState.carta_meio);
  }
  
  // Deal cards to players
  gameState.maos = {};
  for (const player of gameState.players) {
    if (!gameState.eliminados.includes(player)) {
      gameState.maos[player] = [];
      for (let i = 0; i < gameState.cartas; i++) {
        const card = deck.shift();
        if (card) {
          gameState.maos[player].push(card.value + card.suit);
        }
      }
    }
  }
  
  // For one-card hands, store original hands to reference when playing
  if (gameState.cartas === 1) {
    gameState.original_maos = JSON.parse(JSON.stringify(gameState.maos));
    console.log("This is a one-card hand, preserving original cards");
  }
  
  // Get active players (not eliminated)
  const activePlayers = gameState.players.filter((id: number) => !gameState.eliminados.includes(id));
  
  // Set up betting phase
  gameState.estado = 'apostas';
  
  // First player is after the dealer (reuse first_player set earlier)
  console.log(`Dealer: Player ${gameState.dealer}, First player to bet/play: Player ${gameState.first_player}`);
  
  // Find the index of the first player
  const firstPlayerIndex = gameState.players.indexOf(gameState.first_player);
  
  // Construct the play order starting from first player
  const playOrder = [];
  for (let i = 0; i < gameState.players.length; i++) {
    const idx = (firstPlayerIndex + i) % gameState.players.length;
    const player = gameState.players[idx];
    // Only include active players in the play order
    if (!gameState.eliminados.includes(player)) {
      playOrder.push(player);
    }
  }
  
  console.log(`Play order: ${playOrder.join(', ')}`);
  
  gameState.ordem_jogada = playOrder;
  gameState.current_player_idx = 0;
  gameState.soma_palpites = 0;
  
  // For players with 0 lives, don't deal cards
  for (const player of gameState.players) {
    if (gameState.eliminados.includes(player)) {
      gameState.maos[player] = [];
      gameState.vitorias[player] = 0;
    } else {
      gameState.vitorias[player] = 0;
    }
  }
  
  // Update the lobby with the new game state
  lobby.gameState = gameState;
  await setLobby(lobby);
  
  // Emit the updated game state via WebSockets if available
  try {
    // @ts-ignore - NextJS doesn't have type definitions for socket.server.io
    const io = res.socket?.server?.io;
    if (io) {
      io.to(id as string).emit('game-state-update', { gameState });
    }
  } catch (error) {
    console.error('Error emitting socket event:', error);
    // Continue with the API response even if socket emission fails
  }
  
  return res.status(200).json({
    status: 'success',
    game_state: gameState
  });
} 