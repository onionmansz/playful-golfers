import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { GameLobby } from "./components/GameLobby";
import { NamePrompt } from "./components/NamePrompt";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);

  const handleJoinGame = (gameId: string) => {
    setGameId(gameId);
  };

  const handleNameSubmit = (name: string) => {
    setPlayerName(name);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {!playerName ? (
            <NamePrompt onSubmit={handleNameSubmit} />
          ) : !gameId ? (
            <GameLobby onJoinGame={handleJoinGame} playerName={playerName} />
          ) : (
            <Routes>
              <Route path="/" element={<Index gameId={gameId} />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          )}
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;