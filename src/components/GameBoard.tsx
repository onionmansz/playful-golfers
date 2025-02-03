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
    
    toast("Game started! Player 1's turn");
  };

  const drawCard = (fromDiscard: boolean = false) => {
    if (fromDiscard && discardPile.length === 0) return;
    if (!fromDiscard && deck.length === 0) {
      // Reshuffle discard pile into deck
      const newDeck = shuffle(discardPile.slice(0, -1));
      setDeck(newDeck);
      setDiscardPile([discardPile[discardPile.length - 1]]);
      return;
    }

    const drawnCard = fromDiscard 
      ? discardPile[discardPile.length - 1]
      : deck[deck.length - 1];

    if (fromDiscard) {
      setDiscardPile(prev => prev.slice(0, -1));
    } else {
      setDeck(prev => prev.slice(0, -1));
    }

    toast(`${players[currentPlayer].name} drew a card`);
    return drawnCard;
  };

  const nextTurn = () => {
    setCurrentPlayer((prev) => (prev + 1) % players.length);
    toast(`${players[(currentPlayer + 1) % players.length].name}'s turn`);
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
          <div className="space-y-8">
            {/* Player 2's hand */}
            <div className="flex justify-center gap-4">
              {players[1]?.cards.map((card, index) => (
                <PlayingCard
                  key={`p2-${index}`}
                  rank={card.rank}
                  suit={card.suit}
                  faceUp={card.faceUp}
                  className="animate-card-deal"
                />
              ))}
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
            </div>

            {/* Player 1's hand */}
            <div className="flex justify-center gap-4">
              {players[0]?.cards.map((card, index) => (
                <PlayingCard
                  key={`p1-${index}`}
                  rank={card.rank}
                  suit={card.suit}
                  faceUp={card.faceUp}
                  className="animate-card-deal"
                />
              ))}
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