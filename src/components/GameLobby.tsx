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
  name: string;
  ready: boolean;
}

export const GameLobby = ({ onJoinGame, playerName }: GameLobbyProps) => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
    const channel = supabase
      .channel('game_rooms')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'game_rooms' 
      }, () => {
        fetchGames();
      })
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

      if (error) throw error;
      setGames(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error('Failed to fetch games');
    }
  };

  const createGame = async () => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .insert([{ 
          status: 'waiting',
          game_state: {
            players: [{
              name: playerName,
              ready: false
            }]
          }
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onJoinGame(data.id);
      }
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    }
  };

  const joinGame = async (gameId: string) => {
    try {
      const { data: currentGame } = await supabase
        .from('game_rooms')
        .select('game_state')
        .eq('id', gameId)
        .single();

      if (!currentGame) {
        toast.error('Game not found');
        return;
      }

      const gameState = currentGame.game_state || {};
      const players = gameState.players || [];

      if (players.length >= 2) {
        toast.error('Game is full');
        return;
      }

      if (players.some((p: Player) => p.name === playerName)) {
        toast.error('You are already in this game');
        return;
      }

      const updatedPlayers = [...players, { name: playerName, ready: false }];

      const { error } = await supabase
        .from('game_rooms')
        .update({ 
          game_state: {
            ...gameState,
            players: updatedPlayers
          }
        })
        .eq('id', gameId);

      if (error) throw error;
      onJoinGame(gameId);
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error('Failed to join game');
    }
  };

  const toggleReady = async (gameId: string) => {
    try {
      const { data: currentGame } = await supabase
        .from('game_rooms')
        .select('game_state')
        .eq('id', gameId)
        .single();

      if (!currentGame) {
        toast.error('Game not found');
        return;
      }

      const gameState = currentGame.game_state || {};
      const players = gameState.players || [];
      const playerIndex = players.findIndex((p: Player) => p.name === playerName);

      if (playerIndex === -1) {
        toast.error('Player not found in game');
        return;
      }

      players[playerIndex].ready = !players[playerIndex].ready;

      const { error } = await supabase
        .from('game_rooms')
        .update({ 
          game_state: {
            ...gameState,
            players
          },
          status: players.every((p: Player) => p.ready) ? 'playing' : 'waiting'
        })
        .eq('id', gameId);

      if (error) throw error;

      if (players.every((p: Player) => p.ready)) {
        onJoinGame(gameId);
      }
    } catch (error) {
      console.error('Error toggling ready state:', error);
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
                
                return (
                  <TableRow key={game.id}>
                    <TableCell className="text-cream">
                      Game #{game.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-cream">
                      {players.map((p: Player) => (
                        <div key={p.name}>
                          {p.name} {p.ready ? '✅' : '⏳'}
                        </div>
                      ))}
                      ({players.length}/2)
                    </TableCell>
                    <TableCell className="text-cream">
                      {game.status}
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
                      {isInGame && game.status === 'waiting' && (
                        <Button 
                          onClick={() => toggleReady(game.id)}
                          className={`${currentPlayer.ready ? 'bg-green-500' : 'bg-yellow-500'} hover:opacity-90 text-black`}
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