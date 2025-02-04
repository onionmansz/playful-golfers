import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GameLobbyProps {
  onJoinGame: (gameId: string) => void;
  playerName: string;
}

interface Player {
  id: string;
  name: string;
  ready: boolean;
  cards?: any[];
}

export const GameLobby = ({ onJoinGame, playerName }: GameLobbyProps) => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
    
    const channel = supabase
      .channel('game_rooms')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'game_rooms' 
        },
        (payload) => {
          console.log('Game rooms updated:', payload);
          fetchGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchGames = async () => {
    try {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
        .gt('created_at', threeMinutesAgo)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching games:', error);
        toast.error('Failed to fetch games');
        return;
      }

      setGames(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchGames:', error);
      toast.error('Failed to fetch games');
      setLoading(false);
    }
  };

  const createGame = async () => {
    try {
      const playerId = crypto.randomUUID();
      
      const initialGameState = {
        players: [{
          id: playerId,
          name: playerName,
          ready: false,
          cards: []
        }],
        gameStarted: false,
        currentPlayer: 0,
        deck: [],
        discardPile: [],
        drawnCard: null,
        initialFlipsRemaining: [2, 2],
        canFlipCard: false,
        selectedCard: null,
        finalTurnPlayer: null,
        gameEnded: false
      };

      const { data, error } = await supabase
        .from('game_rooms')
        .insert([{ 
          status: 'waiting',
          game_state: initialGameState,
          player1_id: playerId,
          current_player_id: playerId
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating game:', error);
        toast.error('Failed to create game');
        return;
      }

      onJoinGame(data.id);
    } catch (error) {
      console.error('Error in createGame:', error);
      toast.error('Failed to create game');
    }
  };

  const joinGame = async (gameId: string) => {
    try {
      const { data: currentGame, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .maybeSingle();

      if (fetchError || !currentGame) {
        console.error('Error fetching game:', fetchError);
        toast.error('Game not found');
        return;
      }

      const gameState = currentGame.game_state;
      const players = gameState?.players || [];

      if (players.length >= 2) {
        toast.error('Game is full');
        return;
      }

      if (players.some((p: Player) => p.name === playerName)) {
        toast.error('You are already in this game');
        return;
      }

      const player2Id = crypto.randomUUID();
      const updatedPlayers = [...players, {
        id: player2Id,
        name: playerName,
        ready: false,
        cards: []
      }];

      const updatedGameState = {
        ...gameState,
        players: updatedPlayers
      };

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          game_state: updatedGameState,
          player2_id: player2Id,
          status: 'waiting'
        })
        .eq('id', gameId);

      if (updateError) {
        console.error('Error updating game:', updateError);
        toast.error('Failed to join game');
        return;
      }

      onJoinGame(gameId);
    } catch (error) {
      console.error('Error in joinGame:', error);
      toast.error('Failed to join game');
    }
  };

  const toggleReady = async (gameId: string) => {
    try {
      const { data: currentGame, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .maybeSingle();

      if (fetchError || !currentGame) {
        console.error('Error fetching game:', fetchError);
        toast.error('Game not found');
        return;
      }

      const gameState = currentGame.game_state;
      const players = [...(gameState?.players || [])];
      const playerIndex = players.findIndex((p: Player) => p.name === playerName);

      if (playerIndex === -1) {
        toast.error('Player not found in game');
        return;
      }

      players[playerIndex].ready = !players[playerIndex].ready;
      const allReady = players.length === 2 && players.every((p: Player) => p.ready);

      const updatedGameState = {
        ...gameState,
        players,
        gameStarted: allReady
      };

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          game_state: updatedGameState,
          status: allReady ? 'playing' : 'waiting'
        })
        .eq('id', gameId);

      if (updateError) {
        console.error('Error updating game:', updateError);
        toast.error('Failed to update ready state');
        return;
      }

      if (allReady) {
        onJoinGame(gameId);
      }
    } catch (error) {
      console.error('Error in toggleReady:', error);
      toast.error('Failed to update ready state');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-700 flex items-center justify-center">
        <div className="text-center text-cream p-4">Loading games...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-700 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-cream">Game Lobby</h1>
            <p className="text-cream/80">Playing as: {playerName}</p>
          </div>
          <Button 
            onClick={createGame}
            className="bg-gold hover:bg-gold/90 text-black"
          >
            Create New Game
          </Button>
        </div>

        <div className="bg-cream/10 rounded-lg p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-cream">Game</TableHead>
                <TableHead className="text-cream">Players</TableHead>
                <TableHead className="text-cream">Status</TableHead>
                <TableHead className="text-cream">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => {
                const players = game.game_state?.players || [];
                const currentPlayer = players.find((p: Player) => p.name === playerName);
                const isInGame = Boolean(currentPlayer);
                const gameStarted = game.game_state?.gameStarted || false;
                
                return (
                  <TableRow key={game.id}>
                    <TableCell className="text-cream">
                      Game #{game.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-cream">
                      {players.map((p: Player) => (
                        <div key={p.id} className="flex items-center gap-2">
                          {p.name} {p.ready ? '✅' : '⏳'}
                        </div>
                      ))}
                      ({players.length}/2)
                    </TableCell>
                    <TableCell className="text-cream">
                      {gameStarted ? 'In Progress' : game.status}
                    </TableCell>
                    <TableCell>
                      {!isInGame && game.status === 'waiting' && players.length < 2 && (
                        <Button 
                          onClick={() => joinGame(game.id)}
                          className="bg-gold hover:bg-gold/90 text-black"
                        >
                          Join Game
                        </Button>
                      )}
                      {isInGame && !gameStarted && (
                        <Button 
                          onClick={() => toggleReady(game.id)}
                          className={currentPlayer.ready ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}
                        >
                          {currentPlayer.ready ? 'Ready!' : 'Ready Up'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {games.length === 0 && (
            <p className="text-center text-cream/80 mt-4">No games available. Create one!</p>
          )}
        </div>
      </div>
    </div>
  );
};