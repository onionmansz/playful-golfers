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

const getCardValue = (rank: string): number => {
  if (rank === "K") return 0;
  if (rank === "5") return -5;
  if (["J", "Q"].includes(rank)) return 10;
  if (rank === "A") return 1;
  return parseInt(rank) || 0;
};

const calculatePlayerScore = (cards: Card[]): number => {
  let score = 0;
  
  // First, calculate basic card values
  const values = cards.map(card => card.faceUp ? getCardValue(card.rank) : 10);
  
  // Check for matching columns
  for (let col = 0; col < 3; col++) {
    if (cards[col].faceUp && cards[col + 3].faceUp) {
      if (cards[col].rank === cards[col + 3].rank) {
        values[col] = 0;
        values[col + 3] = 0;
      }
    }
  }
  
  // Check for 2x2 squares
  for (let col = 0; col < 2; col++) {
    if (cards[col].faceUp && cards[col + 1].faceUp && 
        cards[col + 3].faceUp && cards[col + 4].faceUp) {
      const square = [
        cards[col].rank,
        cards[col + 1].rank,
        cards[col + 3].rank,
        cards[col + 4].rank
      ];
      if (new Set(square).size === 1) {
        score -= 10;
      }
    }
  }
  
  // Sum up all values
  score += values.reduce((sum, value) => sum + value, 0);
  
  return score;
};

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
  const [initialFlipsRemaining, setInitialFlipsRemaining] = useState<number[]>([2, 2]);
  const [canFlipCard, setCanFlipCard] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

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
    setInitialFlipsRemaining([2, 2]);
    
    toast("Game started! Each player must flip two cards");
  };

  const restartGame = () => {
    setGameEnded(false);
    setGameStarted(false);
    setDeck([]);
    setDiscardPile([]);
    setPlayers([]);
    setCurrentPlayer(0);
    setDrawnCard(null);
    setInitialFlipsRemaining([2, 2]);
    toast("Game reset! Click Start Game to begin a new game");
  };

  const checkGameEnd = () => {
    const allCardsVisible = players.every(player => 
      player.cards.every(card => card.faceUp)
    );
    
    if (allCardsVisible) {
      setGameEnded(true);
      const scores = players.map(player => calculatePlayerScore(player.cards));
      const winningPlayer = scores[0] <= scores[1] ? players[0].name : players[1].name;
      toast(`Game Over! ${winningPlayer} wins with scores: ${players[0].name}: ${scores[0]}, ${players[1].name}: ${scores[1]}`);
    }
  };

  useEffect(() => {
    if (gameStarted && !gameEnded) {
      checkGameEnd();
    }
  }, [players, gameStarted]);

  const drawCard = (fromDiscard: boolean = false) => {
    if (initialFlipsRemaining.some(flips => flips > 0)) {
      toast("Both players must flip two cards before drawing!");
      return;
    }

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
      setCanFlipCard(false);
    } else {
      drawn = { ...deck[deck.length - 1], faceUp: true };
      setDeck(prev => prev.slice(0, -1));
      setCanFlipCard(true);
    }

    setDrawnCard(drawn);
    toast(`${players[currentPlayer].name} drew a card`);
  };

  const handleCardClick = (index: number) => {
    // Handle initial card flips
    if (initialFlipsRemaining[currentPlayer] > 0) {
      const currentPlayerCards = [...players[currentPlayer].cards];
      currentPlayerCards[index] = { ...currentPlayerCards[index], faceUp: true };
      
      setPlayers(prevPlayers => {
        const newPlayers = [...prevPlayers];
        newPlayers[currentPlayer] = {
          ...newPlayers[currentPlayer],
          cards: currentPlayerCards,
        };
        return newPlayers;
      });

      setInitialFlipsRemaining(prev => {
        const newFlips = [...prev];
        newFlips[currentPlayer]--;
        return newFlips;
      });

      if (initialFlipsRemaining[currentPlayer] === 1) {
        setCurrentPlayer((prev) => (prev + 1) % players.length);
        toast(`${players[(currentPlayer + 1) % players.length].name} must flip two cards`);
      } else if (initialFlipsRemaining[currentPlayer] === 0 && initialFlipsRemaining[(currentPlayer + 1) % 2] === 0) {
        toast("Initial flips complete! Game can now begin - Player 1's turn");
        setCurrentPlayer(0);
      }
      return;
    }

    // Handle regular gameplay
    if (!drawnCard && !canFlipCard) return;

    const currentPlayerCards = [...players[currentPlayer].cards];
    const faceDownCards = currentPlayerCards.filter(card => !card.faceUp).length;
    
    if (drawnCard) {
      // Replace card with drawn card
      const oldCard = currentPlayerCards[index];
      currentPlayerCards[index] = drawnCard;
      
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
      setCanFlipCard(false);
      nextTurn();
    } else if (canFlipCard && !currentPlayerCards[index].faceUp) {
      // Allow flipping if there's more than one face-down card OR if this is the last card
      if (faceDownCards > 1 || faceDownCards === 1) {
        currentPlayerCards[index] = { ...currentPlayerCards[index], faceUp: true };
        
        setPlayers(prevPlayers => {
          const newPlayers = [...prevPlayers];
          newPlayers[currentPlayer] = {
            ...newPlayers[currentPlayer],
            cards: currentPlayerCards,
          };
          return newPlayers;
        });
        
        setCanFlipCard(false);
        nextTurn();
      }
    }
  };

  const discardDrawnCard = () => {
    if (!drawnCard) return;
    
    const currentPlayerCards = players[currentPlayer].cards;
    const faceDownCards = currentPlayerCards.filter(card => !card.faceUp).length;
    
    setDiscardPile(prev => [...prev, drawnCard]);
    setDrawnCard(null);
    
    // If only one card is face down, discarding ends the turn
    if (faceDownCards === 1) {
      nextTurn();
    }
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
              {initialFlipsRemaining.some(flips => flips > 0) 
                ? `${players[currentPlayer]?.name} - Flip ${2 - initialFlipsRemaining[currentPlayer]} cards`
                : `${players[currentPlayer]?.name}'s Turn`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
