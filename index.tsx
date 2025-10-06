import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  const gameContentRef = useRef<HTMLDivElement>(null);

  const generateProblems = useCallback(() => {
    const newProblems: SumProblem[] = Array.from({ length: 6 }, (_, i) => {
      const numCount = getRandomInt(2, 3);
      const numbers = Array.from({ length: numCount }, () => getRandomInt(0, 9));
      const answer = numbers.reduce((sum, num) => sum + num, 0);
      return { id: i, numbers, answer };
    });
    setProblems(newProblems);
    setUserAnswers({});
  }, []);

  useEffect(() => {
    generateProblems();
  }, [generateProblems]);

  const handleInputChange = (id: number, value: string) => {
    setUserAnswers(prev => ({ ...prev, [id]: value.replace(/[^0-9]/g, '') }));
  };

  const handleExportPdf = () => {
    if (gameContentRef.current) {
        html2canvas(gameContentRef.current).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF();
            const imgProps= pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save("cong-so.pdf");
        });
    }
  };

  return (
    <>
      <div className="sum-it-up-game" ref={gameContentRef}>
        {problems.map(p => (
          <div key={p.id} className="sum-item">
            <div className="sum-item-numbers">{p.numbers.join(' + ')}</div>
            <input
              type="text"
              className="sum-item-input"
              value={userAnswers[p.id] || ''}
              onChange={(e) => handleInputChange(p.id, e.target.value)}
              aria-label={`Answer for ${p.numbers.join(' + ')}`}
            />
          </div>
        ))}
      </div>
      <div className="controls">
        <button className="btn btn-generate" onClick={generateProblems}>Tạo trò chơi mới</button>
        <button className="btn btn-export" onClick={handleExportPdf}>Xuất file PDF</button>
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
  
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContentRef = useRef<HTMLDivElement>(null);

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
              
              ctx.strokeStyle = 'var(--primary-color)';
              
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
          }
      }
  }, [connections]);

  const handleLeftClick = (item: MatchItem) => {
    setSelectedLeft(item);
  }

  const handleRightClick = (item: MatchItem) => {
    if(selectedLeft) {
      setConnections(prev => ({...prev, [selectedLeft.id]: item.id}));
      setSelectedLeft(null);
    }
  }
  
  const handleExportPdf = () => {
    const gameElement = gameContentRef.current;
    if (gameElement) {
        // Hide the canvas with lines before taking screenshot for a clean worksheet
        const canvas = canvasRef.current;
        if (canvas) canvas.style.display = 'none';

        html2canvas(gameElement).then(canvasImg => {
            if (canvas) canvas.style.display = 'block'; // Show it again after capture

            const imgData = canvasImg.toDataURL('image/png');
            const pdf = new jsPDF();
            const imgProps= pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(type === 'equation' ? "noi-phep-tinh.pdf" : "noi-bong.pdf");
        });
    }
  };

  const isSelected = (item: MatchItem) => selectedLeft?.id === item.id;
  const itemClassName = (item: MatchItem) => `match-item ${type === 'object' ? 'object-match-item': ''} ${isSelected(item) ? 'selected' : ''}`;

  return (
    <>
      <div className="matching-game-container" ref={gameContentRef}>
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
        <button className="btn btn-export" onClick={handleExportPdf}>Xuất file PDF</button>
      </div>
    </>
  )
};


// --- MATH MAZE GAME ---
interface MazeNode {
  id: number;
  value: number;
  isInput: boolean;
  pos: { x: number; y: number };
}

interface MazeConnection {
    from: MazeNode;
    to: MazeNode;
    op: string;
}

const MathMazeGame: React.FC = () => {
    const [nodes, setNodes] = useState<MazeNode[]>([]);
    const [connections, setConnections] = useState<MazeConnection[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const mazeContainerRef = useRef<HTMLDivElement>(null);

    const generateMaze = useCallback(() => {
        const newNodes: MazeNode[] = [];
        const newConnections: MazeConnection[] = [];
        let currentValue = getRandomInt(5, 15);
        
        const structure = [
          { pos: { x: 20, y: 20 } },    // 0
          { pos: { x: 170, y: 20 } },   // 1
          { pos: { x: 170, y: 120 } },  // 2
          { pos: { x: 20, y: 220 } },   // 3
          { pos: { x: 20, y: 320 } },   // 4
          { pos: { x: 20, y: 420 } },   // 5
          { pos: { x: 170, y: 420 } },  // 6
          { pos: { x: 170, y: 520 } },  // 7
          { pos: { x: 20, y: 620 } },   // 8
          { pos: { x: 170, y: 620 } },  // 9
          { pos: { x: 320, y: 620 } },  // 10
          { pos: { x: 320, y: 520 } },  // 11
          { pos: { x: 320, y: 420 } },  // 12
          { pos: { x: 470, y: 420 } },  // 13
          { pos: { x: 320, y: 320 } },  // 14
          { pos: { x: 320, y: 220 } },  // 15
          { pos: { x: 470, y: 120 } },  // 16
          { pos: { x: 470, y: 20 } },   // 17
          { pos: { x: 620, y: 20 } },   // 18
          { pos: { x: 620, y: 120 } },  // 19
          { pos: { x: 620, y: 220 } },  // 20
          { pos: { x: 620, y: 320 } },  // 21
          { pos: { x: 620, y: 420 } },  // 22
          { pos: { x: 620, y: 520 } },  // 23
          { pos: { x: 470, y: 620 } },  // 24
          { pos: { x: 620, y: 620 } },  // 25
        ];
        
        let prevNode: MazeNode = { id: 0, value: currentValue, isInput: false, pos: structure[0].pos };
        newNodes.push(prevNode);

        for (let i = 1; i < structure.length; i++) {
            const isEndNode = i === structure.length - 1;
            const add = Math.random() > 0.5;
            const amount = getRandomInt(1, 9);
            const op = `${add ? '+' : '-'}${amount}`;

            if (add) {
                currentValue += amount;
            } else {
                currentValue = Math.max(0, currentValue - amount);
            }

            const currentNode: MazeNode = {
                id: i,
                value: currentValue,
                isInput: !isEndNode,
                pos: structure[i].pos
            };
            newNodes.push(currentNode);
            newConnections.push({ from: prevNode, to: currentNode, op });
            prevNode = currentNode;
        }

        setNodes(newNodes);
        setConnections(newConnections);
        setUserAnswers({});
    }, []);

    useEffect(() => {
        generateMaze();
    }, [generateMaze]);

    const handleInputChange = (id: number, value: string) => {
        setUserAnswers(prev => ({...prev, [id]: value.replace(/[^0-9]/g, '')}));
    }

    const handleExportPdf = () => {
        const mazeElement = mazeContainerRef.current;
        if (!mazeElement) return;

        // Create a container for printing that matches the desired PDF look
        const printContainer = document.createElement('div');
        printContainer.classList.add('pdf-print-container');

        // Clone the maze element to avoid altering the live DOM
        const mazeClone = mazeElement.cloneNode(true) as HTMLElement;
        // Find and clear all input fields in the clone for the worksheet
        const inputs = mazeClone.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
        });
        printContainer.appendChild(mazeClone);

        // Create and add the title button
        const titleElement = document.createElement('div');
        titleElement.classList.add('pdf-title-button');
        titleElement.innerText = 'Mê Cung Toán Học';
        printContainer.appendChild(titleElement);

        // Add to body off-screen to render for html2canvas
        document.body.appendChild(printContainer);

        html2canvas(printContainer, { scale: 2 }).then(canvas => {
            document.body.removeChild(printContainer); // Clean up

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait' });
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            // Maintain aspect ratio, add some margin
            const margin = 15;
            const usableWidth = pdfWidth - margin * 2;
            const usableHeight = (imgProps.height * usableWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', margin, margin, usableWidth, usableHeight);
            pdf.save('me-cung-toan-hoc.pdf');
        });
    };

    const NODE_WIDTH = 60;
    const NODE_HEIGHT = 60;

    return (
    <>
      <div className="math-maze" ref={mazeContainerRef}>
        <svg width="100%" height="100%">
            {connections.map((conn, index) => {
                const fromCenter = { x: conn.from.pos.x + NODE_WIDTH / 2, y: conn.from.pos.y + NODE_HEIGHT / 2 };
                const toCenter = { x: conn.to.pos.x + NODE_WIDTH / 2, y: conn.to.pos.y + NODE_HEIGHT / 2 };
                
                const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
                
                const arrowLength = 30;
                const arrowWidth = 30;
                
                const arrowTipOffset = NODE_WIDTH / 2 + 3;
                const p1 = {
                    x: toCenter.x - arrowTipOffset * Math.cos(angle),
                    y: toCenter.y - arrowTipOffset * Math.sin(angle)
                };

                const base = {
                    x: p1.x - arrowLength * Math.cos(angle),
                    y: p1.y - arrowLength * Math.sin(angle)
                };

                const p2 = {
                    x: base.x + arrowWidth / 2 * Math.sin(angle),
                    y: base.y - arrowWidth / 2 * Math.cos(angle)
                };
                const p3 = {
                    x: base.x - arrowWidth / 2 * Math.sin(angle),
                    y: base.y + arrowWidth / 2 * Math.cos(angle)
                };
                
                const textX = (p1.x + p2.x + p3.x) / 3;
                const textY = (p1.y + p2.y + p3.y) / 3;
                
                return (
                    <g key={index}>
                        <line x1={fromCenter.x} y1={fromCenter.y} x2={base.x} y2={base.y} className="maze-connector-line" />
                        <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} className="maze-arrowhead" />
                        <text x={textX} y={textY} className="maze-connector-text">{conn.op}</text>
                    </g>
                );
            })}
        </svg>
        {nodes.map((node) => {
            const isStart = node.id === 0;
            const isEnd = node.id === nodes.length - 1;
            return (
                <div key={node.id} className="maze-node" style={{ left: `${node.pos.x}px`, top: `${node.pos.y}px`, width: `${NODE_WIDTH}px`, height: `${NODE_HEIGHT}px` }}>
                    {isStart && <div className="maze-label">🏁 Bắt đầu</div>}
                    {isEnd && <div className="maze-label">🏁 Kết thúc</div>}
                     <div className={`maze-square ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''}`}>
                        {node.isInput ? (
                           <input 
                             type="text" 
                             className="maze-input"
                             value={userAnswers[node.id] || ''}
                             onChange={(e) => handleInputChange(node.id, e.target.value)}
                             aria-label={`Maze input at position ${node.id}`}
                            />
                        ) : (
                            node.value
                        )}
                    </div>
                </div>
            );
        })}
      </div>
      <div className="controls">
        <button className="btn btn-generate" onClick={generateMaze}>Tạo trò chơi mới</button>
        <button className="btn btn-export" onClick={handleExportPdf}>Xuất file PDF</button>
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