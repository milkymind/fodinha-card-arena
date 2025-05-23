import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { SocketContext } from '../App';
import styles from '../styles/Game.module.css';

interface GameProps {
  gameId: string;
  playerId: number;
  onLeaveGame: () => void;
}

interface GameState {
  players: number[];
  player_names: { [key: number]: string };
  vidas: { [key: number]: number };
  estado: string;
  carta_meio?: string;
  manilha?: string;
  maos?: { [key: number]: string[] };
  palpites?: { [key: number]: number };
  initial_lives: number;
  current_round?: number;
  current_hand?: number;
  current_player_idx?: number;
  ordem_jogada?: number[];
  multiplicador?: number;
  soma_palpites?: number;
  mesa?: [number, string][];
  vitorias?: { [key: number]: number };
  dealer?: number;
  first_player?: number;
  cartas?: number;
  eliminados?: number[];
  last_round_winner?: number;
  last_trick_winner?: number;
  round_over_timestamp?: number;
  tie_in_previous_round?: boolean;
  inactive_players?: number[];
  tie_resolved_by_tiebreaker?: boolean;
  winning_card_played_by?: number;
}

export default function Game({ gameId, playerId, onLeaveGame }: GameProps) {
  const socket = useContext(SocketContext);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [bet, setBet] = useState<string>('');
  const [gameStatus, setGameStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [waitingMsg, setWaitingMsg] = useState<string>('');
  const [lastPlayedCard, setLastPlayedCard] = useState<{playerId: number, card: string} | null>(null);
  const [winnerMessage, setWinnerMessage] = useState<string | null>(null);
  const [prevRoundWinner, setPrevRoundWinner] = useState<number | null>(null);
  const [roundEndMessage, setRoundEndMessage] = useState<string | null>(null);
  const [prevRound, setPrevRound] = useState<number | null>(null);
  const [prevHand, setPrevHand] = useState<number | null>(null);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [lastWinnerMessageTime, setLastWinnerMessageTime] = useState<number>(0);
  const [notificationType, setNotificationType] = useState<'turn' | 'waiting' | 'gameState' | 'error' | 'nextHand' | ''>('');
  const [lastSocketActivity, setLastSocketActivity] = useState<number>(Date.now());
  const [roundTransitionActive, setRoundTransitionActive] = useState<boolean>(false);
  const [lastPollingTime, setLastPollingTime] = useState<number>(Date.now());
  const [isProcessingGameState, setIsProcessingGameState] = useState<boolean>(false);
  const [isSubmittingBet, setIsSubmittingBet] = useState<boolean>(false);
  const [isPlayingCard, setIsPlayingCard] = useState<boolean>(false);
  const [clickedCardIndex, setClickedCardIndex] = useState<number | null>(null);
  const [lastActionTime, setLastActionTime] = useState<number>(0);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const [socketReady, setSocketReady] = useState<boolean>(false);
  const [lastRequestTimestamps, setLastRequestTimestamps] = useState<Record<string, number>>({});
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const actionDebounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [stateVersion, setStateVersion] = useState<number>(0);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, any>>(new Map());
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  
  // Use a ref to track if we're already attempting to reconnect
  const isReconnecting = useRef<boolean>(false);
  
  // Debounced action handler to prevent duplicate API calls
  const debounceAction = useCallback((actionKey: string, action: () => Promise<void>, delay: number = 500) => {
    // Clear any existing timer for this action
    if (actionDebounceTimers.current[actionKey]) {
      clearTimeout(actionDebounceTimers.current[actionKey]);
    }
    
    // Track when we last attempted this action
    const now = Date.now();
    const lastAttempt = lastRequestTimestamps[actionKey] || 0;
    
    // Use shorter delays for multi-card hands
    let adjustedDelay = delay;
    if (gameState?.cartas && gameState.cartas > 2) {
      // Reduce delays for hands with more cards
      adjustedDelay = Math.max(150, delay - (gameState.cartas - 2) * 75);
    }
    
    // If we just tried this action very recently, increase the debounce delay
    const timeGap = now - lastAttempt;
    if (timeGap < 800) {
      adjustedDelay = Math.min(800, adjustedDelay * 1.5);
    }
    
    // Set the last timestamp for this action
    setLastRequestTimestamps(prev => ({
      ...prev,
      [actionKey]: now
    }));
    
    // Set a new timer
    return new Promise<void>((resolve) => {
      actionDebounceTimers.current[actionKey] = setTimeout(async () => {
        try {
          await action();
          resolve();
        } catch (error) {
          console.error(`Action ${actionKey} failed:`, error);
          resolve();
        }
      }, adjustedDelay);
    });
  }, [lastRequestTimestamps, gameState?.cartas]);
  
  // Set up socket connections and listeners
  useEffect(() => {
    if (!socket) return;

    // Join the game room with retry logic
    const joinGameRoom = async () => {
      try {
        console.log(`Joining game room ${gameId} as player ${playerId}`);
        socket.emit('join-game', {
          gameId,
          playerId,
          playerName: localStorage.getItem(`player_name_${playerId}`) || `Player ${playerId}`
        });
        
        // Set socket as ready after a small delay to ensure connection is established
        setTimeout(() => {
          setSocketReady(true);
        }, 300);
      } catch (error) {
        console.error("Error joining game room:", error);
      }
    };
    
    joinGameRoom();

    // Handle socket connect events
    const onConnect = () => {
      console.log("Socket connected successfully");
      setLastSocketActivity(Date.now());
      
      // If we were previously connected and in a game, rejoin
      if (gameId && playerId) {
        joinGameRoom();
      }
    };

    // Handle socket disconnect events
    const onDisconnect = (reason: string) => {
      console.log(`Socket disconnected: ${reason}`);
      
      // Attempt reconnection if not intentionally disconnected
      if (reason !== "io client disconnect") {
        console.log("Socket will attempt to reconnect automatically");
      }
    };

    // Handle socket connection errors
    const onConnectError = (error: Error) => {
      console.error("Socket connection error:", error);
    };
    
    // Register event handlers
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    
    // Add heartbeat handler
    const onHeartbeat = (data: { timestamp: number }) => {
      setLastSocketActivity(Date.now());
      // Respond to the heartbeat to confirm connection is still active
      socket.emit('heartbeat-response', { timestamp: data.timestamp, version: stateVersion });
    };
    socket.on('heartbeat', onHeartbeat);
    
    // Handle reconnection events
    const onReconnect = (attemptNumber: number) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      joinGameRoom();
    };
    socket.on('reconnect', onReconnect);
    
    // Handle reconnection error
    const onReconnectError = (error: Error) => {
      console.error("Socket reconnection error:", error);
    };
    socket.on('reconnect_error', onReconnectError);
    
    // Handle explicit reconnection failures
    const onReconnectFailed = () => {
      console.error("Socket reconnection failed after all attempts");
    };
    socket.on('reconnect_failed', onReconnectFailed);
    
    // Handle manual reconnect success
    const onManualReconnectSuccess = () => {
      setLastSocketActivity(Date.now());
    };
    socket.on('manual-reconnect-success', onManualReconnectSuccess);
    
    // Listen for game state updates with better error handling
    const onGameStateUpdate = (data: any) => {
      try {
        // Skip update if we're already processing one
        if (isProcessingGameState) {
          console.log("Skipping state update - currently processing another one");
          return;
        }

        setIsProcessingGameState(true);
        setLastSocketActivity(Date.now());
        const newGameState = data?.gameState;
        const newVersion = data?.version || 0;
        
        // Ensure we have valid game state before processing
        if (!newGameState) {
          console.error("Received null or undefined game state");
          setIsProcessingGameState(false);
          return;
        }
        
        // Check if the update is newer than what we have
        if (newVersion <= stateVersion && stateVersion > 0) {
          console.log(`Ignoring outdated state update v${newVersion} (current: v${stateVersion})`);
          setIsProcessingGameState(false);
          return;
        }
        
        // Update our version tracking
        setStateVersion(newVersion);
        
        // Clear optimistic updates that have been confirmed by this state update
        setOptimisticUpdates(prev => {
          const updates = new Map(prev);
          // Clear updates older than a certain threshold
          const now = Date.now();
          
          // Convert entries to array to avoid iterator issues
          Array.from(updates.entries()).forEach(([actionId, update]) => {
            if (now - update.timestamp > 5000) {
              updates.delete(actionId);
            }
          });
          
          return updates;
        });
        
        // Detect round transitions
        if (gameState?.estado !== 'round_over' && newGameState?.estado === 'round_over') {
          setRoundTransitionActive(true);
          
          // Reset round transition flag after the transition period
          setTimeout(() => {
            setRoundTransitionActive(false);
          }, 1000);
        }
        
        // Reset round winner when starting a new hand
        if (prevHand !== null && newGameState?.current_hand !== prevHand) {
          setPrevRoundWinner(null);
          setWinnerMessage(null);
          
          // New hand has started
          setRoundEndMessage(`Hand ${prevHand + 1} complete! Starting hand ${newGameState.current_hand + 1} with ${newGameState.cartas} cards per player`);
          setNotificationType('gameState');
          
          // Clear the message after 2 seconds
          setTimeout(() => {
            setRoundEndMessage(null);
          }, 2000);
        }
          
          // Check for round changes
          if (prevRound !== null && 
            newGameState?.current_round !== prevRound) {
          // Round has changed - either within same hand or new hand
          if (newGameState?.current_hand === prevHand) {
            // Round has changed within the same hand
            setRoundEndMessage(`Round ${prevRound} complete! Starting round ${newGameState.current_round}`);
            setNotificationType('gameState');
            
            // Clear the message after 2 seconds
            setTimeout(() => {
              setRoundEndMessage(null);
            }, 2000);
          }
          
          // Always reset the winner message when round changes
          setWinnerMessage(null);
          setPrevRoundWinner(null);
        }
        
        // Check for estado changes from round_over to jogando (round transition)
        if (gameState?.estado === 'round_over' && newGameState?.estado === 'jogando') {
          // Clear any winner messages when transitioning to playing state
          setWinnerMessage(null);
          setPrevRoundWinner(null);
          }
          
        // Check if there's a new round result to announce
        const roundWinner = newGameState?.last_round_winner || newGameState?.last_trick_winner;
        if (roundWinner && roundWinner !== prevRoundWinner && 
            // Only set winner message if in round_over state to avoid showing during gameplay
            newGameState?.estado === 'round_over') {
          
          // Check if it was a tie (the multiplier will be > 1 if there was a tie in the previous round)
          if (newGameState?.tie_in_previous_round) {
            setWinnerMessage(`The round ended in a tie! Multiplier is now x${newGameState.multiplicador}`);
            setNotificationType('gameState');
          } else {
            const winnerName = newGameState?.player_names?.[roundWinner];
            setWinnerMessage(`${winnerName} won the round!`);
            setNotificationType('gameState');
          }
            setPrevRoundWinner(roundWinner);
          setLastWinnerMessageTime(Date.now());
            
          // Clear the message after 1.5 seconds
            setTimeout(() => {
              setWinnerMessage(null);
          }, 1500);
          }
          
          // Update game state
          setGameState(newGameState);
          updateGameStatus(newGameState);
          
          // Save current round and hand to detect changes
        setPrevRound(newGameState?.current_round || null);
        setPrevHand(newGameState?.current_hand || null);

        // Mark as done processing
        setTimeout(() => {
          setIsProcessingGameState(false);
        }, 50);
      } catch (error) {
        console.error("Error processing game state update:", error);
        setIsProcessingGameState(false);
      }
    };
    socket.on('game-state-update', onGameStateUpdate);

    // Listen for player actions (immediate feedback)
    socket.on('player-action', (data) => {
      const { playerId, action } = data;
      if (gameState?.player_names) {
        const playerName = gameState.player_names[playerId] || `Player ${playerId}`;
        let actionMsg = '';
        
        switch (action) {
          case 'play-card':
            actionMsg = `${playerName} played a card`;
            break;
          case 'make-bet':
            actionMsg = `${playerName} placed a bet`;
            break;
          case 'start-round':
            actionMsg = `${playerName} started a new round`;
            break;
          default:
            actionMsg = `${playerName} performed an action`;
        }
        
        // You could show a toast notification or similar feedback here
        console.log(actionMsg);
      }
    });

    // Listen for new players joining
    socket.on('player-joined', (data) => {
      const { playerId, playerName } = data;
      console.log(`${playerName} (Player ${playerId}) joined the game`);
      // Could show a notification or update UI
    });

    // Listen for action acknowledgments
    socket.on('action-received', (data) => {
      console.log('Action received by server:', data);
      // Remove from pending actions
      if (data.actionId) {
        setPendingActions(prev => {
          const updated = new Set(prev);
          updated.delete(data.actionId);
          return updated;
        });
      }
    });

    // Listen for action errors
    socket.on('action-error', (data) => {
      console.error('Action error:', data);
      setError(`Error: ${data.error}`);
      setNotificationType('error');
      
      // Clear any pending actions
      setPendingActions(new Set());
      setIsSubmittingBet(false);
      setIsPlayingCard(false);
      setClickedCardIndex(null);
    });

    // Enhanced reconnection handling
    socket.on('reconnect', () => {
      console.log("Socket reconnected automatically");
      joinGameRoom();
    });

    // Add heartbeat response handler
    socket.on('heartbeat', (data) => {
      // Check if we need to sync our state version
      const serverVersion = data.version || 0;
      
      if (serverVersion > stateVersion) {
        console.log(`State version mismatch: server v${serverVersion}, client v${stateVersion}. Requesting sync...`);
        
        // Only start a sync if we're not already syncing
        if (!syncInProgress) {
          setSyncInProgress(true);
          socket.emit('request-state-sync', {
            gameId,
            playerId,
            lastVersion: stateVersion
          });
          
          // Set a timeout to reset sync flag in case server doesn't respond
          setTimeout(() => {
            setSyncInProgress(false);
          }, 5000);
        }
      }
      
      // Respond to heartbeat
      socket.emit('heartbeat-response', {
        version: stateVersion
      });
      
      // Update last activity timestamp
      setLastSocketActivity(Date.now());
    });

    // Add handler for state sync completion
    socket.on('state-sync-complete', (data) => {
      setSyncInProgress(false);
      if (data.status === 'up-to-date') {
        console.log(`State sync confirms client is up-to-date at v${data.version}`);
        // Ensure our version matches server's
        setStateVersion(data.version || stateVersion);
      }
    });

    // Add optimistic update handler after existing socket.on handlers
    socket.on('optimistic-update', (data) => {
      try {
        setLastSocketActivity(Date.now());
        const { type, playerId, actionId } = data;
        
        console.log(`Received optimistic update: ${type} from player ${playerId}`);
        
        // Store the optimistic update
        setOptimisticUpdates(prev => {
          const updates = new Map(prev);
          updates.set(actionId, data);
          return updates;
        });
        
        // Apply visual update immediately based on type
        if (type === 'card-played' && data.cardIndex !== undefined) {
          // For card plays, we can update UI immediately
          if (gameState?.maos && gameState.maos[playerId] && gameState.maos[playerId][data.cardIndex]) {
            const cardToPlay = gameState.maos[playerId][data.cardIndex];
            setLastPlayedCard({ playerId, card: cardToPlay });
          }
        } else if (type === 'bet-made' && data.bet !== undefined) {
          // For bets, we could show a temporary UI indicator
          // This is just visual feedback until real state arrives
          console.log(`Optimistic bet: Player ${playerId} bet ${data.bet}`);
        }
      } catch (error) {
        console.error("Error handling optimistic update", error);
      }
    });

    // Initial game state fetch
    const fetchInitialGameState = async () => {
      try {
        const response = await fetch(`/api/game-state/${gameId}`, {
          headers: {
            'X-Player-ID': playerId.toString()
          }
        });
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.status === 'success' && data.game_state) {
          setGameState(data.game_state);
          updateGameStatus(data.game_state);
          setPrevRound(data.game_state.current_round || null);
          setPrevHand(data.game_state.current_hand || null);
        } else {
          console.error('Invalid game state in response:', data);
          setError('Invalid game data. Please try refreshing the page.');
          setNotificationType('error');
        }
      } catch (error) {
        console.error('Error fetching initial game state:', error);
        setError('Connection error. Please try refreshing the page.');
        setNotificationType('error');
      }
    };
    
    fetchInitialGameState();
    
    // Clean up socket listeners on unmount
    return () => {
      console.log("Cleaning up socket listeners");
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('heartbeat', onHeartbeat);
      socket.off('reconnect', onReconnect);
      socket.off('reconnect_error', onReconnectError);
      socket.off('reconnect_failed', onReconnectFailed);
      socket.off('manual-reconnect-success', onManualReconnectSuccess);
      socket.off('game-state-update', onGameStateUpdate);
      socket.off('player-joined');
      socket.off('player-action');
      socket.off('action-received');
      socket.off('action-error');
      socket.off('optimistic-update');
    };
  }, [gameId, playerId, socket, stateVersion, gameState, isProcessingGameState]);

  // Improved polling mechanism
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;
    
    const pollGameState = async () => {
      try {
        const now = Date.now();
        
        // Much more conservative polling - only poll if all conditions are met:
        // 1. We haven't polled in the last 30 seconds (increased from 15s)
        // 2. We haven't received a socket update in 45 seconds (increased from 12s)
        // 3. We're not currently processing a game state update
        // 4. We haven't performed a user action in the last 10 seconds (increased from 5s)
        // 5. We're not reconnecting
        // 6. Socket is either not connected or not available
        // 7. No recent successful user actions (if REST API is working, don't poll)
        const lastUserAction = Math.max(...Object.values(lastRequestTimestamps), 0);
        const recentSuccessfulAction = now - lastUserAction < 30000; // Recent action in last 30s
        
        const shouldPoll = !isProcessingGameState && 
            !isReconnecting.current &&
            !recentSuccessfulAction && // Don't poll if user actions are working
            now - lastPollingTime > 30000 && 
            now - lastSocketActivity > 45000 &&
            now - lastUserAction > 10000 &&
            (!socket || !socket.connected);
            
        if (shouldPoll) {
          console.log("Polling game state (WebSocket unavailable, no recent actions)");
          setLastPollingTime(now);
          
          const cacheParam = Math.random().toString(36).substring(7);
          const response = await fetch(`/api/game-state/${gameId}?nocache=${cacheParam}`, {
            headers: {
              'X-Player-ID': playerId.toString(),
              'Cache-Control': 'no-cache',
              'X-Request-Source': 'polling'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.game_state) {
              setGameState(data.game_state);
              updateGameStatus(data.game_state);
              setLastActivityTime(now);
            }
          }
        } else if (recentSuccessfulAction) {
          console.log("Skipping polling - recent user action indicates game is working");
        }
      } catch (error) {
        console.error("Error polling game state:", error);
      }
      
      // Poll again in 30 seconds (increased from 15s)
      timerId = setTimeout(pollGameState, 30000);
    };
    
    // Start polling with a longer initial delay (60s instead of 15s)
    timerId = setTimeout(pollGameState, 60000);
    
    // Clean up
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [gameId, playerId, gameState, lastActivityTime, lastSocketActivity, lastPollingTime, isProcessingGameState, lastRequestTimestamps, socket]);

  // Update last activity time when user interacts with the page
  useEffect(() => {
    const handleUserActivity = () => {
      setLastActivityTime(Date.now());
      
      // Clear any stale winner messages that might be stuck
      // Only clear if message has been shown for at least 2 seconds
      if (winnerMessage && (Date.now() - lastWinnerMessageTime > 2000)) {
        setWinnerMessage(null);
      }
    };

    // Add event listeners for user activity
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keypress', handleUserActivity);
    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    
    return () => {
      // Remove event listeners on cleanup
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
    };
  }, [winnerMessage, lastWinnerMessageTime]);

  // Update game status message based on state
  const updateGameStatus = (state: GameState) => {
    // Store the previous estado to detect transitions
    const prevEstado = gameState?.estado;
    
    if (state.estado === 'aguardando') {
      setGameStatus('Waiting to start the next hand');
      setWaitingMsg('');
      setNotificationType('nextHand');
    } else if (state.estado === 'apostas') {
      const currentPlayerIdx = state.current_player_idx ?? 0;
      const currentPlayer = state.ordem_jogada?.[currentPlayerIdx];
      if (currentPlayer !== undefined && currentPlayer === playerId) {
        setGameStatus('It\'s your turn to place a bet!');
        setWaitingMsg('');
        setNotificationType('turn');
      } else if (currentPlayer !== undefined) {
        setGameStatus(`Waiting for ${state.player_names[currentPlayer]} to place a bet`);
        setWaitingMsg('');
        setNotificationType('waiting');
      } else {
        setGameStatus('Waiting for bets');
        setWaitingMsg('');
        setNotificationType('waiting');
      }
    } else if (state.estado === 'jogando') {
      const currentPlayerIdx = state.current_player_idx ?? 0;
      const currentPlayer = state.ordem_jogada?.[currentPlayerIdx];
      if (currentPlayer !== undefined && currentPlayer === playerId) {
        setGameStatus('It\'s your turn to play a card!');
        setWaitingMsg('');
        setNotificationType('turn');
      } else if (currentPlayer !== undefined) {
        setGameStatus(`Waiting for ${state.player_names[currentPlayer]} to play a card`);
        setWaitingMsg('');
        setNotificationType('waiting');
      } else {
        setGameStatus('Waiting for plays');
        setWaitingMsg('');
        setNotificationType('waiting');
      }
    } else if (state.estado === 'round_over') {
      if (state.current_round && state.cartas && state.current_round < state.cartas) {
        // Between rounds in a multi-card hand
        if (state.tie_in_previous_round) {
          setGameStatus(`Round ${state.current_round} ended in a tie!`);
          setWinnerMessage(`Round ended in a tie! Multiplier is now x${state.multiplicador}`);
          setNotificationType('gameState');
          
          const nextPlayerToPlay = state.ordem_jogada?.[0];
          if (nextPlayerToPlay && state.player_names) {
            setWaitingMsg('');
          } else {
            setWaitingMsg('');
          }
        } else {
        const roundWinner = state.last_round_winner || state.last_trick_winner;
        if (roundWinner) {
          const winnerName = state.player_names[roundWinner];
          setGameStatus(`Round ${state.current_round} complete! ${winnerName} won this round.`);
            setNotificationType('gameState');
          
          // The next player to play is after the dealer (not the round winner)
          if (state.dealer && state.first_player) {
              setWaitingMsg('');
          } else {
              setWaitingMsg('');
          }
        } else {
          setGameStatus(`Round ${state.current_round} complete!`);
            setWaitingMsg('');
            setNotificationType('gameState');
          }
        }
      } else {
        // Between hands
        setGameStatus('Hand complete!');
        setNotificationType('gameState');
        
        // If there was a tie in the final round that was resolved by a tiebreaker
        if (state.tie_resolved_by_tiebreaker && state.last_round_winner) {
          const winnerName = state.player_names[state.last_round_winner];
          setWinnerMessage(`Final round ended in a tie! ${winnerName} won with a higher suit.`);
          
          // Have this message disappear after 3 seconds
          setTimeout(() => {
            setWinnerMessage(null);
          }, 3000);
        }
        
        // Show results summary
        let resultsMsg = 'Results: ';
        for (const playerId of state.players) {
          if (!state.eliminados?.includes(playerId)) {
            const name = state.player_names[playerId];
            const bet = state.palpites?.[playerId] || 0;
            const wins = state.vitorias?.[playerId] || 0;
            const lives = state.vidas?.[playerId] || 0;
            resultsMsg += `${name}: bet ${bet}, won ${wins}, lives ${lives} | `;
          }
        }
        setWaitingMsg(resultsMsg);
      }
    } else if (state.estado === 'terminado') {
      // Only set game over state once to prevent flashing
      if (prevEstado !== 'terminado') {
      const winners = state.players.filter(p => !state.eliminados?.includes(p));
      if (winners.length === 1) {
        const winner = winners[0];
        setGameStatus(`Game over! ${state.player_names[winner]} won!`);
          setNotificationType('gameState');
      } else {
        setGameStatus('Game over!');
          setNotificationType('gameState');
      }
      setWaitingMsg('');
      }
    }
  };

  // Improved startRound function
  const startRound = async () => {
    try {
      await debounceAction('start-round', async () => {
      setError('');
        console.log(`Player ${playerId} attempting to start new round`);
        
        if (socket && socket.connected) {
          socket.emit('game-action', {
            gameId,
            playerId,
            action: 'start-round',
            payload: {}
          });
        }
        
        // Add cache-busting parameter
        const cacheParam = Math.random().toString(36).substring(7);
        const response = await fetch(`/api/start-round/${gameId}?_=${cacheParam}`, {
        method: 'POST',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
      });
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
      const data = await response.json();
      
      if (data.status === 'success') {
          console.log("New round started successfully");
        setGameState(data.game_state);
        updateGameStatus(data.game_state);
      } else {
          throw new Error(data.error || 'Error starting round');
      }
      });
    } catch (error) {
      console.error('Error starting round:', error);
      setError(error instanceof Error ? error.message : 'Connection error');
      setNotificationType('error');
    }
  };

  // Update the makeBet function with similar optimizations as playCard
  const makeBet = async () => {
    if (!bet || isSubmittingBet) return;
    
    const betValue = parseInt(bet);
    setIsSubmittingBet(true);
    
    try {
      // Use shorter debounce for better responsiveness
      await debounceAction(`bet-${playerId}`, async () => {
      setError('');
        console.log(`Player ${playerId} attempting to place bet: ${betValue}`);
        
        if (socket && socket.connected) {
          // Generate unique action ID
          const actionId = `${gameId}-${playerId}-bet-${Date.now()}`;
          
          // Add to pending actions
          setPendingActions(prev => {
            const updated = new Set(prev);
            updated.add(actionId);
            return updated;
          });
          
          // Notify others about the action
          socket.emit('game-action', {
            gameId,
            playerId,
            action: 'make-bet',
            actionId,
            payload: { bet: betValue }
          });
        }
        
        let maxRetries = 2;
        let currentRetry = 0;
        let success = false;
        
        while (!success && currentRetry <= maxRetries) {
          try {
            // Add cache-busting parameter
            const cacheParam = Math.random().toString(36).substring(7);
            const response = await fetch(`/api/make-bet/${gameId}?_=${cacheParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ 
          player_id: playerId, 
                bet: betValue
        }),
      });
            
            // Handle rate limit (429) by waiting and retrying automatically
            if (response.status === 429) {
              const data = await response.json();
              console.log(`Rate limited: ${data.error}, will retry automatically`);
              
              // Wait for the suggested retry time or default to 1 second
              const retryAfter = data.retryAfter || 800;
              await new Promise(resolve => setTimeout(resolve, retryAfter));
              currentRetry++;
              continue;
            }
            
            if (!response.ok) {
              throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
      const data = await response.json();
      
      if (data.status === 'success') {
              console.log("Bet placed successfully");
        setGameState(data.game_state);
        updateGameStatus(data.game_state);
        setBet('');
              
              // Clear pending actions
              setPendingActions(new Set());
              
              // Mark as successful to exit the retry loop
              success = true;
      } else {
              throw new Error(data.error || 'Error making bet');
      }
          } catch (error) {
            console.error(`Attempt ${currentRetry + 1}/${maxRetries + 1} failed:`, error);
            if (currentRetry >= maxRetries) {
              throw error; // Re-throw if we've exhausted retries
            }
            currentRetry++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Faster retry
          }
        }
      }, 250); // Shorter debounce for better responsiveness
    } catch (error) {
      console.error('Error making bet:', error);
      setError(error instanceof Error ? error.message : 'Connection error');
      setNotificationType('error');
    } finally {
      // Set a shorter timeout before allowing another action
      setTimeout(() => {
        setIsSubmittingBet(false);
      }, 400); // Reduced from 500ms
    }
  };

  // Improve the playCard function for better responsiveness in multi-card hands
  const playCard = async (cardIndex: number) => {
    // Prevent playing card if already in progress
    if (isPlayingCard) {
      console.log('Card play already in progress, ignoring click');
      return;
    }
    
    // Update UI immediately for better responsiveness
    setIsPlayingCard(true);
    setClickedCardIndex(cardIndex);
    
    // Preemptively apply visual cues for card play
      const cardToPlay = gameState?.maos?.[playerId]?.[cardIndex];
      if (cardToPlay) {
        setLastPlayedCard({ playerId, card: cardToPlay });
      }
      
    try {
      // Reduce debounce delay for multi-card hands for better responsiveness
      const debounceDelay = gameState?.cartas && gameState.cartas > 2 ? 200 : 300;
      
      await debounceAction(`play-card-${playerId}-${cardIndex}`, async () => {
        setError('');
        console.log(`Player ${playerId} attempting to play card at index ${cardIndex}`);
        
        // Socket notification for immediate feedback
        if (socket && socket.connected) {
          // Generate unique action ID
          const actionId = `${gameId}-${playerId}-card-${cardIndex}-${Date.now()}`;
          
          // Add to pending actions
          setPendingActions(prev => {
            const updated = new Set(prev);
            updated.add(actionId);
            return updated;
          });
          
          // Notify others about the action immediately for better UX
          socket.emit('game-action', {
            gameId,
            playerId,
            action: 'play-card',
            actionId,
            payload: { cardIndex }
          });
        }
        
        let maxRetries = 2;
        let currentRetry = 0;
        let success = false;
        
        while (!success && currentRetry <= maxRetries) {
          try {
            // Add cache-busting parameter
            const cacheParam = Math.random().toString(36).substring(7);
            const response = await fetch(`/api/play-card/${gameId}?_=${cacheParam}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        body: JSON.stringify({ 
          player_id: playerId, 
          card_index: cardIndex 
        }),
      });
            
            // Handle rate limit (429) by waiting and retrying automatically
            if (response.status === 429) {
              const data = await response.json();
              console.log(`Rate limited: ${data.error}, will retry automatically`);
              
              // Wait for the suggested retry time or default to 1 second
              const retryAfter = data.retryAfter || 1000;
              await new Promise(resolve => setTimeout(resolve, retryAfter));
              currentRetry++;
              continue;
            }
            
            if (!response.ok) {
              throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
      const data = await response.json();
      
      if (data.status === 'success') {
              console.log("Card played successfully");
        setGameState(data.game_state);
        updateGameStatus(data.game_state);
        
              // Clear pending actions
              setPendingActions(new Set());
              
              // Mark as successful to exit the retry loop
              success = true;
      } else {
              throw new Error(data.error || 'Error playing card');
            }
          } catch (error) {
            console.error(`Attempt ${currentRetry + 1}/${maxRetries + 1} failed:`, error);
            if (currentRetry >= maxRetries) {
              throw error; // Re-throw if we've exhausted retries
            }
            currentRetry++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Faster retry
          }
        }
      }, debounceDelay); // Use variable debounce delay based on hand size
    } catch (error) {
      console.error('Error playing card:', error);
      setError(error instanceof Error ? error.message : 'Connection error');
      setNotificationType('error');
    } finally {
      // Clear last played card indication after animation time
      setTimeout(() => {
      setLastPlayedCard(null);
      }, 800);
      
      // Reset state after a shorter delay for better responsiveness
      setTimeout(() => {
        setIsPlayingCard(false);
        setClickedCardIndex(null);
      }, 600); // Reduced from 800ms for faster response
    }
  };

  // Get color class based on suit
  const getCardColorClass = (card: string) => {
    if (!card || card.length < 2) return '';
    const naipe = card.charAt(card.length - 1);
    return naipe === '♥' || naipe === '♦' ? styles.redCard : styles.blackCard;
  };
  
  // Get suit symbol class
  const getSuitClass = (card: string) => {
    if (!card || card.length < 2) return '';
    const naipe = card.charAt(card.length - 1);
    switch (naipe) {
      case '♣': return styles.clubSuit;
      case '♥': return styles.heartSuit;
      case '♠': return styles.spadeSuit;
      case '♦': return styles.diamondSuit;
      default: return '';
    }
  };

  // Format card for display
  const formatCard = (card: string) => {
    if (!card || card.length < 2) return { value: '', suit: '' };
    return { 
      value: card.substring(0, card.length - 1),
      suit: card.charAt(card.length - 1)
    };
  };

  // Check if it's player's turn
  const isPlayerTurn = () => {
    if (!gameState || !gameState.ordem_jogada) return false;
    const currentPlayerIdx = gameState.current_player_idx || 0;
    return gameState.ordem_jogada[currentPlayerIdx] === playerId;
  };

  // Check if this is a one-card hand
  const isOneCardHand = gameState?.cartas === 1;

  // Handler for new game (for now, just leave game)
  const handleNewGame = () => {
    onLeaveGame();
  };

  // Check if a player is inactive
  const isPlayerInactive = (id: number) => {
    // Only mark players as inactive if they have been detected as inactive by the server
    // and they are not just waiting for their turn
    return gameState?.inactive_players?.includes(id) && 
      // Don't show inactive during betting/playing phase for the players in the queue
      !((gameState.estado === 'apostas' || gameState.estado === 'jogando') && 
        gameState.ordem_jogada?.includes(id));
  };
  
  // Check if this player is in line waiting to make a bet or play
  const isPlayerWaiting = (id: number) => {
    return (gameState?.estado === 'apostas' || gameState?.estado === 'jogando') && 
           gameState.ordem_jogada?.includes(id) &&
           id !== gameState.ordem_jogada?.[gameState.current_player_idx || 0];
  };

  const getNotificationClass = () => {
    switch (notificationType) {
      case 'turn': return styles.turnNotification;
      case 'waiting': return styles.waitingNotification;
      case 'gameState': return styles.gameStateNotification;
      case 'error': return styles.errorNotification;
      case 'nextHand': return styles.nextHandNotification;
      default: return '';
    }
  };

  // Function to determine if a card is the winning card in this round
  const isWinningCard = (playerIdOfCard: number, card: string): boolean => {
    if (!gameState) return false;
    
    // Skip highlighting in tied rounds except for the final round of a hand
    if (gameState.tie_in_previous_round && 
        gameState.current_round !== gameState.cartas) {
      return false;
    }
    
    // Use the explicit flag if available
    if (gameState.winning_card_played_by !== undefined) {
      return playerIdOfCard === gameState.winning_card_played_by;
    }
    
    // During gameplay (not just in round_over state), we can highlight the current winning card
    if (gameState.estado === 'jogando' || gameState.estado === 'round_over') {
      // If there's only one card played so far, it's currently winning
      if (gameState.mesa && gameState.mesa.length === 1) {
        const [firstPlayerId, firstCard] = gameState.mesa[0];
        return playerIdOfCard === firstPlayerId && card === firstCard;
      }
      
      // For more than one card, implement the winning card logic:
      // 1. Cards of the manilha suit win over non-manilha
      // 2. Higher value cards win within the same suit
      // 3. First card played wins ties
      if (gameState.mesa && gameState.mesa.length > 1 && gameState.manilha) {
        // Extract the winning card logic here...
        // But for now, just use the last_trick_winner as a proxy if available
        if (gameState.last_trick_winner === playerIdOfCard) {
          return true;
        }
      }
    }
    
    // Get the round winner
    const roundWinner = gameState.last_round_winner || gameState.last_trick_winner;
    
    // If no winner is set or it's a tie in a non-final round, don't highlight
    if (!roundWinner || (gameState.tie_in_previous_round && gameState.current_round !== gameState.cartas)) {
      return false;
    }
    
    // If this is the card played by the winner
    return playerIdOfCard === roundWinner;
  };

  return (
    <div className={styles.gameContainer} onClick={() => setLastActivityTime(Date.now())}>
      <div className={styles.header}>
        <h2>Game Room: {gameId}</h2>
        <div className={styles.gameInfo}>
          {gameState?.current_hand !== undefined && gameState.current_hand >= 0 && (
            <p className={styles.handInfo}>Hand: {gameState.current_hand + 1}</p>
          )}
          {gameState?.current_round !== undefined && gameState.current_round > 0 && gameState?.cartas !== undefined && gameState.cartas > 0 && (
            <p className={styles.roundInfo}>Round: {gameState.current_round} of {gameState.cartas}</p>
          )}
          {gameState?.multiplicador && gameState.multiplicador > 1 && (
            <p className={styles.multiplier}>
              Multiplier: x{gameState.multiplicador}
            </p>
          )}
        </div>
        <button onClick={onLeaveGame} className={styles.leaveButton}>
          Leave Game
        </button>
      </div>

      {gameStatus && (
        <div className={`${styles.gameStatus} ${getNotificationClass()}`}>
          <p>{gameStatus}</p>
        </div>
      )}

      {waitingMsg && (
        <div className={styles.waitingMsg}>
          <p>{waitingMsg}</p>
        </div>
      )}

      {winnerMessage && (
        <div className={`${styles.winnerMessage} ${styles.gameStateNotification}`}>
          <p>{winnerMessage}</p>
        </div>
      )}
      
      {roundEndMessage && (
        <div className={`${styles.roundEndMessage} ${styles.gameStateNotification}`}>
          <p>{roundEndMessage}</p>
        </div>
      )}

      {error && (
        <div className={`${styles.errorMessage} ${styles.errorNotification}`}>
          <p>{error}</p>
        </div>
      )}

      <div className={styles.playersList}>
        <h3>Players</h3>
        <div className={styles.playersGrid}>
          {gameState?.players.map((id) => (
            <div 
              key={id} 
              className={`${styles.playerCard} 
                ${id === playerId ? styles.currentPlayer : ''} 
                ${isPlayerTurn() && gameState.ordem_jogada?.[gameState.current_player_idx || 0] === id ? styles.activePlayer : ''} 
                ${(gameState.last_round_winner === id || gameState.last_trick_winner === id) ? styles.lastWinner : ''}
                ${isPlayerInactive(id) ? styles.inactivePlayer : ''}
                ${isPlayerWaiting(id) ? styles.waitingPlayer : ''}`}
            >
              <div className={styles.playerName}>
                {gameState.player_names[id]} {id === playerId ? '(You)' : ''}
                {gameState.dealer === id && <span className={styles.dealerLabel}> 🎲</span>}
                {isPlayerInactive(id) && <span className={styles.inactiveLabel}> ⚠️ Inactive</span>}
                {isPlayerWaiting(id) && <span className={styles.waitingLabel}> (Waiting)</span>}
              </div>
              <div className={styles.playerStats}>
                <div className={styles.playerLives}>
                  {'❤️'.repeat(Math.max(0, gameState.vidas[id]))}
                  {gameState.vidas[id] <= 0 && <span className={styles.eliminatedText}>Eliminated</span>}
                </div>
                {gameState.palpites && gameState.palpites[id] !== undefined && (
                  <div className={styles.playerBet}>
                    Bet: {gameState.palpites[id]}
                  </div>
                )}
                {gameState.vitorias && (
                  <div className={styles.playerWins}>
                    Wins: {gameState.vitorias[id] || 0}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Game table section */}
      <div className={styles.gameTable}>
        {gameState?.carta_meio && (
          <div className={styles.tableInfo}>
            <div className={styles.centerCardContainer}>
              <div className={`${styles.card} ${getCardColorClass(gameState.carta_meio)}`}>
                <div className={styles.cardContent}>
                  <span className={styles.cardValue}>{formatCard(gameState.carta_meio).value}</span>
                  <span className={`${styles.cardSuit} ${getSuitClass(gameState.carta_meio)}`}>
                    {formatCard(gameState.carta_meio).suit}
                  </span>
                </div>
              </div>
              <div className={styles.cardLabel}>Middle Card</div>
            </div>
            <div className={styles.manilhaContainer}>
              <div className={styles.manilhaInfo}>
                <span>Manilha: </span>
                <span className={styles.manilhaValue}>{gameState.manilha}</span>
              </div>
            </div>
          </div>
        )}

        {/* Other players' cards in one-card hand */}
        {isOneCardHand && gameState?.estado === 'apostas' && gameState?.maos && (
          <div className={styles.otherPlayersCards}>
            <h3>Other Players' Cards</h3>
            <div className={styles.tableCards}>
              {gameState.players
                .filter(id => id !== playerId)
                .map((id) => 
                  gameState.maos && gameState.maos[id] && gameState.maos[id].length > 0 ? (
                    <div key={id} className={styles.playedCardContainer}>
                      <div className={`${styles.card} ${getCardColorClass(gameState.maos[id][0])}`}>
                        <div className={styles.cardContent}>
                          <span className={styles.cardValue}>{formatCard(gameState.maos[id][0]).value}</span>
                          <span className={`${styles.cardSuit} ${getSuitClass(gameState.maos[id][0])}`}>
                            {formatCard(gameState.maos[id][0]).suit}
                          </span>
                        </div>
                      </div>
                      <div className={styles.playerLabel}>
                        {gameState.player_names[id]}
                      </div>
                    </div>
                  ) : null
              )}
            </div>
          </div>
        )}

        {gameState?.mesa && gameState.mesa.length > 0 && (
          <div className={styles.playedCards}>
            <h3>Played Cards</h3>
            <div className={styles.tableCards}>
              {gameState.mesa.map(([pid, card], index) => (
                <div key={index} className={styles.playedCardContainer}>
                  <div className={`${styles.card} 
                    ${getCardColorClass(card)} 
                    ${lastPlayedCard?.playerId === pid && lastPlayedCard?.card === card ? styles.lastPlayed : ''}
                    ${isWinningCard(pid, card) ? styles.winningCard : ''}
                  `}>
                    <div className={styles.cardContent}>
                      <span className={styles.cardValue}>{formatCard(card).value}</span>
                      <span className={`${styles.cardSuit} ${getSuitClass(card)}`}>
                        {formatCard(card).suit}
                      </span>
                    </div>
                  </div>
                  <div className={styles.playerLabel}>
                    {gameState.player_names[pid]}
                    {isWinningCard(pid, card) && <span className={styles.winnerLabel}>👑</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {gameState?.estado === 'aguardando' && playerId === 1 && (
        <div className={styles.actionContainer}>
          <button 
            onClick={startRound} 
            className={styles.actionButton}
          >
            Start New Hand
          </button>
        </div>
      )}

      {gameState?.estado === 'aguardando' && playerId !== 1 && (
        <div className={styles.actionContainer}>
          <p className={`${styles.waitingMsg} ${styles.nextHandNotification}`}>Waiting for host to start next hand...</p>
        </div>
      )}

      {gameState?.estado === 'apostas' && isPlayerTurn() && (
        <div className={styles.betContainer}>
          <h3>Make Your Bet</h3>
          <div className={styles.betControls}>
            <input
              type="number"
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              min="0"
              max={gameState.cartas || 1}
              className={styles.betInput}
              disabled={isSubmittingBet}
            />
            <button 
              onClick={makeBet} 
              className={`${styles.actionButton} ${isSubmittingBet ? styles.buttonDisabled : ''}`}
              disabled={isSubmittingBet}
            >
              {isSubmittingBet ? 'Confirming...' : 'Confirm Bet'}
            </button>
          </div>
          <p className={styles.betHint}>
            Total bets so far: {gameState.soma_palpites || 0} / {gameState.cartas}
          </p>
        </div>
      )}

      {/* Only show player's hand if it's not a one-card hand */}
      {gameState?.maos && gameState.maos[playerId] && gameState.maos[playerId].length > 0 && 
       !isOneCardHand && (
        <div className={styles.handContainer}>
          <h3>Your Hand</h3>
          <div className={styles.cards}>
            {gameState.maos[playerId].map((card, index) => (
              <button
                key={index}
                onClick={() => gameState.estado === 'jogando' && isPlayerTurn() && !isPlayingCard ? playCard(index) : null}
                className={`${styles.card} ${getCardColorClass(card)} ${
                  gameState.estado === 'jogando' && isPlayerTurn() && !isPlayingCard ? styles.playable : ''
                } ${clickedCardIndex === index ? styles.cardSelected : ''}`}
                disabled={gameState.estado !== 'jogando' || !isPlayerTurn() || isPlayingCard}
              >
                <div className={styles.cardContent}>
                  <span className={styles.cardValue}>{formatCard(card).value}</span>
                  <span className={`${styles.cardSuit} ${getSuitClass(card)}`}>
                    {formatCard(card).suit}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* For one-card hand during playing phase, show hidden card */}
      {isOneCardHand && gameState?.estado === 'jogando' && gameState?.maos && gameState.maos[playerId] && (
        <div className={styles.handContainer}>
          <h3>Your Hidden Card</h3>
          <div className={styles.cards}>
            <button
              onClick={() => isPlayerTurn() && !isPlayingCard ? playCard(0) : null}
              className={`${styles.card} ${styles.hiddenCard} ${
                isPlayerTurn() && !isPlayingCard ? styles.playable : ''
              } ${clickedCardIndex === 0 ? styles.cardSelected : ''}`}
              disabled={!isPlayerTurn() || isPlayingCard}
            >
              <div className={styles.cardBackContent}>
                <span>?</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {gameState?.palpites && Object.keys(gameState.palpites).length > 0 && (
        <div className={styles.betsInfo}>
          <h3>All Bets</h3>
          <div className={styles.betsList}>
            {Object.entries(gameState.palpites).map(([pid, betValue]) => (
              <div key={pid} className={styles.betItem}>
                <span className={styles.betPlayer}>{gameState.player_names[Number(pid)]}</span>
                <span className={styles.betValue}>{betValue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {gameState?.estado === 'terminado' && (
        <div className={styles.gameOver}>
          <h2>Game Over!</h2>
          <div className={styles.finalResults}>
            {gameState.players.map(id => (
              <div 
                key={id}
                className={`${styles.resultRow} ${gameState.eliminados?.includes(id) ? styles.eliminated : styles.winner}`}
              >
                <span className={styles.resultName}>
                  {gameState.player_names[id]} {id === playerId ? '(You)' : ''}: 
                </span>
                <span className={styles.resultLives}>
                  {gameState.vidas[id] <= 0 ? 'Eliminated' : `${gameState.vidas[id]} lives left`}
                </span>
              </div>
            ))}
          </div>
          <button className={styles.actionButton} onClick={handleNewGame}>
            New Game
          </button>
          <button className={styles.leaveButton} onClick={onLeaveGame}>
            Leave Game
          </button>
        </div>
      )}
    </div>
  );
} 