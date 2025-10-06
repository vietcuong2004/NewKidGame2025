import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

type GameType = 'sum-it-up' | 'equation-match' | 'object-match' | 'calculation-path';

// --- UTILITY FUNCTIONS ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

// --- SUM IT UP GAME ---
interface SumProblem {
  id: number;
  numbers: number[];
  answer: number;
}

const SumItUpGame: React.FC = () => {
  const [problems, setProblems] = useState<SumProblem[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  const generateProblems = useCallback(() => {
    const newProblems: SumProblem[] = Array.from({ length: 6 }, (_, i) => {
      const numCount = getRandomInt(2, 3);
      const numbers = Array.from({ length: numCount }, () => getRandomInt(0, 9));
      const answer = numbers.reduce((sum, num) => sum + num, 0);
      return { id: i, numbers, answer };
    });
    setProblems(newProblems);
    setUserAnswers({});
    setChecked(false);
  }, []);

  useEffect(() => {
    generateProblems();
  }, [generateProblems]);

  const handleInputChange = (id: number, value: string) => {
    setUserAnswers(prev => ({ ...prev, [id]: value.replace(/[^0-9]/g, '') }));
    setChecked(false);
  };

  const getStatus = (id: number, answer: number) => {
    if (!checked) return '';
    return parseInt(userAnswers[id], 10) === answer ? 'correct' : 'incorrect';
  };

  return (
    <>
      <div className="sum-it-up-game">
        {problems.map(p => (
          <div key={p.id} className="sum-item">
            <div className="sum-item-numbers">{p.numbers.join(' + ')}</div>
            <input
              type="text"
              className={`sum-item-input ${getStatus(p.id, p.answer)}`}
              value={userAnswers[p.id] || ''}
              onChange={(e) => handleInputChange(p.id, e.target.value)}
              aria-label={`Answer for ${p.numbers.join(' + ')}`}
            />
          </div>
        ))}
      </div>
      <div className="controls">
        <button className="btn btn-generate" onClick={generateProblems}>Tạo trò chơi mới</button>
        <button className="btn btn-check" onClick={() => setChecked(true)}>Kiểm tra kết quả</button>
      </div>
    </>
  );
};


// --- MATCHING GAMES ---
interface MatchItem {
  id: string;
  content: string;
  matchId: string;
}

const MatchingGame: React.FC<{ type: 'equation' | 'object' }> = ({ type }) => {
  const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
  const [rightItems, setRightItems] = useState<MatchItem[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<MatchItem | null>(null);
  const [connections, setConnections] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateItems = useCallback(() => {
    let baseItems: Omit<MatchItem, 'id'>[] = [];
    if (type === 'equation') {
      baseItems = Array.from({ length: 5 }, () => {
        const a = getRandomInt(0, 5);
        const b = getRandomInt(1, 5);
        return { content: `${a} + ${b}`, matchId: `${a + b}` };
      });
    } else {
      const icons = shuffleArray(['🍎', '⭐', '🚗', '☀️', '⚽', '☂️', '🎈']).slice(0, 5);
      baseItems = icons.map(icon => ({ content: icon, matchId: icon }));
    }
    const newLeftItems = baseItems.map((item, i) => ({ ...item, id: `l-${i}`}));
    const newRightItems = shuffleArray(baseItems.map((item, i) => ({ id: `r-${i}`, content: item.matchId, matchId: item.content })));
    setLeftItems(newLeftItems);
    setRightItems(newRightItems);
    setConnections({});
    setSelectedLeft(null);
    setChecked(false);
  }, [type]);
  
  useEffect(() => {
    generateItems();
  }, [generateItems]);
  
  useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 4;
      
      for(const leftId in connections) {
          const rightId = connections[leftId];
          const leftEl = itemRefs.current[leftId];
          const rightEl = itemRefs.current[rightId];
          if(leftEl && rightEl) {
              const rectL = leftEl.getBoundingClientRect();
              const rectR = rightEl.getBoundingClientRect();
              const rectCanvas = canvas.getBoundingClientRect();

              const startX = rectL.right - rectCanvas.left;
              const startY = rectL.top + rectL.height / 2 - rectCanvas.top;
              const endX = rectR.left - rectCanvas.left;
              const endY = rectR.top + rectR.height / 2 - rectCanvas.top;
              
              const isCorrect = checked && (leftItems.find(i => i.id === leftId)?.matchId === rightItems.find(i => i.id === rightId)?.content);
              ctx.strokeStyle = checked ? (isCorrect ? 'var(--correct-color)' : 'var(--incorrect-color)') : 'var(--primary-color)';
              
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
          }
      }
  }, [connections, checked, leftItems, rightItems]);

  const handleLeftClick = (item: MatchItem) => {
    setSelectedLeft(item);
    setChecked(false);
  }

  const handleRightClick = (item: MatchItem) => {
    if(selectedLeft) {
      setConnections(prev => ({...prev, [selectedLeft.id]: item.id}));
      setSelectedLeft(null);
    }
  }

  const isSelected = (item: MatchItem) => selectedLeft?.id === item.id;
  const itemClassName = (item: MatchItem) => `match-item ${type === 'object' ? 'object-match-item': ''} ${isSelected(item) ? 'selected' : ''}`;

  return (
    <>
      <div className="matching-game-container">
        <canvas ref={canvasRef} className="matching-canvas"></canvas>
        <div className="matching-column">
          {leftItems.map(item => (
            <div key={item.id} ref={el => itemRefs.current[item.id] = el} className={`${itemClassName(item)} ${type==='object' ? 'shadow' : ''}`} onClick={() => handleLeftClick(item)}>
              {item.content}
            </div>
          ))}
        </div>
        <div className="matching-column">
          {rightItems.map(item => (
             <div key={item.id} ref={el => itemRefs.current[item.id] = el} className={itemClassName(item)} onClick={() => handleRightClick(item)}>
              {item.content}
            </div>
          ))}
        </div>
      </div>
       <div className="controls">
        <button className="btn btn-generate" onClick={generateItems}>Tạo trò chơi mới</button>
        <button className="btn btn-check" onClick={() => setChecked(true)}>Kiểm tra kết quả</button>
      </div>
    </>
  )
};


// --- MATH MAZE GAME ---
interface MazeNode {
  value: number | null;
  op: string;
  isInput: boolean;
  gridPos: { row: number, col: number };
  arrow?: 'up' | 'down' | 'left' | 'right';
}

const MathMazeGame: React.FC = () => {
    const [path, setPath] = useState<MazeNode[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [checked, setChecked] = useState(false);

    const generatePath = useCallback(() => {
        const newPath: MazeNode[] = [];
        let currentValue = getRandomInt(3, 10);
        
        // This is a fixed path structure for simplicity
        const structure = [
            { pos: {row: 1, col: 1}, arrow: 'right'},
            { pos: {row: 1, col: 2}, arrow: 'down'},
            { pos: {row: 2, col: 2}, arrow: 'down'},
            { pos: {row: 3, col: 2}, arrow: 'left'},
            { pos: {row: 3, col: 1}, arrow: 'down'},
            { pos: {row: 4, col: 1}, arrow: 'right'},
            { pos: {row: 4, col: 2}, arrow: 'right'},
            { pos: {row: 4, col: 3}, arrow: 'up'},
            { pos: {row: 3, col: 3}, arrow: 'up'},
            { pos: {row: 2, col: 3}, arrow: 'right'},
            // FIX: Changed `arrow: null` to an omitted property to make its type `undefined`, which is compatible with the `MazeNode` interface. This resolves the type errors.
            { pos: {row: 2, col: 4} },
        ];
        
        newPath.push({ value: currentValue, isInput: false, op: '', gridPos: structure[0].pos, arrow: structure[0].arrow });

        for (let i = 0; i < structure.length - 1; i++) {
            const add = Math.random() > 0.5;
            const amount = getRandomInt(1, 9);
            const op = `${add ? '+' : '-'} ${amount}`;
            
            if(add) currentValue += amount;
            else currentValue = Math.max(0, currentValue - amount);
            
            newPath.push({ value: currentValue, isInput: true, op: op, gridPos: structure[i+1].pos, arrow: structure[i+1].arrow });
        }
        
        setPath(newPath);
        setUserAnswers({});
        setChecked(false);
    }, []);

    useEffect(() => {
        generatePath();
    }, [generatePath]);

    const handleInputChange = (index: number, value: string) => {
        setUserAnswers(prev => ({...prev, [index]: value.replace(/[^0-9]/g, '')}));
        setChecked(false);
    }

    const getStatus = (index: number, answer: number) => {
        if (!checked) return '';
        return parseInt(userAnswers[index], 10) === answer ? 'correct' : 'incorrect';
    };

    return (
    <>
      <div className="math-maze">
        {path.map((node, index) => (
            <div key={index} className="maze-cell" style={{ gridArea: `${node.gridPos.row} / ${node.gridPos.col}`}}>
                <div className={`maze-square ${index === 0 ? 'start' : ''} ${index === path.length - 1 ? 'end' : ''}`}>
                    {node.isInput ? (
                       <input 
                         type="text" 
                         className={`maze-input ${getStatus(index, node.value!)}`}
                         value={userAnswers[index] || ''}
                         onChange={(e) => handleInputChange(index, e.target.value)}
                         readOnly={index === path.length - 1}
                         aria-label={`Maze input at position ${index}`}
                        />
                    ) : (
                        node.value
                    )}
                </div>
                {path[index - 1] && <div className={`maze-op op-${path[index-1].arrow}`}>{node.op}</div>}
                {node.arrow && <div className={`maze-arrow arrow-${node.arrow}`}></div>}
            </div>
        ))}
      </div>
      <div className="controls">
        <button className="btn btn-generate" onClick={generatePath}>Tạo trò chơi mới</button>
        <button className="btn btn-check" onClick={() => setChecked(true)}>Kiểm tra kết quả</button>
      </div>
    </>
  );
}


// --- MAIN APP ---
const App: React.FC = () => {
  const [game, setGame] = useState<GameType>('sum-it-up');

  // FIX: Replaced `JSX.Element` with `React.ReactElement` to resolve the "Cannot find namespace 'JSX'" error.
  const games: { id: GameType; name: string; component: React.ReactElement }[] = [
    { id: 'sum-it-up', name: 'Cộng số', component: <SumItUpGame /> },
    { id: 'equation-match', name: 'Nối phép tính', component: <MatchingGame type="equation"/> },
    { id: 'object-match', name: 'Nối bóng', component: <MatchingGame type="object"/> },
    { id: 'calculation-path', name: 'Mê cung toán học', component: <MathMazeGame /> },
  ];

  const CurrentGame = games.find(g => g.id === game)?.component;

  return (
    <>
      <h1>Bộ trò chơi trí tuệ cho bé</h1>
      <div className="game-switcher">
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
      <div className="game-container">
        {CurrentGame}
      </div>
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
