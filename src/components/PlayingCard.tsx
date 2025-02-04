import React from "react";
import { cn } from "@/lib/utils";

interface PlayingCardProps {
  rank: string;
  suit: string;
  faceUp: boolean;
  onClick?: () => void;
  className?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  rank,
  suit,
  faceUp,
  onClick,
  className,
}) => {
  const suitColor = suit === "♥" || suit === "♦" ? "text-red-600" : "text-black";

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative w-24 h-36 perspective-1000 cursor-pointer transition-transform hover:scale-105",
        className
      )}
    >
      <div
        className={cn(
          "absolute w-full h-full transition-transform duration-600 transform-style-preserve-3d",
          faceUp && "rotate-y-180"
        )}
      >
        {/* Card Back */}
        <div className="absolute w-full h-full bg-blue-700 rounded-lg border-2 border-white shadow-lg backface-hidden">
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-24 border-2 border-gold rounded-md"></div>
          </div>
        </div>

        {/* Card Front */}
        <div
          className={cn(
            "absolute w-full h-full bg-white rounded-lg border-2 border-gray-300 shadow-lg backface-hidden rotate-y-180",
            suitColor
          )}
        >
          <div className="absolute top-2 left-2">
            <div className="text-xl font-bold">{rank}</div>
            <div className="text-2xl">{suit}</div>
          </div>
          <div className="absolute bottom-2 right-2 rotate-180">
            <div className="text-xl font-bold">{rank}</div>
            <div className="text-2xl">{suit}</div>
          </div>
        </div>
      </div>
    </div>
  );
};