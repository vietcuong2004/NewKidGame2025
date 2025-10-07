import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, getRandomInt, shuffleArray } from '../utils';

interface MatchItem {
  id: string;
  content: string;
  matchId: string;
}

const NoiPhepTinhGame = forwardRef<GameComponentHandles>((props, ref) => {
  const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
  const [rightItems, setRightItems] = useState<MatchItem[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<MatchItem | null>(null);
  const [connections, setConnections] = useState<Record<string, string>>({});
  
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContentRef = useRef<HTMLDivElement>(null);

  const generateItems = useCallback(() => {
    const baseItems: Omit<MatchItem, 'id'>[] = Array.from({ length: 5 }, () => {
        const a = getRandomInt(0, 5);
        const b = getRandomInt(1, 5);
        return { content: `${a} + ${b}`, matchId: `${a + b}` };
    });
    
    const newLeftItems = baseItems.map((item, i) => ({ ...item, id: `l-${i}`}));
    const newRightItems = shuffleArray(baseItems.map((item, i) => ({ id: `r-${i}`, content: item.matchId, matchId: item.content })));
    setLeftItems(newLeftItems);
    setRightItems(newRightItems);
    setConnections({});
    setSelectedLeft(null);
  }, []);
  
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

  useImperativeHandle(ref, () => ({
    generateNew: generateItems,
    exportPdf: () => {
      const gameElement = gameContentRef.current;
      if (!gameElement) return;
        
      const printContainer = document.createElement('div');
      printContainer.classList.add('pdf-print-container');
      
      const gameClone = gameElement.cloneNode(true) as HTMLElement;
      gameClone.style.width = `${gameElement.scrollWidth}px`; // Ensure content width is fixed for PDF generation
      const canvasToHide = gameClone.querySelector('.matching-canvas');
      if (canvasToHide) {
          canvasToHide.remove();
      }

      printContainer.appendChild(gameClone);
      document.body.appendChild(printContainer);
  
      html2canvas(printContainer, { scale: 2 }).then(canvasImg => {
            document.body.removeChild(printContainer);

            const imgData = canvasImg.toDataURL('image/png');
            const margin = 40;
            const pdfWidth = canvasImg.width + margin * 2;
            const pdfHeight = canvasImg.height + margin * 2;

            const pdf = new jsPDF({
              orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
              unit: 'pt',
              format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'PNG', margin, margin, canvasImg.width, canvasImg.height);
            pdf.save("noi-phep-tinh.pdf");
      });
    }
  }));

  const handleLeftClick = (item: MatchItem) => {
    setSelectedLeft(item);
  }

  const handleRightClick = (item: MatchItem) => {
    if(selectedLeft) {
      setConnections(prev => ({...prev, [selectedLeft.id]: item.id}));
      setSelectedLeft(null);
    }
  }

  const isSelected = (item: MatchItem) => selectedLeft?.id === item.id;
  const itemClassName = (item: MatchItem) => `match-item ${isSelected(item) ? 'selected' : ''}`;

  return (
    <div className="matching-game-container" ref={gameContentRef}>
      <canvas ref={canvasRef} className="matching-canvas"></canvas>
      <div className="matching-column">
        {leftItems.map(item => (
          <div key={item.id} ref={el => { itemRefs.current[item.id] = el; }} className={itemClassName(item)} onClick={() => handleLeftClick(item)}>
            {item.content}
          </div>
        ))}
      </div>
      <div className="matching-column">
        {rightItems.map(item => (
           <div key={item.id} ref={el => { itemRefs.current[item.id] = el; }} className={itemClassName(item)} onClick={() => handleRightClick(item)}>
            {item.content}
          </div>
        ))}
      </div>
    </div>
  )
});

export default NoiPhepTinhGame;