import GameBoard from "@/components/GameBoard";

interface GameBoardProps {
  gameId?: string;
}

const Index = ({ gameId }: GameBoardProps) => {
  return <GameBoard gameId={gameId} />;
};

export default Index;