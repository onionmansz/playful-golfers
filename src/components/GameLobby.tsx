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
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*')
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
          status: 'waiting'
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) onJoinGame(data.id);
    } catch (error) {
      console.error('Error creating game:', error);
      toast.error('Failed to create game');
    }
  };

  const joinGame = async (gameId: string) => {
    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({ 
          status: 'playing'
        })
        .eq('id', gameId)
        .eq('status', 'waiting');

      if (error) throw error;
      onJoinGame(gameId);
    } catch (error) {
      console.error('Error joining game:', error);
      toast.error('Failed to join game');
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading games...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Game Lobby</h1>
        <Button onClick={createGame}>Create New Game</Button>
      </div>

      <div className="grid gap-4">
        {games.map((game) => (
          <div
            key={game.id}
            className="border p-4 rounded-lg flex justify-between items-center"
          >
            <div>
              <p className="font-semibold">Game #{game.id.slice(0, 8)}</p>
              <p className="text-sm text-gray-500">Status: {game.status}</p>
            </div>
            {game.status === 'waiting' && (
              <Button onClick={() => joinGame(game.id)}>Join Game</Button>
            )}
          </div>
        ))}
        {games.length === 0 && (
          <p className="text-center text-gray-500">No games available. Create one!</p>
        )}
      </div>
    </div>
  );
};