import GameBoard from "@/components/GameBoard";

interface IndexProps {
  gameId: string;
}

const Index = ({ gameId }: IndexProps) => {
  return <GameBoard gameId={gameId} />;
};

export default Index;