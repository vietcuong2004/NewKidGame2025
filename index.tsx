import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameComponentHandles } from './utils';

// Import the new game components
import NoiPhepTinhGame from './NoiPhepTinh';
import NoiBongGame from './NoiBong';
import MeCungToanHocGame from './MeCungToanHoc';
import MaHoaPhepTinhGame from './MaHoaPhepTinh';
import ToMauManhGhepGame from './ToMauManhGhep';
import DienKiTuGame from './DienKiTu'; // Import the new game

type GameType = 'equation-match' | 'object-match' | 'calculation-path' | 'symbol-math' | 'color-puzzle' | 'character-fill'; // Add new game type

// --- MAIN APP ---
const App: React.FC = () => {
  const [game, setGame] = useState<GameType>('character-fill');
  const gameComponentRef = useRef<GameComponentHandles>(null);

  const games = [
    { id: 'equation-match' as GameType, name: 'Nối phép tính' },
    { id: 'object-match' as GameType, name: 'Nối bóng' },
    { id: 'calculation-path' as GameType, name: 'Mê cung toán học' },
    { id: 'symbol-math' as GameType, name: 'Toán học biểu tượng' },
    { id: 'color-puzzle' as GameType, name: 'Tô màu mảnh ghép' },
    { id: 'character-fill' as GameType, name: 'Điền kí tự' }, // Add new game to list
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
      case 'color-puzzle':
        return <ToMauManhGhepGame ref={gameComponentRef} />;
      case 'character-fill': // Add render case
        return <DienKiTuGame ref={gameComponentRef} />;
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