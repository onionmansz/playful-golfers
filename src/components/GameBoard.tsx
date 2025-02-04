import { useState, useEffect } from "react";
import PlayingCard from "./PlayingCard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Card = {
  rank: string;
  suit: string;
  faceUp: boolean;
};

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "JOKER"];
const SUITS = ["♣", "♦", "♥", "♠"];

const getCardValue = (rank: string): number => {
  if (rank === "JOKER") return -5;
  if (rank === "K") return 0;
  if (rank === "5") return -5;
  if (["J", "Q"].includes(rank)) return 10;
  if (rank === "A") return 1;
  return parseInt(rank) || 0;
};

const calculatePlayerScore = (playerIndex: number, cards: Card[]): number => {
  let score = 0;
  const playerCards = cards.slice(playerIndex * 6, (playerIndex + 1) * 6);
  
  // First, calculate basic card values
  const values = playerCards.map(card => card.faceUp ? getCardValue(card.rank) : 10);
  
  // Check for matching columns
  for (let col = 0; col < 3; col++) {
    if (playerCards[col].faceUp && playerCards[col + 3].faceUp) {
      if (playerCards[col].rank === playerCards[col + 3].rank) {
        values[col] = 0;
        values[col + 3] = 0;
      }
    }
  }
  
  // Check for 2x2 squares
  for (let col = 0; col < 2; col++) {
    if (playerCards[col].faceUp && playerCards[col + 1].faceUp && 
        playerCards[col + 3].faceUp && playerCards[col + 4].faceUp) {
      const square = [
        playerCards[col].rank,
        playerCards[col + 1].rank,
        playerCards[col + 3].rank,
        playerCards[col + 4].rank
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
  // Add regular cards
  for (const suit of SUITS) {
    for (const rank of RANKS.filter(r => r !== "JOKER")) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
  // Add 2 jokers
  deck.push({ rank: "JOKER", suit: "♦", faceUp: false });
  deck.push({ rank: "JOKER", suit: "♥", faceUp: false });
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
  const [cards, setCards] = useState<Card[]>([]); // Single array for all cards (0-11)
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [initialFlipsRemaining, setInitialFlipsRemaining] = useState<number[]>([2, 2]);
  const [canFlipCard, setCanFlipCard] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [selectedCard, setSelectedCard] = useState<'drawn' | 'discard' | null>(null);
  const [finalTurnPlayer, setFinalTurnPlayer] = useState<number | null>(null);
  const [hasDrawnAndDiscarded, setHasDrawnAndDiscarded] = useState(false);
  const [hasDrawnFromMainDeck, setHasDrawnFromMainDeck] = useState(false);

  const startGame = () => {
    const newDeck = createDeck();
    const player1Cards = newDeck.slice(0, 6);
    const player2Cards = newDeck.slice(6, 12);
    const remainingDeck = newDeck.slice(12);
    
    setCards([...player1Cards, ...player2Cards]); // Store all cards in single array
    setDeck(remainingDeck);
    setDiscardPile([{ ...remainingDeck[0], faceUp: true }]);
    setDeck(remainingDeck.slice(1));
    setGameStarted(true);
    setCurrentPlayer(0);
    setDrawnCard(null);
    setInitialFlipsRemaining([2, 2]);
    setHasDrawnAndDiscarded(false);
    setHasDrawnFromMainDeck(false);
    
    toast("Game started! Each player must flip two cards");
  };

  const drawCard = (fromDiscard: boolean = false) => {
    if (gameEnded) {
      toast("Game is over! No more moves allowed.");
      return;
    }

    if (initialFlipsRemaining.some(flips => flips > 0)) {
      toast("Both players must flip two cards before drawing!");
      return;
    }

    if (drawnCard) {
      toast("You already have a drawn card!");
      return;
    }

    // Check if player has already drawn and discarded this turn
    if (hasDrawnAndDiscarded) {
      toast("You've already drawn and discarded this turn!");
      return;
    }

    // Prevent drawing from main deck if already drawn from it this turn
    if (!fromDiscard && hasDrawnFromMainDeck) {
      toast("You can't draw from the main deck again this turn!");
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
      setSelectedCard('drawn');
    } else {
      drawn = { ...deck[deck.length - 1], faceUp: true };
      setDeck(prev => prev.slice(0, -1));
      setSelectedCard('drawn');
      setHasDrawnFromMainDeck(true); // Set this flag when drawing from main deck
    }

    setDrawnCard(drawn);
    setCanFlipCard(true);
    toast(`${currentPlayer === 0 ? "Player 1" : "Player 2"} drew a card`);
  };

  const handleCardClick = (index: number) => {
    const playerIndex = index < 6 ? 0 : 1; // Player 1: 0-5, Player 2: 6-11
    
    // During regular gameplay (after initial flips)
    if (!initialFlipsRemaining.some(flips => flips > 0)) {
      // If it's Player 1's turn and Player 2's cards were clicked, or vice versa
      if ((currentPlayer === 0 && index >= 6) || (currentPlayer === 1 && index < 6)) {
        toast.error(`Player ${currentPlayer + 1} can only interact with their own cards!`);
        return;
      }
    }

    // Handle initial card flips
    if (initialFlipsRemaining[currentPlayer] > 0) {
      // Check if this card belongs to current player
      if ((currentPlayer === 0 && index >= 6) || (currentPlayer === 1 && index < 6)) {
        toast.error(`Player ${currentPlayer + 1} must flip their own cards!`);
        return;
      }
      
      // Check if this card is already face up
      if (cards[index].faceUp) {
        toast("You must flip a different card!");
        return;
      }
      
      setCards(prevCards => {
        const newCards = [...prevCards];
        newCards[index] = { ...newCards[index], faceUp: true };
        return newCards;
      });

      setInitialFlipsRemaining(prev => {
        const newFlips = [...prev];
        newFlips[currentPlayer]--;
        return newFlips;
      });

      if (initialFlipsRemaining[currentPlayer] === 1) {
        setCurrentPlayer((prev) => (prev + 1) % 2);
        toast(`Player ${((currentPlayer + 1) % 2) + 1} must flip two cards`);
      } else if (initialFlipsRemaining[currentPlayer] === 0 && initialFlipsRemaining[(currentPlayer + 1) % 2] === 0) {
        toast("Initial flips complete! Game can now begin - Player 1's turn");
        setCurrentPlayer(0);
      }
      return;
    }

    // Regular gameplay
    if (!drawnCard && !canFlipCard) return;

    const playerStartIndex = currentPlayer * 6;
    const playerEndIndex = playerStartIndex + 6;
    const playerCards = cards.slice(playerStartIndex, playerEndIndex);
    const faceDownCards = playerCards.filter(card => !card.faceUp).length;
    
    if (drawnCard && selectedCard) {
      // Replace card with drawn card
      const oldCard = cards[index];
      
      setCards(prevCards => {
        const newCards = [...prevCards];
        newCards[index] = drawnCard;
        return newCards;
      });

      setDiscardPile(prev => [...prev, { ...oldCard, faceUp: true }]);
      setDrawnCard(null);
      setSelectedCard(null);
      setCanFlipCard(false);
      setHasDrawnAndDiscarded(true);

      // Check if all cards are face up for the current player
      const updatedPlayerCards = cards.slice(playerStartIndex, playerEndIndex).map((card, i) => 
        i === (index % 6) ? drawnCard : card
      );
      const allFaceUp = updatedPlayerCards.every(card => card.faceUp);

      if (allFaceUp && finalTurnPlayer === null) {
        // Set the other player as the final turn player
        setFinalTurnPlayer((currentPlayer + 1) % 2);
        nextTurn();
      } else if (allFaceUp || finalTurnPlayer === currentPlayer) {
        setGameEnded(true);
        setCards(prevCards => {
          const newCards = [...prevCards];
          // Reveal all remaining cards for both players
          for (let i = 0; i < newCards.length; i++) {
            newCards[i] = { ...newCards[i], faceUp: true };
          }
          return newCards;
        });
        calculateAndDisplayFinalScores();
      } else {
        nextTurn();
      }
    } else if (canFlipCard && !cards[index].faceUp) {
      // Allow flipping if there's more than one face-down card OR if this is the last card
      if (faceDownCards > 1 || faceDownCards === 1) {
        setCards(prevCards => {
          const newCards = [...prevCards];
          newCards[index] = { ...newCards[index], faceUp: true };
          
          // Check if all cards are face up for the current player after this flip
          const updatedPlayerCards = newCards.slice(playerStartIndex, playerEndIndex);
          const allFaceUp = updatedPlayerCards.every(card => card.faceUp);
          
          if (allFaceUp && finalTurnPlayer === null) {
            // Set the other player as the final turn player
            setFinalTurnPlayer((currentPlayer + 1) % 2);
          } else if (allFaceUp || finalTurnPlayer === currentPlayer) {
            // Reveal all cards and end the game
            for (let i = 0; i < newCards.length; i++) {
              newCards[i] = { ...newCards[i], faceUp: true };
            }
            setGameEnded(true);
            setTimeout(() => calculateAndDisplayFinalScores(), 100);
          }
          
          return newCards;
        });
        
        setCanFlipCard(false);

        if (!gameEnded) {
          nextTurn();
        }
      }
    }
  };

  const calculateAndDisplayFinalScores = () => {
    const detailedScores = [
      {
        name: "Player 1",
        totalScore: calculatePlayerScore(0, cards),
      },
      {
        name: "Player 2",
        totalScore: calculatePlayerScore(1, cards),
      },
    ];

    const winningPlayer = detailedScores[0].totalScore <= detailedScores[1].totalScore ? 
      detailedScores[0].name : detailedScores[1].name;
    
    toast(
      <div className="space-y-2">
        <h3 className="font-bold text-lg">Game Over! {winningPlayer} wins!</h3>
        <div className="space-y-4">
          {detailedScores.map((score, index) => (
            <div key={index} className="space-y-1">
              <p className="font-semibold">{score.name}:</p>
              <div className="pl-4 space-y-1 text-sm">
                <p>Total Score: {score.totalScore} points</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const discardDrawnCard = () => {
    if (!drawnCard) return;
    
    const currentPlayerCards = cards.slice(currentPlayer * 6, (currentPlayer + 1) * 6);
    const faceDownCards = currentPlayerCards.filter(card => !card.faceUp).length;
    
    setDiscardPile(prev => [...prev, drawnCard]);
    setDrawnCard(null);
    setSelectedCard(null);
    setHasDrawnAndDiscarded(true); // Set this flag when discarding
    
    // If only one card is face down, discarding ends the turn
    if (faceDownCards === 1) {
      nextTurn();
    }
  };

  const nextTurn = () => {
    setCurrentPlayer((prev) => (prev + 1) % 2);
    setHasDrawnAndDiscarded(false);
    setHasDrawnFromMainDeck(false);
    toast(`Player ${((currentPlayer + 1) % 2) + 1}'s turn`);
  };

  const renderPlayerCards = (playerIndex: number) => {
    const playerCards = cards.slice(playerIndex * 6, (playerIndex + 1) * 6);
    return (
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-3 grid grid-cols-3 gap-4">
          {playerCards.slice(0, 3).map((card, index) => (
            <PlayingCard
              key={`p${playerIndex}-row1-${index}`}
              rank={card.rank}
              suit={card.suit}
              faceUp={card.faceUp}
              onClick={() => handleCardClick(playerIndex * 6 + index)}
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
              onClick={() => handleCardClick(playerIndex * 6 + index + 3)}
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
                onClick={() => {
                  setGameEnded(false);
                  setGameStarted(false);
                  setDeck([]);
                  setDiscardPile([]);
                  setCards([]);
                  setCurrentPlayer(0);
                  setDrawnCard(null);
                  setInitialFlipsRemaining([2, 2]);
                  setHasDrawnAndDiscarded(false);
                  setHasDrawnFromMainDeck(false);
                  toast("Game reset! Click Start Game to begin a new game");
                }}
                variant="destructive"
                className="mb-4 text-lg font-semibold px-6 py-3 text-white border-2 border-white hover:border-red-300"
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
              <div className="flex flex-col items-center gap-2">
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
                <span className="text-cream text-lg font-medium">Main Deck</span>
              </div>
              
              {discardPile.length > 0 && (
                <div className="flex flex-col items-center gap-2">
                  <div 
                    onClick={() => drawCard(true)}
                    className={cn(
                      "cursor-pointer",
                      selectedCard === 'discard' && "ring-4 ring-yellow-400 rounded-lg"
                    )}
                  >
                    <PlayingCard
                      rank={discardPile[discardPile.length - 1].rank}
                      suit={discardPile[discardPile.length - 1].suit}
                      faceUp={true}
                    />
                  </div>
                  <span className="text-cream text-lg font-medium">Discard Pile</span>
                </div>
              )}
              
              {drawnCard && (
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    selectedCard === 'drawn' && "ring-4 ring-yellow-400 rounded-lg"
                  )}>
                    <PlayingCard
                      rank={drawnCard.rank}
                      suit={drawnCard.suit}
                      faceUp={true}
                    />
                  </div>
                  <span className="text-cream text-lg font-medium">Picked Up</span>
                  <Button 
                    onClick={discardDrawnCard}
                    variant="destructive"
                    className="text-lg font-semibold px-6 py-3 text-white border-2 border-white hover:border-red-300"
                  >
                    {cards.filter(card => !card.faceUp).length === 1 
                      ? "End Turn" 
                      : "Discard"}
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
              {gameEnded 
                ? "Game Over!"
                : initialFlipsRemaining.some(flips => flips > 0) 
                  ? `${currentPlayer === 0 ? "Player 1" : "Player 2"} - Flip ${2 - initialFlipsRemaining[currentPlayer]} cards`
                  : `${currentPlayer === 0 ? "Player 1" : "Player 2"}'s Turn`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
