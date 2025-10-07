import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, getRandomInt } from '../utils';

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

const MeCungToanHocGame = forwardRef<GameComponentHandles>((props, ref) => {
    const [nodes, setNodes] = useState<MazeNode[]>([]);
    const [connections, setConnections] = useState<MazeConnection[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const mazeContainerRef = useRef<HTMLDivElement>(null);
    const NODE_WIDTH = 60;
    const NODE_HEIGHT = 60;

    const generateMaze = useCallback(() => {
        const simpleMazeLayout = [
            { pos: { x: 170, y: 20 } }, { pos: { x: 320, y: 20 } },
            { pos: { x: 320, y: 120 } }, { pos: { x: 170, y: 220 } },
            { pos: { x: 170, y: 320 } }, { pos: { x: 170, y: 420 } },
            { pos: { x: 320, y: 420 } }, { pos: { x: 320, y: 520 } },
            { pos: { x: 170, y: 620 } }, { pos: { x: 320, y: 620 } },
        ];
        
        const complexMazeLayout = [
          { pos: { x: 20, y: 20 } }, { pos: { x: 170, y: 20 } }, { pos: { x: 170, y: 120 } },
          { pos: { x: 20, y: 220 } }, { pos: { x: 20, y: 320 } }, { pos: { x: 20, y: 420 } },
          { pos: { x: 170, y: 420 } }, { pos: { x: 170, y: 520 } }, { pos: { x: 20, y: 620 } },
          { pos: { x: 170, y: 620 } }, { pos: { x: 320, y: 620 } }, { pos: { x: 320, y: 520 } },
          { pos: { x: 320, y: 420 } }, { pos: { x: 470, y: 420 } }, { pos: { x: 320, y: 320 } },
          { pos: { x: 320, y: 220 } }, { pos: { x: 470, y: 120 } }, { pos: { x: 470, y: 20 } },
          { pos: { x: 620, y: 20 } }, { pos: { x: 620, y: 120 } }, { pos: { x: 620, y: 220 } },
          { pos: { x: 620, y: 320 } }, { pos: { x: 620, y: 420 } }, { pos: { x: 620, y: 520 } },
          { pos: { x: 470, y: 620 } }, { pos: { x: 620, y: 620 } },
        ];
        
        const structure = Math.random() > 0.5 ? complexMazeLayout : simpleMazeLayout;

        const newNodes: MazeNode[] = [];
        const newConnections: MazeConnection[] = [];
        let currentValue = getRandomInt(5, 15);
        
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

    useImperativeHandle(ref, () => ({
      generateNew: generateMaze,
      exportPdf: () => {
          const mazeElement = mazeContainerRef.current;
          if (!mazeElement) return;
  
          const printContainer = document.createElement('div');
          printContainer.classList.add('pdf-print-container');
  
          const mazeClone = mazeElement.cloneNode(true) as HTMLElement;
          const inputs = mazeClone.querySelectorAll('input');
          inputs.forEach(input => {
              input.value = '';
          });

          // Calculate the actual bounds of the maze content
          let computedWidth = 0;
          let computedHeight = 0;
          if (nodes.length > 0) {
              let maxX = 0;
              let maxY = 0;
              nodes.forEach(node => {
                  maxX = Math.max(maxX, node.pos.x + NODE_WIDTH);
                  maxY = Math.max(maxY, node.pos.y + NODE_HEIGHT);
              });
              // Set size to fit content, overriding the fixed height from CSS
              computedWidth = maxX;
              computedHeight = maxY;
          }
          
          // Apply the calculated dimensions to the cloned maze element
          if (computedWidth > 0 && computedHeight > 0) {
              mazeClone.style.width = `${computedWidth}px`;
              mazeClone.style.height = `${computedHeight}px`;
          }

          printContainer.appendChild(mazeClone);
  
          document.body.appendChild(printContainer);
  
          html2canvas(printContainer, { scale: 2 }).then(canvas => {
              document.body.removeChild(printContainer);
  
              const imgData = canvas.toDataURL('image/png');
              const margin = 40; // points
              const pdfWidth = canvas.width + margin * 2;
              const pdfHeight = canvas.height + margin * 2;
              
              const pdf = new jsPDF({
                  orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                  unit: 'pt',
                  format: [pdfWidth, pdfHeight]
              });
              
              pdf.addImage(imgData, 'PNG', margin, margin, canvas.width, canvas.height);
              pdf.save('me-cung-toan-hoc.pdf');
          });
      }
    }));

    const handleInputChange = (id: number, value: string) => {
        setUserAnswers(prev => ({...prev, [id]: value.replace(/[^0-9]/g, '')}));
    }

    return (
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
                    {isStart && <div className="maze-label">Bắt đầu</div>}
                    {isEnd && <div className="maze-label end-label">Kết thúc</div>}
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
  );
});

export default MeCungToanHocGame;