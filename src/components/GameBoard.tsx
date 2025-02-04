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
import { supabase } from "@/integrations/supabase/client";

type Card = {
  rank: string;
  suit: string;
  faceUp: boolean;
};

type Player = {
  name: string;
  cards: Card[];
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

const calculatePlayerScore = (cards: Card[]): number => {
  let score = 0;
  
  const values = cards.map(card => card.faceUp ? getCardValue(card.rank) : 10);
  
  for (let col = 0; col < 3; col++) {
    if (cards[col].faceUp && cards[col + 3].faceUp) {
      if (cards[col].rank === cards[col + 3].rank) {
        values[col] = 0;
        values[col + 3] = 0;
      }
    }
  }
  
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
  
  score += values.reduce((sum, value) => sum + value, 0);
  
  return score;
};

const calculateColumnScore = (cards: Card[], startIndex: number): number => {
  if (!cards[startIndex].faceUp || !cards[startIndex + 3].faceUp) return 0;
  
  if (cards[startIndex].rank === cards[startIndex + 3].rank) {
    return 0;
  }
  
  return getCardValue(cards[startIndex].rank) + getCardValue(cards[startIndex + 3].rank);
};

const calculateSquareBonus = (cards: Card[], startIndex: number): number => {
  if (!cards[startIndex].faceUp || !cards[startIndex + 1].faceUp || 
      !cards[startIndex + 3].faceUp || !cards[startIndex + 4].faceUp) return 0;
  
  const square = [
    cards[startIndex].rank,
    cards[startIndex + 1].rank,
    cards[startIndex + 3].rank,
    cards[startIndex + 4].rank
  ];
  
  return new Set(square).size === 1 ? -10 : 0;
};

const createDeck = () => {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS.filter(r => r !== "JOKER")) {
      deck.push({ rank, suit, faceUp: false });
    }
  }
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

interface GameBoardProps {
  gameId?: string;
}

const GameBoard = ({ gameId }: GameBoardProps) => {
  const [deck, setDeck] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [initialFlipsRemaining, setInitialFlipsRemaining] = useState<number[]>([2, 2]);
  const [canFlipCard, setCanFlipCard] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [selectedCard, setSelectedCard] = useState<'drawn' | 'discard' | null>(null);
  const [finalTurnPlayer, setFinalTurnPlayer] = useState<number | null>(null);

  useEffect(() => {
    if (gameId) {
      console.log('Subscribing to game updates for:', gameId);
      const gameSubscription = supabase
        .channel(`game_${gameId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'game_rooms',
            filter: `id=eq.${gameId}`
          },
          async (payload) => {
            console.log('Game state updated:', payload.new);
            const gameState = payload.new.game_state;
            
            if (gameState) {
              setDeck(gameState.deck || []);
              setDiscardPile(gameState.discardPile || []);
              setPlayers(gameState.players || []);
              setCurrentPlayer(gameState.currentPlayer || 0);
              setDrawnCard(gameState.drawnCard || null);
              setGameStarted(gameState.gameStarted || false);
              setGameEnded(gameState.gameEnded || false);
              setInitialFlipsRemaining(gameState.initialFlipsRemaining || [2, 2]);
              setCanFlipCard(gameState.canFlipCard || false);
              setSelectedCard(gameState.selectedCard || null);
              setFinalTurnPlayer(gameState.finalTurnPlayer || null);
            }
          }
        )
        .subscribe();

      return () => {
        console.log('Unsubscribing from game updates');
        supabase.removeChannel(gameSubscription);
      };
    }
  }, [gameId]);

  useEffect(() => {
    const updateGameState = async () => {
      if (!gameId) return;

      const gameState = {
        deck,
        discardPile,
        players,
        currentPlayer,
        drawnCard,
        gameStarted,
        gameEnded,
        initialFlipsRemaining,
        canFlipCard,
        selectedCard,
        finalTurnPlayer,
      };

      console.log('Updating game state:', gameState);

      const { error } = await supabase
        .from('game_rooms')
        .update({ game_state: gameState })
        .eq('id', gameId);

      if (error) {
        console.error('Error updating game state:', error);
        toast.error('Failed to update game state');
      }
    };

    updateGameState();
  }, [
    gameId,
    deck,
    discardPile,
    players,
    currentPlayer,
    drawnCard,
    gameStarted,
    gameEnded,
    initialFlipsRemaining,
    canFlipCard,
    selectedCard,
    finalTurnPlayer,
  ]);

  const startGame = () => {
    const newDeck = createDeck();
    const player1Cards = newDeck.splice(0, 6);
    const player2Cards = newDeck.splice(0, 6);
    
    setPlayers([
      { name: players[0].name, cards: player1Cards },
      { name: players[1].name, cards: player2Cards }
    ]);
    
    setDeck(newDeck);
    setGameStarted(true);
    setCurrentPlayer(0);
    toast(`Game started! ${players[0].name}'s turn to flip cards`);
  };

  const handleCardClick = (index: number) => {
    const gameState = players[currentPlayer]?.cards;
    if (!gameState || currentPlayer !== players.findIndex(p => p.name === players[currentPlayer].name)) {
      toast.error("It's not your turn!");
      return;
    }

    if (initialFlipsRemaining[currentPlayer] > 0) {
      const currentPlayerCards = [...players[currentPlayer].cards];
      
      if (currentPlayerCards[index].faceUp) {
        toast("You must flip a different card!");
        return;
      }
      
      const firstFlippedCardIndex = currentPlayerCards.findIndex(card => card.faceUp);
      if (firstFlippedCardIndex !== -1 && 
          currentPlayerCards[firstFlippedCardIndex].rank === currentPlayerCards[index].rank) {
        toast("You cannot flip two cards of the same rank during initial flips!");
        return;
      }
      
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

    if (!drawnCard && !canFlipCard) return;

    const currentPlayerCards = [...players[currentPlayer].cards];
    const faceDownCards = currentPlayerCards.filter(card => !card.faceUp).length;
    
    if (drawnCard && selectedCard) {
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
      setSelectedCard(null);
      setCanFlipCard(false);
      nextTurn();
    } else if (canFlipCard && !currentPlayerCards[index].faceUp) {
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
    setSelectedCard(null);
    
    if (faceDownCards === 1) {
      nextTurn();
    }
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

  const renderScoringTable = () => {
    return (
      <div className="mb-8 bg-cream/10 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-cream mb-4">Scoring Guide</h2>
        <Table className="text-cream">
          <TableHeader>
            <TableRow className="hover:bg-cream/5">
              <TableHead className="text-cream">Card</TableHead>
              <TableHead className="text-cream">Value/Rule</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-cream/5">
              <TableCell>King (K)</TableCell>
              <TableCell>0 points</TableCell>
            </TableRow>
            <TableRow className="hover:bg-cream/5">
              <TableCell>Queen (Q), Jack (J)</TableCell>
              <TableCell>10 points</TableCell>
            </TableRow>
            <TableRow className="hover:bg-cream/5">
              <TableCell>Ace (A)</TableCell>
              <TableCell>1 point</TableCell>
            </TableRow>
            <TableRow className="hover:bg-cream/5">
              <TableCell>Five (5)</TableCell>
              <TableCell>-5 points</TableCell>
            </TableRow>
            <TableRow className="hover:bg-cream/5">
              <TableCell>Joker</TableCell>
              <TableCell>-5 points</TableCell>
            </TableRow>
            <TableRow className="hover:bg-cream/5">
              <TableCell>Other Numbers</TableCell>
              <TableCell>Face value</TableCell>
            </TableRow>
            <TableRow className="hover:bg-cream/5">
              <TableCell>Matching Column</TableCell>
              <TableCell>Cards become 0 points</TableCell>
            </TableRow>
            <TableRow className="hover:bg-cream/5">
              <TableCell>2x2 Square Match</TableCell>
              <TableCell>-10 points bonus</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderFinalScores = () => {
    if (!gameEnded) return null;

    const detailedScores = players.map(player => {
      const columnScores = [
        calculateColumnScore(player.cards, 0),
        calculateColumnScore(player.cards, 1),
        calculateColumnScore(player.cards, 2)
      ];
      
      const squareBonuses = [
        calculateSquareBonus(player.cards, 0),
        calculateSquareBonus(player.cards, 1)
      ];
      
      const totalScore = columnScores.reduce((sum, score) => sum + score, 0) + 
                        squareBonuses.reduce((sum, bonus) => sum + bonus, 0);
      
      return {
        name: player.name,
        columnScores,
        squareBonuses,
        totalScore
      };
    });

    const winningPlayer = detailedScores[0].totalScore <= detailedScores[1].totalScore ? 
      detailedScores[0] : detailedScores[1];

    return (
      <div className="mt-8 bg-cream/90 p-8 rounded-lg max-w-full space-y-6 shadow-xl">
        <h2 className="text-3xl font-bold text-center text-black">
          Game Over! {winningPlayer.name} Wins!
        </h2>
        <div className="space-y-8">
          {detailedScores.map((score, index) => (
            <div key={index} className={`p-6 rounded-lg ${score === winningPlayer ? 'bg-gold/30' : 'bg-black/20'}`}>
              <h3 className="text-xl font-bold mb-4">{score.name}</h3>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Column 1</TableCell>
                    <TableCell className="text-right">{score.columnScores[0]} points</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Column 2</TableCell>
                    <TableCell className="text-right">{score.columnScores[1]} points</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Column 3</TableCell>
                    <TableCell className="text-right">{score.columnScores[2]} points</TableCell>
                  </TableRow>
                  {score.squareBonuses.some(bonus => bonus !== 0) && (
                    <TableRow>
                      <TableCell className="font-medium">Square Bonuses</TableCell>
                      <TableCell className="text-right">
                        {score.squareBonuses.reduce((sum, bonus) => sum + bonus, 0)} points
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="font-bold">
                    <TableCell>Total Score</TableCell>
                    <TableCell className="text-right">{score.totalScore} points</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-6">
          <Button 
            onClick={restartGame}
            className="bg-gold hover:bg-gold/90 text-black text-xl px-8 py-4"
          >
            Play Again
          </Button>
        </div>
      </div>
    );
  };

  const restartGame = () => {
    setDeck(createDeck());
    setDiscardPile([]);
    setPlayers([]);
    setCurrentPlayer(0);
    setGameStarted(false);
    setDrawnCard(null);
    setInitialFlipsRemaining([2, 2]);
    setCanFlipCard(false);
    setGameEnded(false);
    setSelectedCard(null);
    setFinalTurnPlayer(null);
  };

  const nextTurn = () => {
    if (gameEnded) return;
    
    const currentPlayerCards = players[currentPlayer].cards;
    const allCardsRevealed = currentPlayerCards.every(card => card.faceUp);
    
    if (allCardsRevealed) {
      if (finalTurnPlayer === null) {
        setFinalTurnPlayer(currentPlayer);
        toast(`${players[currentPlayer].name} has revealed all cards! Final round begins!`);
      } else if (finalTurnPlayer === currentPlayer) {
        setGameEnded(true);
        return;
      }
    }
    
    setCurrentPlayer((prev) => (prev + 1) % players.length);
    setDrawnCard(null);
    setSelectedCard(null);
    setCanFlipCard(false);
  };

  const drawCard = async (fromDiscard: boolean) => {
    if (drawnCard) return;
    
    if (fromDiscard) {
      if (discardPile.length === 0) return;
      const card = discardPile[discardPile.length - 1];
      setDiscardPile(prev => prev.slice(0, -1));
      setDrawnCard(card);
      setSelectedCard('discard');
    } else {
      if (deck.length === 0) {
        if (discardPile.length === 0) {
          toast.error("No cards left to draw!");
          return;
        }
        const newDeck = shuffle([...discardPile]);
        setDeck(newDeck.slice(1));
        setDiscardPile([]);
        setDrawnCard(newDeck[0]);
      } else {
        const [card, ...remainingDeck] = deck;
        setDeck(remainingDeck);
        setDrawnCard(card);
      }
      setSelectedCard('drawn');
    }
    
    setCanFlipCard(true);
  };

  return (
    <div className="min-h-screen bg-table p-8">
      <div className="max-w-4xl mx-auto">
        {!gameStarted && players.length === 2 ? (
          <div className="flex flex-col items-center justify-center space-y-8">
            <h1 className="text-4xl font-bold text-cream">Ready to Start!</h1>
            <Button
              onClick={startGame}
              className="bg-gold hover:bg-gold/90 text-black text-xl px-8 py-6"
            >
              Start Game
            </Button>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex justify-end">
              <Button 
                onClick={restartGame}
                variant="destructive"
                className="mb-4 text-lg font-semibold px-6 py-3 text-white border-2 border-white hover:border-red-300"
              >
                Restart Game
              </Button>
            </div>

            {renderScoringTable()}

            <div className="mb-12">
              {renderPlayerCards(1)}
            </div>

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
                    {players[currentPlayer].cards.filter(card => !card.faceUp).length === 1 
                      ? "End Turn" 
                      : "Discard"}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-12">
              {renderPlayerCards(0)}
            </div>

            <div className="text-center text-cream text-2xl mt-8">
              {gameEnded 
                ? "Game Over!"
                : initialFlipsRemaining.some(flips => flips > 0) 
                  ? `${players[currentPlayer]?.name} - Flip ${2 - initialFlipsRemaining[currentPlayer]} cards`
                  : `${players[currentPlayer]?.name}'s Turn`}
            </div>

            {renderFinalScores()}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;