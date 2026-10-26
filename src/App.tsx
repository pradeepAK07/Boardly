import { GameScene } from './components/3d/Scene';
import { GameInteractionProvider, useGameInteraction } from './engine/useGameInteraction';
import { GameUI } from './components/ui/GameUI';
import { AnalysisProvider } from './analysis/AnalysisProvider';
import { ThemeProvider } from './theme/ThemeProvider';

function GameBoard() {
  const { boardFlipped } = useGameInteraction();
  return <GameScene boardFlipped={boardFlipped} />;
}

function App() {
  return (
    <GameInteractionProvider initialFen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1">
      <ThemeProvider>
        <AnalysisProvider>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <GameUI board={<GameBoard />} />
          </div>
        </AnalysisProvider>
      </ThemeProvider>
    </GameInteractionProvider>
  );
}

export default App;
