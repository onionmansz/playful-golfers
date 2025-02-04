import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface NamePromptProps {
  onSubmit: (name: string) => void;
}

export const NamePrompt = ({ onSubmit }: NamePromptProps) => {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <div className="min-h-screen bg-green-700 flex items-center justify-center p-4">
      <div className="bg-cream/10 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-cream mb-6 text-center">
          Welcome to 6-Card Golf
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-cream/20 text-cream placeholder:text-cream/50"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-gold hover:bg-gold/90 text-black"
          >
            Continue to Lobby
          </Button>
        </form>
      </div>
    </div>
  );
};