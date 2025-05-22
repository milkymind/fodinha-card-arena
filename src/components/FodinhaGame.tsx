
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

type Suit = "♣" | "♥" | "♠" | "♦";
type Value = "4" | "5" | "6" | "7" | "Q" | "J" | "K" | "A" | "2" | "3";
interface Card {
  suit: Suit;
  value: Value;
  id: string;
}
interface Player {
  id: string;
  name: string;
  lives: number;
  bet?: number;
  tricksWon: number;
  hand: Card[];
  isEliminated?: boolean;
}
type Phase = "lobby" | "betting" | "playing" | "roundEnd" | "gameEnd";

const VALUES: Value[] = ["4", "5", "6", "7", "Q", "J", "K", "A", "2", "3"];
const SUITS: Suit[] = ["♣", "♥", "♠", "♦"];

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const value of VALUES)
    deck.push({ suit, value, id: suit + value + Math.random() });
  return deck;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function nextManilha(lastCard?: Card) {
  if (!lastCard) return "4";
  const idx = VALUES.indexOf(lastCard.value);
  return VALUES[(idx + 1) % VALUES.length];
}
function cardPoints(card: Card, manilha: Value): number {
  if (card.value === manilha) return 100 + SUITS.indexOf(card.suit);
  return VALUES.indexOf(card.value);
}
function getWinningCard(trick: Card[], manilha: Value): Card {
  return trick.reduce((a, b) =>
    cardPoints(a, manilha) > cardPoints(b, manilha) ? a : b
  );
}
function getCardColor(suit: Suit) {
  return suit === "♥" || suit === "♦" ? "text-red-500" : "text-gray-800";
}

// --- UI Components ---
function PlayingCard({ card, selected, onClick }: { card: Card; selected?: boolean; onClick?: () => void }) {
  return (
    <div
      className={`border rounded-lg flex flex-col shadow w-12 h-16 p-1 m-1 bg-white cursor-pointer items-center justify-between
        ${selected ? "border-blue-500 ring-2 ring-blue-200 scale-110" : "border-gray-400"} ${getCardColor(card.suit)}`}
      onClick={onClick}
      role="button"
    >
      <span className="font-bold">{card.value}</span>
      <span className="text-lg">{card.suit}</span>
      <span className="font-bold rotate-180">{card.value}</span>
    </div>
  );
}

function PlayerHand({ hand, onPlay, canPlay }: { hand: Card[]; onPlay: (card: Card) => void; canPlay: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-center mt-2">
      {hand.map((card) => (
        <PlayingCard key={card.id} card={card} onClick={() => canPlay && onPlay(card)} />
      ))}
    </div>
  );
}

function GameBoard({
  players,
  trick,
  manilha,
  trumpCard,
  phase,
  currentPlayerIdx,
}: {
  players: Player[];
  trick: { card: Card; player: Player }[];
  manilha?: Value;
  trumpCard?: Card;
  phase: Phase;
  currentPlayerIdx: number;
}) {
  return (
    <div className="flex flex-col items-center p-4 bg-green-50 rounded-xl shadow-lg min-w-[350px]">
      <h2 className="mb-2 font-semibold text-xl">Table</h2>
      {trumpCard && (
        <div className="mb-4">
          <span className="text-gray-800">Manilha is <b>{manilha}</b>, revealed:
          </span>
          <PlayingCard card={trumpCard} />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center min-h-[60px]">
        {trick.length === 0
          ? <span className="text-gray-500 italic">No cards played yet</span>
          : trick.map(({ card, player }) => (
            <div key={card.id + player.id} className={`flex flex-col items-center mx-2`}>
              <PlayingCard card={card} />
              <span className="text-xs">{player.name}</span>
            </div>
          ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {players.map((player, i) => (
          <div
            key={player.id}
            className={
              `p-2 rounded border w-36 bg-white ${i === currentPlayerIdx ? "border-blue-400" : "border-gray-300"}`
              + (player.isEliminated ? " opacity-50 grayscale" : "")
            }
          >
            <div className={`font-bold ${i === currentPlayerIdx ? "text-blue-600" : ""}`}>{player.name}</div>
            <div className="text-xs text-gray-700">
              Lives:{" "}
              {Array.from({ length: player.lives }).map((_, i) => (
                <span key={i} className="inline-block w-2 h-2 bg-red-400 rounded-full mx-0.5" />
              ))}
            </div>
            <div className="text-xs">Bet: {player.bet ?? "-"}</div>
            <div className="text-xs">Tricks: {player.tricksWon}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BettingPhase({
  players,
  cardsPerPlayer,
  currIdx,
  phase,
  onBet,
}: {
  players: Player[];
  cardsPerPlayer: number;
  currIdx: number;
  phase: Phase;
  onBet: (bet: number) => void;
}) {
  const [bet, setBet] = useState("");
  const totalPlaced = players.reduce((a, p) => a + (typeof p.bet === "number" ? p.bet : 0), 0);
  const nextIdx = players.findIndex((p) => p.bet === undefined);
  const forbiddenBet = (nextIdx === players.length - 1) ? cardsPerPlayer - totalPlaced : undefined;

  function handle() {
    const b = Number(bet);
    if (isNaN(b) || b < 0 || b > cardsPerPlayer) return;
    if (forbiddenBet === b) return;
    onBet(b);
    setBet("");
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl shadow max-w-xs mx-auto">
      <div className="mb-2 font-bold">Betting Phase</div>
      <div className="mb-4">Cards in hand: <b>{cardsPerPlayer}</b></div>
      <div className="mb-4 grid gap-1">
        {players.map((p, idx) => (
          <div key={p.id} className={`flex justify-between p-1 rounded ${idx === currIdx ? "bg-blue-50" : ""}`}>
            <span>{p.name}</span> <span>{p.bet === undefined ? <i>waiting</i> : p.bet}</span>
          </div>
        ))}
      </div>
      {phase === "betting" && players[currIdx]?.bet === undefined && (
        <>
          <input
            type="number"
            min={0}
            max={cardsPerPlayer}
            value={bet}
            onChange={e => setBet(e.target.value)}
            className="border rounded p-1 w-full mb-2"
          />
          <Button
            disabled={bet === "" || Number(bet) < 0 || Number(bet) > cardsPerPlayer || Number(bet) === forbiddenBet}
            onClick={handle}
            className="w-full"
          >
            Place Bet
          </Button>
          {forbiddenBet !== undefined && (
            <div className="mt-2 text-xs text-red-500">
              Last better cannot bet: <b>{forbiddenBet}</b>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GameLobby({
  players,
  onStart,
  onAddPlayer,
}: {
  players: Player[];
  onStart: () => void;
  onAddPlayer: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <div className="bg-white border shadow rounded-xl p-8 max-w-md mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-2 text-center">Fodinha Game Lobby</h2>
      <div className="mb-4">
        {players.map((p, i) => (
          <div className="flex items-center mb-2" key={p.id}>
            <span className="mr-2 font-semibold">{p.name}</span>
            <span className="text-xs bg-blue-50 px-1 rounded">{i === 0 ? "Host" : "Player"}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="New player"
          className="p-2 border rounded flex-1"
        />
        <Button onClick={() => { if (name.trim()) { onAddPlayer(name.trim()); setName(""); } }}>Add</Button>
      </div>
      <Button disabled={players.length < 2} className="w-full" onClick={onStart}>Start Game</Button>
      {players.length < 2 && <div className="mt-2 text-xs text-gray-500 text-center">Need at least 2 players to start.</div>}
    </div>
  );
}

// --- Main Fodinha Game Logic & UI ---
export function FodinhaGame() {
  // Core game state
  const [players, setPlayers] = useState<Player[]>([
    { id: "p1", name: "Alice", lives: 3, tricksWon: 0, hand: [] },
    { id: "p2", name: "Bob", lives: 3, tricksWon: 0, hand: [] },
  ]);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [dealerIdx, setDealerIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [cardsPerPlayer, setCardsPerPlayer] = useState(1);
  const [deck, setDeck] = useState<Card[]>([]);
  const [trumpCard, setTrumpCard] = useState<Card | null>(null);
  const [manilha, setManilha] = useState<Value>("5");
  const [trick, setTrick] = useState<{ card: Card; player: Player }[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);

  // Helper to find non-eliminated players
  const activePlayers = players.filter(p => !p.isEliminated);

  // --- Lobby Phase ---
  function handleStartGame() {
    setPhase("betting");
    dealNewRound();
  }
  function handleAddPlayer(name: string) {
    setPlayers(ps => [...ps, { id: `p${ps.length + 1}`, name, lives: 3, tricksWon: 0, hand: [] }]);
  }

  // --- Dealing Phase ---
  function dealNewRound() {
    // prepare deck and hands
    const initial = shuffle(createDeck());
    const hands: Card[][] = [];
    let position = 0;
    for (let i = 0; i < activePlayers.length; i++) {
      hands[i] = initial.slice(position, position + cardsPerPlayer);
      position += cardsPerPlayer;
    }
    // Set hands, trump determination, etc.
    setDeck(initial);
    setPlayers(ps =>
      ps.map((p, i) =>
        !p.isEliminated
          ? { ...p, bet: undefined, tricksWon: 0, hand: hands.shift()! }
          : { ...p }
      )
    );
    setTrick([]);
    // The next card after dealing is the trump
    const trumpIdx = position;
    const tCard = initial[trumpIdx];
    setTrumpCard(tCard);
    setManilha(nextManilha(tCard));
    setCurrentPlayerIdx((dealerIdx + 1) % activePlayers.length);
  }

  // --- Betting Phase ---
  function handleBet(bet: number) {
    const idx = activePlayers.findIndex((p, i) => activePlayers[i].bet === undefined);
    setPlayers(ps => ps.map((p, i) =>
      !p.isEliminated && activePlayers.indexOf(p) === idx
        ? { ...p, bet }
        : { ...p }
    ));
    const nextIdx = idx + 1;
    if (nextIdx === activePlayers.length) {
      setPhase("playing");
      setCurrentPlayerIdx((dealerIdx + 1) % activePlayers.length);
    }
  }

  // --- Playing Phase ---
  function handlePlayCard(card: Card) {
    const currPlayer = activePlayers[currentPlayerIdx];
    setPlayers(ps => ps.map(p => p.id === currPlayer.id
      ? { ...p, hand: p.hand.filter(c => c.id !== card.id) }
      : p
    ));
    setTrick(t => [...t, { card, player: currPlayer }]);
    // Next player or trick winner
    if (trick.length + 1 === activePlayers.length) {
      // Trick complete, find winner
      const cardsPlayed = [...trick.map(t => t.card), card];
      const winnerCard = getWinningCard(cardsPlayed, manilha);
      const winnerIdx = cardsPlayed.findIndex(c => c.id === winnerCard.id);
      const winner = activePlayers[winnerIdx];
      setTimeout(() => {
        setTrick([]);
        setPlayers(ps => ps.map(p =>
          p.id === winner.id ? { ...p, tricksWon: (p.tricksWon || 0) + 1 } : p
        ));
        setCurrentPlayerIdx(winnerIdx);
        // Check end of round
        if ((activePlayers[0]?.hand.length ?? 0) === 1) {
          setPhase("roundEnd");
        }
      }, 900);
    } else {
      setCurrentPlayerIdx((currentPlayerIdx + 1) % activePlayers.length);
    }
  }

  // --- Round End Phase ---
  function handleNextRound() {
    // Penalize |bet-tricksWon|, eliminate zero-lives
    setPlayers(ps =>
      ps.map(p => {
        if (!p.isEliminated) {
          const penalty = Math.abs((p.bet ?? 0) - p.tricksWon);
          const newLives = p.lives - penalty;
          return {
            ...p,
            lives: newLives,
            isEliminated: newLives <= 0,
          };
        }
        return { ...p };
      })
    );
    const newActive = players.filter(p => !p.isEliminated && (p.lives > 0));
    if (newActive.length === 1) {
      setPhase("gameEnd");
      return;
    }
    setDealerIdx((dealerIdx + 1) % newActive.length);
    setRound(r => r + 1);
    setCardsPerPlayer(c => Math.min(c + 1, Math.floor(40 / Math.max(2, newActive.length))));
    setPhase("betting");
    dealNewRound();
  }

  if (phase === "lobby") {
    return (
      <GameLobby players={players} onStart={handleStartGame} onAddPlayer={handleAddPlayer} />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 items-center">
      <header className="text-center mb-4">
        <h1 className="text-3xl font-bold mb-2">Fodinha</h1>
        <div className="text-gray-500">Round {round} | {phase.charAt(0).toUpperCase() + phase.slice(1)}</div>
      </header>
      <GameBoard
        players={activePlayers}
        trick={trick}
        manilha={manilha}
        trumpCard={trumpCard || undefined}
        phase={phase}
        currentPlayerIdx={currentPlayerIdx}
      />

      {phase === "betting" &&
        <BettingPhase
          players={activePlayers}
          cardsPerPlayer={cardsPerPlayer}
          currIdx={activePlayers.findIndex(p => p.bet === undefined)}
          phase={phase}
          onBet={handleBet}
        />}
      {phase === "playing" &&
        <div className="mt-6">
          <div className="font-semibold text-center mb-2">Your Hand</div>
          <PlayerHand
            hand={activePlayers[currentPlayerIdx]?.hand ?? []}
            canPlay={true}
            onPlay={handlePlayCard}
          />
        </div>
      }
      {phase === "roundEnd" && (
        <div className="p-6 mt-6 bg-white rounded-xl shadow-lg">
          <h2 className="font-bold text-xl mb-2">Round Results</h2>
          <div className="mb-4">
            {activePlayers.map((p) => (
              <div key={p.id}>
                {p.name} | Bet: {p.bet ?? "-"} &ndash; Tricks: {p.tricksWon} | Lives: {p.lives}
              </div>
            ))}
          </div>
          <Button className="w-full" onClick={handleNextRound}>Next Round</Button>
        </div>
      )}
      {phase === "gameEnd" && (
        <div className="p-6 mt-8 bg-white rounded-xl shadow-lg text-center">
          <h2 className="font-bold text-2xl mb-4">Game Over!</h2>
          <div>
            Winner: {players.find(p => !p.isEliminated)?.name}
          </div>
        </div>
      )}
    </div>
  );
}
