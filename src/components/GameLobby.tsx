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
        .eq('status', 'waiting');
      
      if (error) throw error;
      setGames(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createGame = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('game_rooms')
        .insert([
          { 
            player1_id: user.id,
            status: 'waiting'
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) onJoinGame(data.id);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const joinGame = async (gameId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('game_rooms')
        .update({ 
          player2_id: user.id,
          status: 'playing',
          current_player_id: user.id
        })
        .eq('id', gameId)
        .eq('status', 'waiting');

      if (error) throw error;
      onJoinGame(gameId);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl space-y-8 bg-cream/10 p-8 rounded-lg">
        <h2 className="text-3xl font-bold text-center text-cream">Game Lobby</h2>
        <div className="flex justify-center">
          <Button
            onClick={createGame}
            className="bg-gold hover:bg-gold/90 text-black px-8 py-6 text-xl"
          >
            Create New Game
          </Button>
        </div>
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-cream">Available Games</h3>
          {loading ? (
            <p className="text-cream text-center">Loading games...</p>
          ) : games.length === 0 ? (
            <p className="text-cream text-center">No games available</p>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="flex justify-between items-center bg-cream/5 p-4 rounded-lg"
                >
                  <span className="text-cream">Game #{game.id.slice(0, 8)}</span>
                  <Button
                    onClick={() => joinGame(game.id)}
                    className="bg-gold hover:bg-gold/90 text-black"
                  >
                    Join Game
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};