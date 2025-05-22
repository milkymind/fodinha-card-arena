import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.css';
import Game from '../components/Game';

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
    </div>
  );
} 