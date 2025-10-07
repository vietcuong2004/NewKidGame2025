import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameComponentHandles } from './utils';

// CSS Imports
import './index.css';

// Import the new game components
import NoiPhepTinhGame from './Games/NoiPhepTinh';
import NoiSoGame from './Games/NoiSo';
import MeCungToanHocGame from './Games/MeCungToanHoc';
import MaHoaPhepTinhGame from './Games/MaHoaPhepTinh';
import ToMauManhGhepGame from './Games/ToMauManhGhep';
import DienKiTuGame from './Games/DienKiTu';
import ToTracNghiemGame from './Games/ToTracNghiem';
import TimHinhDungGame from './Games/TimHinhDung'; 

type GameType = 'equation-match' | 'number-match' | 'calculation-path' | 'symbol-math' | 'color-puzzle' | 'character-fill' | 'multiple-choice-coloring' | 'pattern-find'; 

// --- MAIN APP ---
const App: React.FC = () => {
  const [game, setGame] = useState<GameType>('number-match');
  const gameComponentRef = useRef<GameComponentHandles>(null);

  const games = [
    { id: 'equation-match' as GameType, name: 'Nối phép tính', description: 'Nối phép tính ở cột bên trái với kết quả đúng ở cột bên phải.' },
    { id: 'number-match' as GameType, name: 'Nối Số', description: 'Nối các ô chứa hình ảnh ở cột trái với ô chứa số lượng tương ứng ở cột phải.' },
    { id: 'calculation-path' as GameType, name: 'Mê cung toán học', description: 'Bắt đầu từ ô "Bắt đầu", thực hiện các phép tính theo mũi tên để tìm đường đến ô "Kết thúc" và điền kết quả vào các ô trống.' },
    { id: 'symbol-math' as GameType, name: 'Mã hóa phép tính', description: 'Dựa vào bảng quy đổi các biểu tượng thành số, hãy giải các phép tính bên dưới.' },
    { id: 'color-puzzle' as GameType, name: 'Tô màu mảnh ghép', description: 'Quan sát hình mẫu ở trên và tô màu các mảnh ghép ở dưới sao cho giống hệt với hình mẫu.' },
    { id: 'character-fill' as GameType, name: 'Điền kí tự', description: 'Dựa vào bảng quy đổi, điền ký tự tương ứng với mỗi hình vào ô trống bên dưới.' },
    { id: 'multiple-choice-coloring' as GameType, name: 'Tô trắc nghiệm', description: 'Tô màu các ô tròn ở cột bên phải để tạo thành hình giống hệt với mẫu ở cột bên trái.' },
    { id: 'pattern-find' as GameType, name: 'Tìm hình đúng', description: 'Tìm ra quy luật của các hình và chọn hình còn thiếu trong dấu "?" từ các lựa chọn bên dưới.' },
  ];
  
  const currentGame = games.find(g => g.id === game);

  const renderGame = () => {
    switch(game) {
      case 'equation-match':
        return <NoiPhepTinhGame ref={gameComponentRef} />;
      case 'number-match':
        return <NoiSoGame ref={gameComponentRef} />;
      case 'calculation-path':
        return <MeCungToanHocGame ref={gameComponentRef} />;
      case 'symbol-math':
        return <MaHoaPhepTinhGame ref={gameComponentRef} />;
      case 'color-puzzle':
        return <ToMauManhGhepGame ref={gameComponentRef} />;
      case 'character-fill':
        return <DienKiTuGame ref={gameComponentRef} />;
      case 'multiple-choice-coloring':
        return <ToTracNghiemGame ref={gameComponentRef} />;
      case 'pattern-find':
        return <TimHinhDungGame ref={gameComponentRef} />;
      default:
        return null;
    }
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Bộ trò chơi trí tuệ cho bé</h1>
      </header>
      
      <div className="main-container">
        <aside className="controls-panel">
          <div className="control-group">
            <label htmlFor="game-select">Chọn trò chơi:</label>
            <div className="select-wrapper">
              <select 
                id="game-select" 
                value={game} 
                onChange={e => setGame(e.target.value as GameType)}
              >
                {games.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="control-group">
            <label>Luật chơi:</label>
            <div className="description-box">
              {currentGame?.description || 'Chọn một trò chơi để xem luật chơi.'}
            </div>
          </div>

          <div className="app-controls">
            <button className="btn btn-generate" onClick={() => gameComponentRef.current?.generateNew()}>Tạo trò chơi mới</button>
            <button className="btn btn-export" onClick={() => gameComponentRef.current?.exportPdf()}>Xuất file PDF</button>
          </div>
        </aside>

        <main className="content-area">
          {renderGame()}
        </main>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);