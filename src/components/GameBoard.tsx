import React, { useState, useEffect } from "react";
import PlayingCard from "./PlayingCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Card = {
  rank: string;
  suit: string;
  faceUp: boolean;
};

type Player = {
  name: string;
  cards: Card[];
};

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["♣", "♦", "♥", "♠"];

const createDeck = () => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
  return shuffle(deck);
};

const shuffle = (array: Card[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const GameBoard = () => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);

  const startGame = () => {
    const newDeck = createDeck();
    const player1Cards = newDeck.slice(0, 6);
    const player2Cards = newDeck.slice(6, 12);
    const remainingDeck = newDeck.slice(12);
    
    setPlayers([
      { name: "Player 1", cards: player1Cards },
      { name: "Player 2", cards: player2Cards },
    ]);
    
    setDeck(remainingDeck);
    setDiscardPile([{ ...remainingDeck[0], faceUp: true }]);
    setDeck(remainingDeck.slice(1));
    setGameStarted(true);
    setCurrentPlayer(0);
    setDrawnCard(null);
    
    toast("Game started! Player 1's turn");
  };

  const restartGame = () => {
    setGameStarted(false);
    setDeck([]);
    setDiscardPile([]);
    setPlayers([]);
    setCurrentPlayer(0);
    setDrawnCard(null);
    toast("Game reset! Click Start Game to begin a new game");
  };

  const drawCard = (fromDiscard: boolean = false) => {
    if (drawnCard) {
      toast("You already have a drawn card!");
      return;
    }

    if (fromDiscard && discardPile.length === 0) {
      toast("No cards in discard pile!");
      return;
    }

    if (!fromDiscard && deck.length === 0) {
      if (discardPile.length <= 1) {
        toast("No cards left to draw!");
        return;
      }
      const newDeck = shuffle(discardPile.slice(0, -1));
      setDeck(newDeck);
      setDiscardPile([discardPile[discardPile.length - 1]]);
      return;
    }

    let drawn: Card;
    if (fromDiscard) {
      drawn = { ...discardPile[discardPile.length - 1], faceUp: true };
      setDiscardPile(prev => prev.slice(0, -1));
    } else {
      drawn = { ...deck[deck.length - 1], faceUp: true };
      setDeck(prev => prev.slice(0, -1));
    }

    setDrawnCard(drawn);
    toast(`${players[currentPlayer].name} drew a card`);
  };

  const handleCardClick = (index: number) => {
    if (!drawnCard) return;

    const currentPlayerCards = [...players[currentPlayer].cards];
    const oldCard = currentPlayerCards[index];
    currentPlayerCards[index] = drawnCard; // The drawn card stays face up when placed
    
    setPlayers(prevPlayers => {
      const newPlayers = [...prevPlayers];
      newPlayers[currentPlayer] = {
        ...newPlayers[currentPlayer],
        cards: currentPlayerCards,
      };
      return newPlayers;
    });

    setDiscardPile(prev => [...prev, { ...oldCard, faceUp: true }]);
    setDrawnCard(null);
    nextTurn();
  };

  const discardDrawnCard = () => {
    if (!drawnCard) return;
    setDiscardPile(prev => [...prev, drawnCard]);
    setDrawnCard(null);
    nextTurn();
  };

  const nextTurn = () => {
    setCurrentPlayer((prev) => (prev + 1) % players.length);
    toast(`${players[(currentPlayer + 1) % players.length].name}'s turn`);
  };

  const renderPlayerCards = (playerIndex: number) => {
    const playerCards = players[playerIndex]?.cards || [];
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3 grid grid-cols-3 gap-4">
          {playerCards.slice(0, 3).map((card, index) => (
            <PlayingCard
              key={`p${playerIndex}-row1-${index}`}
              rank={card.rank}
              suit={card.suit}
              faceUp={card.faceUp}
              onClick={() => handleCardClick(index)}
              className="animate-card-deal"
            />
          ))}
        </div>
        <div className="col-span-3 grid grid-cols-3 gap-4">
          {playerCards.slice(3, 6).map((card, index) => (
            <PlayingCard
              key={`p${playerIndex}-row2-${index}`}
              rank={card.rank}
              suit={card.suit}
              faceUp={card.faceUp}
              onClick={() => handleCardClick(index + 3)}
              className="animate-card-deal"
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-table p-8">
      <div className="max-w-4xl mx-auto">
        {!gameStarted ? (
          <div className="flex flex-col items-center justify-center h-[80vh] gap-8">
            <h1 className="text-4xl font-bold text-cream">6-Card Golf</h1>
            <Button 
              onClick={startGame}
              className="bg-gold hover:bg-gold/90 text-black text-xl px-8 py-6"
            >
              Start Game
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Restart button */}
            <div className="flex justify-end">
              <Button 
                onClick={restartGame}
                variant="destructive"
                className="mb-4"
              >
                Restart Game
              </Button>
            </div>

            {/* Player 2's hand */}
            <div className="mb-12">
              {renderPlayerCards(1)}
            </div>

            {/* Middle section with deck and discard pile */}
            <div className="flex justify-center gap-16 my-12">
              <div 
                onClick={() => drawCard(false)}
                className="cursor-pointer"
              >
                <PlayingCard
                  rank=""
                  suit=""
                  faceUp={false}
                />
              </div>
              {discardPile.length > 0 && (
                <div 
                  onClick={() => drawCard(true)}
                  className="cursor-pointer"
                >
                  <PlayingCard
                    rank={discardPile[discardPile.length - 1].rank}
                    suit={discardPile[discardPile.length - 1].suit}
                    faceUp={true}
                  />
                </div>
              )}
              {drawnCard && (
                <div className="flex flex-col gap-4 items-center">
                  <PlayingCard
                    rank={drawnCard.rank}
                    suit={drawnCard.suit}
                    faceUp={true}
                  />
                  <Button 
                    onClick={discardDrawnCard}
                    variant="destructive"
                  >
                    Discard
                  </Button>
                </div>
              )}
            </div>

            {/* Player 1's hand */}
            <div className="mt-12">
              {renderPlayerCards(0)}
            </div>

            {/* Current player indicator */}
            <div className="text-center text-cream text-2xl mt-8">
              {players[currentPlayer]?.name}'s Turn
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
