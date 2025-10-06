import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameComponentHandles } from './utils';

// Import the new game components
import NoiPhepTinhGame from './NoiPhepTinh';
import NoiBongGame from './NoiBong';
import MeCungToanHocGame from './MeCungToanHoc';
import MaHoaPhepTinhGame from './MaHoaPhepTinh';

type GameType = 'equation-match' | 'object-match' | 'calculation-path' | 'symbol-math';

// --- MAIN APP ---
const App: React.FC = () => {
  const [game, setGame] = useState<GameType>('object-match');
  const gameComponentRef = useRef<GameComponentHandles>(null);

  const games = [
    { id: 'equation-match' as GameType, name: 'Nối phép tính' },
    { id: 'object-match' as GameType, name: 'Nối bóng' },
    { id: 'calculation-path' as GameType, name: 'Mê cung toán học' },
    { id: 'symbol-math' as GameType, name: 'Mã hóa phép tính' },
  ];

  const renderGame = () => {
    switch(game) {
      case 'equation-match':
        return <NoiPhepTinhGame ref={gameComponentRef} />;
      case 'object-match':
        return <NoiBongGame ref={gameComponentRef} />;
      case 'calculation-path':
        return <MeCungToanHocGame ref={gameComponentRef} />;
      case 'symbol-math':
        return <MaHoaPhepTinhGame ref={gameComponentRef} />;
      default:
        return null;
    }
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Bộ trò chơi trí tuệ cho bé</h1>
      </header>

      <div className="choice-bar">
        <div className="choice-bar-inner">
          {games.map(g => (
            <button
              key={g.id}
              className={`switch-btn ${game === g.id ? 'active' : ''}`}
              onClick={() => setGame(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>
      
      <main className="content-area">
        {renderGame()}
      </main>

      <footer className="app-controls">
        <button className="btn btn-generate" onClick={() => gameComponentRef.current?.generateNew()}>Tạo trò chơi mới</button>
        <button className="btn btn-export" onClick={() => gameComponentRef.current?.exportPdf()}>Xuất file PDF</button>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);