import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const GameLobby = ({ onJoinGame }: { onJoinGame: (gameId: string) => void }) => {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGames();
    const subscription = supabase
      .channel('public:game_rooms')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'game_rooms' 
      }, fetchGames)
      .subscribe();

    return () => {
      subscription.unsubscribe();
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
              name: 'Player 1',
              ready: true
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

      const updatedPlayers = [...players, { name: 'Player 2', ready: true }];

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
          <h1 className="text-3xl font-bold text-cream">Game Lobby</h1>
          <Button 
            onClick={createGame}
            className="bg-gold hover:bg-gold/90 text-black"
          >
            Create New Game
          </Button>
        </div>

        <div className="grid gap-4">
          {games.map((game) => {
            const players = game.game_state?.players || [];
            return (
              <div
                key={game.id}
                className="bg-cream/10 p-6 rounded-lg flex justify-between items-center"
              >
                <div className="text-cream">
                  <p className="font-semibold">Game #{game.id.slice(0, 8)}</p>
                  <p className="text-sm text-cream/80">
                    Players: {players.map(p => p.name).join(', ')} ({players.length}/2)
                  </p>
                  <p className="text-sm text-cream/80">Status: {game.status}</p>
                </div>
                {game.status === 'waiting' && players.length < 2 && (
                  <Button 
                    onClick={() => joinGame(game.id)}
                    className="bg-gold hover:bg-gold/90 text-black"
                  >
                    Join Game
                  </Button>
                )}
              </div>
            );
          })}
          {games.length === 0 && (
            <p className="text-center text-cream/80">No games available. Create one!</p>
          )}
        </div>
      </div>
    </div>
  );
};