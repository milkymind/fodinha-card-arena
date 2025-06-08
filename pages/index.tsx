import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';
import Game from '../src/components/Game';

interface LobbyInfo {
  players: { id: number; name: string }[];
  maxPlayers: number;
  lives: number;
}

export default function Home() {
  const [gameId, setGameId] = useState<string>('');
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [joinGameId, setJoinGameId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [lives, setLives] = useState<number>(3);
  const [lobbyInfo, setLobbyInfo] = useState<LobbyInfo | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const createGame = async () => {
    try {
      setError('');
      const response = await fetch('/api/create-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          player_name: playerName,
          lives: lives 
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setGameId(data.game_id);
        setPlayerId(data.player_id);
        setLobbyInfo(data.lobby);
        setError('');
      } else {
        setError(data.error || 'Failed to create game');
      }
    } catch (error) {
      console.error('Error creating game:', error);
      setError('Failed to connect to the game server');
    }
  };

  const joinGame = async (id: string) => {
    try {
      setError('');
      const response = await fetch(`/api/join-game/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player_name: playerName }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPlayerId(data.player_id);
        setGameId(id);
        setLobbyInfo(data.lobby);
        setError('');
      } else {
        setError(data.error || 'Failed to join game');
      }
    } catch (error) {
      console.error('Error joining game:', error);
      setError('Failed to connect to the game server');
    }
  };

  const handleLeaveGame = () => {
    setGameId('');
    setPlayerId(null);
    setJoinGameId('');
    setLobbyInfo(null);
    setGameStarted(false);
    setError('');
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Poll lobby info every 2 seconds if in a lobby and game not started
  useEffect(() => {
    if (gameId && playerId && !gameStarted) {
      const poll = async () => {
        try {
          const response = await fetch(`/api/lobby-info/${gameId}`);
          const data = await response.json();
          if (data.status === 'success') {
            setLobbyInfo(data.lobby);
            if (data.lobby.gameStarted) {
              setGameStarted(true);
            }
          }
        } catch (e) {
          // ignore
        }
      };
      poll();
      pollingRef.current = setInterval(poll, 2000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [gameId, playerId, gameStarted]);

  // Start game handler (host only)
  const handleStartGame = async () => {
    if (!gameId) return;
    try {
      const response = await fetch(`/api/start-game/${gameId}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.status === 'success') {
        setGameStarted(true);
      } else {
        setError(data.error || 'Failed to start game');
      }
    } catch (e) {
      setError('Failed to start game');
    }
  };

  // Show Game component if started
  if ((gameId && playerId) && gameStarted) {
    return (
      <Game
        gameId={gameId}
        playerId={playerId}
        onLeaveGame={handleLeaveGame}
      />
    );
  }

  // Show lobby info if in a lobby but before game starts
  if ((gameId && playerId) && lobbyInfo) {
    const isHost = lobbyInfo.players[0]?.id === playerId;
    return (
      <div className={styles.container}>
        <h2>Lobby: {gameId}</h2>
        <div className={styles.section}>
          <h3>Players ({lobbyInfo.players.length} / {lobbyInfo.maxPlayers})</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {lobbyInfo.players.map((p) => (
              <li key={p.id} style={{ fontWeight: p.id === playerId ? 'bold' : 'normal' }}>
                {p.name} {p.id === playerId ? '(You)' : ''}
              </li>
            ))}
          </ul>
          <p>Lives per player: <b>{lobbyInfo.lives}</b></p>
          <p>Share this lobby code with friends to join: <b>{gameId}</b></p>
          {isHost && (
            <button className={styles.button} onClick={handleStartGame} disabled={lobbyInfo.players.length < 2}>
              Start Game
            </button>
          )}
          <button className={styles.button} onClick={handleLeaveGame}>Leave Lobby</button>
          {isHost && lobbyInfo.players.length < 2 && (
            <p style={{ color: 'red', marginTop: 8 }}>At least 2 players are required to start.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Fodinha Card Game</h1>
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
      <div className={styles.section}>
        <h2>Join or Create a Game</h2>
        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className={styles.input}
          />
        </div>
        <div className={styles.livesSelection}>
          <h3>Select Lives (for new game)</h3>
          <div className={styles.livesOptions}>
            <button 
              onClick={() => setLives(3)} 
              className={`${styles.livesButton} ${lives === 3 ? styles.selected : ''}`}
            >
              3 Lives
            </button>
            <button 
              onClick={() => setLives(5)} 
              className={`${styles.livesButton} ${lives === 5 ? styles.selected : ''}`}
            >
              5 Lives
            </button>
            <button 
              onClick={() => setLives(7)} 
              className={`${styles.livesButton} ${lives === 7 ? styles.selected : ''}`}
            >
              7 Lives
            </button>
          </div>
        </div>

        <div className={styles.buttonsGroup}>
          <button
            onClick={createGame}
            className={styles.button}
            disabled={!playerName}
          >
            Create New Game
          </button>
        </div>
        
        <div className={styles.joinSection}>
          <h3>Join Existing Game</h3>
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Game ID"
              value={joinGameId}
              onChange={(e) => setJoinGameId(e.target.value)}
              className={styles.input}
            />
            <button
              onClick={() => joinGame(joinGameId)}
              className={styles.button}
              disabled={!joinGameId || !playerName}
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
      {gameId && !playerId && (
        <div className={styles.section}>
          <h2>Game Created!</h2>
          <p>Your Game ID: {gameId}</p>
          <p>Share this ID with your friends to let them join.</p>
          <button
            onClick={() => joinGame(gameId)}
            className={styles.button}
            disabled={!playerName}
          >
            Join Your Game
          </button>
        </div>
      )}
      
      {/* Rules/Tutorial Section */}
      <div className={styles.section}>
        <h2>🎯 How to Play Fodinha</h2>
        <div className={styles.rulesSection}>
          
          <h3>📋 Game Overview</h3>
          <p>
            Fodinha is a Brazilian trick-taking card game where players try to predict exactly how many tricks (rounds) they will win. 
            The goal is to make your exact bet - no more, no less!
          </p>
          
          <h3>🎮 Game Setup</h3>
          <ul>
            <li><strong>Players:</strong> 2-6 players</li>
            <li><strong>Lives:</strong> Each player starts with 3, 5, or 7 lives</li>
            <li><strong>Cards:</strong> Standard 52-card deck with special card hierarchy</li>
          </ul>
          
          <div className={styles.cardHierarchy}>
            <h3>🃏 Card Hierarchy (Strongest to Weakest)</h3>
            <ol>
              <li><strong>Manilha:</strong> The card that comes after the middle card (changes each hand)</li>
              <li><strong>Aces (A)</strong></li>
              <li><strong>Kings (K)</strong></li>
              <li><strong>Jacks (J)</strong></li>
              <li><strong>Queens (Q)</strong></li>
              <li><strong>7, 6, 5, 4</strong></li>
              <li><strong>3, 2</strong> (weakest)</li>
            </ol>
          </div>
          
          <h3>🎯 How to Play</h3>
          <div style={{ marginLeft: '20px' }}>
            <h4>1. Betting Phase</h4>
            <ul>
              <li>Look at your cards and predict how many tricks you'll win</li>
              <li><strong>Important:</strong> The last player cannot make a bet that would make the total bets equal to the number of cards</li>
              <li>Example: In a 3-card hand, if bets total 2, the last player cannot bet 1</li>
            </ul>
            
            <h4>2. Playing Phase</h4>
            <ul>
              <li>Players take turns playing one card</li>
              <li>The highest card wins the trick (round)</li>
              <li>The winner of each trick leads the next one</li>
              <li><strong>Card Cancellation:</strong> If two players play cards of the same strength, they cancel each other out</li>
            </ul>
            
            <h4>3. Scoring</h4>
            <ul>
              <li><strong>Exact Match:</strong> If you win exactly what you bet, you keep all your lives</li>
              <li><strong>Wrong Guess:</strong> If you win more or fewer tricks than you bet, you lose 1 life</li>
            </ul>
          </div>
          
          <h3>🏆 Winning & Elimination</h3>
          <ul>
            <li>When you reach 0 lives, you're eliminated</li>
            <li>The last player remaining wins the game!</li>
            <li>Games get progressively harder as the number of cards increases, then decreases</li>
          </ul>
          
          <h3>💡 Strategy Tips</h3>
          <ul>
            <li><strong>Count the Manilhas:</strong> There are 4 manilhas (one per suit) - track them carefully</li>
            <li><strong>Watch the Bets:</strong> Use other players' bets to estimate the strength of their hands</li>
            <li><strong>Card Memory:</strong> Remember which high cards have been played</li>
            <li><strong>Final Player Advantage:</strong> The last player to bet has more information but also restrictions</li>
          </ul>
          
          <h3>👑 Special Rules</h3>
          <ul>
            <li><strong>Manilha Suits:</strong> In ties, manilha suits are ranked: ♣ (lowest) → ♥ → ♠ → ♦ (highest)</li>
            <li><strong>Card Cancellation:</strong> Cards of the same strength cancel in pairs as they're played</li>
            <li><strong>Crown Highlight:</strong> The current winning card in each trick is highlighted with a crown 👑</li>
          </ul>
          
          <div className={styles.importantNote}>
            <strong>💡 Pro Tip:</strong> Take your time in the betting phase! Your success depends on accurately predicting your performance.
          </div>
          
        </div>
      </div>
    </div>
  );
} 