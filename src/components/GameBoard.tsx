import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { PlayingCard } from "./PlayingCard";

type Card = {
  rank: string;
  suit: string;
  faceUp: boolean;
};

type Player = {
  name: string;
  cards: Card[];
  ready?: boolean;
};

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JOKER"];
const SUITS = ["♠", "♣", "♥", "♦"];

const createDeck = () => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (rank === "JOKER" && (suit === "♥" || suit === "♦")) {
        deck.push({ rank, suit, faceUp: false });
      } else if (rank !== "JOKER") {
        deck.push({ rank, suit, faceUp: false });
      }
    }
  }
  return deck;
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

interface GameBoardProps {
  gameId?: string;
}

const GameBoard = ({ gameId }: GameBoardProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [initialFlipsRemaining, setInitialFlipsRemaining] = useState([2, 2]);
  const [canFlipCard, setCanFlipCard] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [finalTurnPlayer, setFinalTurnPlayer] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (gameId) {
      console.log('Setting up game subscription');
      const channel = supabase
        .channel('game_state')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_rooms',
            filter: `id=eq.${gameId}`
          },
          async (payload) => {
            console.log('Game state updated:', payload);
            const gameState = payload.new.game_state;
            if (gameState) {
              setPlayers(gameState.players || []);
              setDeck(gameState.deck || []);
              setDiscardPile(gameState.discardPile || []);
              setGameStarted(gameState.gameStarted || false);
              setCurrentPlayer(gameState.currentPlayer || 0);
              setDrawnCard(gameState.drawnCard || null);
              setInitialFlipsRemaining(gameState.initialFlipsRemaining || [2, 2]);
              setCanFlipCard(gameState.canFlipCard || false);
              setSelectedCard(gameState.selectedCard || null);
              setFinalTurnPlayer(gameState.finalTurnPlayer || null);
              setIsLoading(false);
            }
          }
        )
        .subscribe();

      // Initial game state fetch
      const fetchGameState = async () => {
        const { data, error } = await supabase
          .from('game_rooms')
          .select('game_state')
          .eq('id', gameId)
          .single();

        if (error) {
          console.error('Error fetching game state:', error);
          toast.error('Failed to fetch game state');
          return;
        }

        if (data?.game_state) {
          setPlayers(data.game_state.players || []);
          setDeck(data.game_state.deck || []);
          setDiscardPile(data.game_state.discardPile || []);
          setGameStarted(data.game_state.gameStarted || false);
          setCurrentPlayer(data.game_state.currentPlayer || 0);
          setDrawnCard(data.game_state.drawnCard || null);
          setInitialFlipsRemaining(data.game_state.initialFlipsRemaining || [2, 2]);
          setCanFlipCard(data.game_state.canFlipCard || false);
          setSelectedCard(data.game_state.selectedCard || null);
          setFinalTurnPlayer(data.game_state.finalTurnPlayer || null);
        }
        setIsLoading(false);
      };

      fetchGameState();

      return () => {
        console.log('Cleaning up game subscription');
        supabase.removeChannel(channel);
      };
    }
  }, [gameId]);

  useEffect(() => {
    const updateGameState = async () => {
      if (!gameId) return;

      try {
        const { error } = await supabase
          .from('game_rooms')
          .update({
            game_state: {
              players,
              deck,
              discardPile,
              gameStarted,
              currentPlayer,
              drawnCard,
              initialFlipsRemaining,
              canFlipCard,
              selectedCard,
              finalTurnPlayer,
            },
          })
          .eq('id', gameId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating game state:', error);
        toast.error('Failed to update game state');
      }
    };

    updateGameState();
  }, [
    gameId,
    players,
    deck,
    discardPile,
    gameStarted,
    currentPlayer,
    drawnCard,
    initialFlipsRemaining,
    canFlipCard,
    selectedCard,
    finalTurnPlayer,
  ]);

  const startGame = async () => {
    const shuffledDeck = shuffleArray(createDeck());
    const player1Cards = shuffledDeck.slice(0, 4);
    const player2Cards = shuffledDeck.slice(4, 8);
    const remainingDeck = shuffledDeck.slice(8);
    const firstDiscardCard = remainingDeck.pop();
    if (!firstDiscardCard) return;
    firstDiscardCard.faceUp = true;

    const updatedPlayers = players.map((player, index) => ({
      ...player,
      cards: index === 0 ? player1Cards : player2Cards,
    }));

    setPlayers(updatedPlayers);
    setDeck(remainingDeck);
    setDiscardPile([firstDiscardCard]);
    setGameStarted(true);
    setCurrentPlayer(0);
    setCanFlipCard(true);
  };

  const drawCard = () => {
    if (deck.length === 0) {
      const newDeck = shuffleArray(discardPile.slice(0, -1));
      setDeck(newDeck);
      setDiscardPile([discardPile[discardPile.length - 1]]);
      return;
    }

    const newDeck = [...deck];
    const drawnCard = newDeck.pop();
    if (!drawnCard) return;

    drawnCard.faceUp = true;
    setDeck(newDeck);
    setDrawnCard(drawnCard);
    setCanFlipCard(false);
  };

  const discardDrawnCard = () => {
    if (!drawnCard) return;

    setDiscardPile([...discardPile, drawnCard]);
    setDrawnCard(null);
    setCurrentPlayer((currentPlayer + 1) % 2);
    setCanFlipCard(true);
  };

  const keepDrawnCard = (index: number) => {
    if (!drawnCard) return;

    const currentPlayerCards = [...players[currentPlayer].cards];
    const discardedCard = currentPlayerCards[index];
    currentPlayerCards[index] = drawnCard;

    const updatedPlayers = players.map((player, idx) =>
      idx === currentPlayer ? { ...player, cards: currentPlayerCards } : player
    );

    setPlayers(updatedPlayers);
    setDiscardPile([...discardPile, discardedCard]);
    setDrawnCard(null);
    setCurrentPlayer((currentPlayer + 1) % 2);
    setCanFlipCard(true);
  };

  const flipCard = (index: number) => {
    if (!canFlipCard || initialFlipsRemaining[currentPlayer] <= 0) return;

    const currentPlayerCards = [...players[currentPlayer].cards];
    currentPlayerCards[index] = {
      ...currentPlayerCards[index],
      faceUp: true,
    };

    const updatedPlayers = players.map((player, idx) =>
      idx === currentPlayer ? { ...player, cards: currentPlayerCards } : player
    );

    const newFlipsRemaining = [...initialFlipsRemaining];
    newFlipsRemaining[currentPlayer]--;

    setPlayers(updatedPlayers);
    setInitialFlipsRemaining(newFlipsRemaining);

    if (newFlipsRemaining[currentPlayer] === 0) {
      setCurrentPlayer((currentPlayer + 1) % 2);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-table flex items-center justify-center">
        <div className="text-cream text-2xl">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-table p-8">
      <div className="max-w-4xl mx-auto">
        {!gameStarted ? (
          <div className="flex flex-col items-center justify-center space-y-8">
            <h1 className="text-4xl font-bold text-cream">
              {players.length < 2 
                ? "Waiting for players to join..."
                : !players.every(p => p.ready)
                  ? "Waiting for players to be ready..."
                  : "Ready to Start!"}
            </h1>
            {players.length === 2 && players.every(p => p.ready) && (
              <Button
                onClick={startGame}
                className="bg-gold hover:bg-gold/90 text-black text-xl px-8 py-6"
              >
                Start Game
              </Button>
            )}
            <div className="text-cream text-xl">
              Players:
              {players.map((player, index) => (
                <div key={index} className="flex items-center gap-2">
                  {player.name} {player.ready ? '✅' : '⏳'}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-cream">
                Current Player: {players[currentPlayer]?.name}
              </h2>
              {initialFlipsRemaining[currentPlayer] > 0 && (
                <div className="text-cream">
                  Flips remaining: {initialFlipsRemaining[currentPlayer]}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8">
              {players.map((player, playerIndex) => (
                <div
                  key={playerIndex}
                  className={`p-4 rounded-lg ${
                    currentPlayer === playerIndex
                      ? "bg-green-800/50"
                      : "bg-green-900/30"
                  }`}
                >
                  <h3 className="text-xl font-bold text-cream mb-4">
                    {player.name}
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {player.cards.map((card, cardIndex) => (
                      <div
                        key={cardIndex}
                        onClick={() => {
                          if (
                            currentPlayer === playerIndex &&
                            !card.faceUp &&
                            canFlipCard
                          ) {
                            flipCard(cardIndex);
                          } else if (
                            currentPlayer === playerIndex &&
                            drawnCard &&
                            card.faceUp
                          ) {
                            keepDrawnCard(cardIndex);
                          }
                        }}
                        className={`cursor-pointer ${
                          currentPlayer === playerIndex &&
                          ((canFlipCard && !card.faceUp) ||
                            (drawnCard && card.faceUp))
                            ? "ring-2 ring-gold"
                            : ""
                        }`}
                      >
                        <PlayingCard
                          rank={card.rank}
                          suit={card.suit}
                          faceUp={card.faceUp}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-8 items-start">
              <div className="text-center">
                <div className="mb-2">
                  <Button
                    onClick={drawCard}
                    disabled={Boolean(drawnCard)}
                    className="bg-gold hover:bg-gold/90 text-black"
                  >
                    Draw Card
                  </Button>
                </div>
                <div className="w-24">
                  {deck.length > 0 && (
                    <PlayingCard rank="?" suit="?" faceUp={false} />
                  )}
                </div>
                <div className="text-cream mt-2">
                  Deck: {deck.length} cards
                </div>
              </div>

              <div className="text-center">
                <div className="mb-2">
                  {drawnCard && (
                    <Button
                      onClick={discardDrawnCard}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Discard
                    </Button>
                  )}
                </div>
                <div className="w-24">
                  {drawnCard ? (
                    <PlayingCard
                      rank={drawnCard.rank}
                      suit={drawnCard.suit}
                      faceUp={true}
                    />
                  ) : discardPile.length > 0 ? (
                    <PlayingCard
                      rank={discardPile[discardPile.length - 1].rank}
                      suit={discardPile[discardPile.length - 1].suit}
                      faceUp={true}
                    />
                  ) : null}
                </div>
                <div className="text-cream mt-2">
                  Discard: {discardPile.length} cards
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;