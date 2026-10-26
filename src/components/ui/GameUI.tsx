import { useState } from 'react';
import { useGameInteraction } from '@/engine/useGameInteraction';
import { useAnalysis } from '@/analysis/context';
import { EvalBar } from '@/analysis/EvalBar';
import { AnalysisPanel } from '@/analysis/AnalysisPanel';
import { AnalysisMoveList } from '@/analysis/AnalysisMoveList';
import { ThemeSettings } from './ThemeSettings';
import { formatEval } from '@/analysis/engine/uci';
import { PromotionModal } from './PromotionModal';
import { MoveHistory } from './MoveHistory';
import { CapturedPieces } from './CapturedPieces';
import { GameOverModal } from './GameOverModal';

export function GameUI({ board }: { board?: React.ReactNode }) {
  const { 
    metrics, 
    resetGame, 
    aiEnabled,
    aiDifficulty,
    aiColor,
    boardFlipped,
    promotionMove,
    resolvePromotion,
    cancelPromotion,
    setAIEnabled,
    setAIDifficulty,
    setAIColor,
    setBoardFlipped,
    makeAIMove,
    importPgn,
  } = useGameInteraction();
  const analysis = useAnalysis();
  const { turnLabel, fen, pgn, inCheckmate, inDraw, inStalemate, inCheck, moveCount } = metrics;
  const analysisActive = analysis.enabled;
  const analysisPosition = analysis.current;

  const [showMoveHistory, setShowMoveHistory] = useState(true);
  const [showCaptured, setShowCaptured] = useState(true);
  const [showAIControls, setShowAIControls] = useState(false);
  // Tracks the move count at which the player dismissed the game-over dialog so
  // it does not immediately reopen on the next render.
  const [dismissedGameOverAt, setDismissedGameOverAt] = useState<number | null>(null);

  // Check for game over
  const gameEnded = inCheckmate || inDraw || inStalemate;
  const isGameOver =
    gameEnded && !analysisActive && dismissedGameOverAt !== moveCount;

  const handleNewGame = () => {
    analysis.reset();
    resetGame();
    cancelPromotion();
    setDismissedGameOverAt(null);
  };

  const handleExportPGN = () => {
    const blob = new Blob([pgn || fen], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-game-${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportPGN = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (!content) return;
        try {
          if (analysisActive) analysis.loadText(content, 'pgn');
          else if (!importPgn(content)) window.alert('That file is not a valid PGN or FEN.');
        } catch (cause) {
          window.alert((cause as Error).message || 'That file is not a valid PGN or FEN.');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleAnalyzeToggle = () => {
    if (analysisActive) analysis.close();
    else analysis.open();
  };

  return (
    <>
      <header className="game-header">
        <div className="header-left">
          <h1>3D Chess Playground</h1>
          <div className="game-status">
            <span className={`turn-indicator ${metrics.turn}`}></span>
            <span>{turnLabel} to move</span>
            {inCheck && <span className="check-badge">⚠ Check</span>}
            {inCheckmate && <span className="checkmate-badge">🏆 Checkmate</span>}
            {(inDraw || inStalemate) && <span className="draw-badge">🤝 Draw</span>}
          </div>
        </div>
        <div className="header-right">
          <div className="move-counter">Move: {moveCount}</div>
          <div className="header-buttons">
            <button onClick={handleExportPGN} className="icon-btn" title="Export PGN">📥</button>
            <input type="file" accept=".pgn" onChange={handleImportPGN} id="pgn-import" style={{ display: 'none' }} />
            <label htmlFor="pgn-import" className="icon-btn" title="Import PGN">📤</label>
            <button onClick={() => setBoardFlipped(!boardFlipped)} className="icon-btn" title="Flip Board">
              🔄
            </button>
            <button onClick={() => setShowAIControls(!showAIControls)} className="icon-btn" title="AI Controls">
              🤖
            </button>
            <button
              onClick={handleAnalyzeToggle}
              className={`icon-btn${analysisActive ? ' is-active' : ''}`}
              title={analysisActive ? 'Exit analysis' : 'Game analysis'}
            >
              ♟
            </button>
            <button onClick={handleNewGame} className="primary-btn">New Game</button>
          </div>
        </div>
      </header>

      <main className="game-main">
        {/* Left side panel - Captured pieces & AI controls */}
        <aside className="side-panel left-panel">
          <ThemeSettings />
          {analysisActive ? (
            <>
              <AnalysisPanel currentFen={fen} />
              <div className="fen-display">
                <strong>{analysisPosition ? `FEN · ply ${analysis.viewIndex}` : 'FEN'}:</strong>
                <code>{analysisPosition?.fen ?? fen}</code>
              </div>
            </>
          ) : (
            <>
          {showCaptured && <CapturedPieces />}
          
          <div className="panel-controls">
            <label>
              <input type="checkbox" checked={showCaptured} onChange={(e) => setShowCaptured(e.target.checked)} />
              Captured Pieces
            </label>
          </div>

          {showAIControls && (
            <div className="ai-controls-panel">
              <h4>AI Opponent</h4>
              <div className="ai-control-row">
                <label>
                  <input 
                    type="checkbox" 
                    checked={aiEnabled} 
                    onChange={(e) => setAIEnabled(e.target.checked)} 
                  />
                  Enable AI
                </label>
              </div>
              <div className="ai-control-row">
                <label>
                  AI Color:
                  <select 
                    value={aiColor || ''} 
                    onChange={(e) => setAIColor(e.target.value as 'w' | 'b' | null)}
                    disabled={!aiEnabled}
                  >
                    <option value="">Human vs Human</option>
                    <option value="w">AI plays White</option>
                    <option value="b">AI plays Black</option>
                  </select>
                </label>
              </div>
              <div className="ai-control-row">
                <label>
                  Difficulty:
                  <select 
                    value={aiDifficulty} 
                    onChange={(e) => setAIDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    disabled={!aiEnabled || !aiColor}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </label>
              </div>
              {aiEnabled && aiColor && metrics.turn === aiColor && (
                <div className="ai-thinking">🤖 AI is thinking...</div>
              )}
              {aiEnabled && aiColor && (
                <button 
                  onClick={makeAIMove} 
                  disabled={metrics.turn !== aiColor || metrics.inCheckmate || metrics.inDraw || metrics.inStalemate}
                  className="ai-move-btn"
                >
                  Make AI Move
                </button>
              )}
            </div>
          )}

          <div className="fen-display">
            <strong>FEN:</strong>
            <code>{fen}</code>
          </div>
            </>
          )}
        </aside>

        {/* Board container */}
        <div className="board-container">
          {analysisActive && analysisPosition && analysis.currentEval && (
            <EvalBar
              whiteCp={analysis.currentEval.whiteCp}
              label={formatEval(analysis.currentEval.score, analysisPosition.turn)}
              flipped={boardFlipped}
              pending={!!analysis.live}
            />
          )}
          {board}
        </div>

        {/* Right side panel - Move History */}
        <aside className={`side-panel right-panel${analysisActive ? ' right-panel--analysis' : ''}`}>
          {analysisActive ? (
            <AnalysisMoveList />
          ) : (
            <>
              <div className="panel-header">
                <label>
                  <input type="checkbox" checked={showMoveHistory} onChange={(e) => setShowMoveHistory(e.target.checked)} />
                  Move History
                </label>
              </div>
              {showMoveHistory && <MoveHistory />}
            </>
          )}
        </aside>

      </main>

      <PromotionModal
        isOpen={!!promotionMove}
        color={metrics.turn}
        onPromote={resolvePromotion}
        onCancel={cancelPromotion}
      />

      <GameOverModal
        isOpen={isGameOver}
        onNewGame={handleNewGame}
        onClose={() => setDismissedGameOverAt(moveCount)}
      />
    </>
  );
}