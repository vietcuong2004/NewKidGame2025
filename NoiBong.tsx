import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, shuffleArray } from './utils';

// --- SVG Icon Components ---
type IconProps = { mode: 'outline' | 'filled' };

const LeafIcon: React.FC<IconProps> = ({ mode }) => (
  <svg viewBox="0 0 100 100">
    <path 
      d="M50 95 L50 70 M50 70 C 20 70, 20 30, 50 5 C 80 30, 80 70, 50 70" 
      fill={mode === 'filled' ? '#D32F2F' : 'none'} 
      stroke={mode === 'outline' ? '#000' : 'none'} 
      strokeWidth="4" 
      strokeLinejoin="round" 
      strokeLinecap="round" 
    />
  </svg>
);
const AcornIcon: React.FC<IconProps> = ({ mode }) => (
  <svg viewBox="0 0 100 100">
    <path 
      d="M30 45 L70 45 L70 55 Q 50 65, 30 55 L30 45 M30 55 C 30 85, 70 85, 70 55"
      fill={mode === 'filled' ? '#795548' : 'none'} 
      stroke={mode === 'outline' ? '#000' : 'none'} 
      strokeWidth="4" 
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <line x1="50" y1="45" x2="50" y2="25" stroke={mode === 'outline' ? '#000' : '#795548'} strokeWidth="4" strokeLinecap="round" />
  </svg>
);
const PumpkinIcon: React.FC<IconProps> = ({ mode }) => (
  <svg viewBox="0 0 100 100">
    <path 
      d="M20 60 C 20 90, 80 90, 80 60 C 80 30, 20 30, 20 60 M50 30 C 40 50, 40 70, 50 90 M50 30 C 60 50, 60 70, 50 90"
      fill={mode === 'filled' ? '#F57C00' : 'none'} 
      stroke={mode === 'outline' ? '#000' : 'none'} 
      strokeWidth="4" 
      strokeLinejoin="round" 
    />
  </svg>
);
const MushroomIcon: React.FC<IconProps> = ({ mode }) => (
  <svg viewBox="0 0 100 100">
    <path 
      d="M25 50 C 25 30, 75 30, 75 50 L 65 50 L 65 80 L 35 80 L 35 50 Z"
      fill={mode === 'filled' ? '#E57373' : 'none'} 
      stroke={mode === 'outline' ? '#000' : 'none'} 
      strokeWidth="4" 
      strokeLinejoin="round" 
    />
  </svg>
);
const HouseIcon: React.FC<IconProps> = ({ mode }) => (
  <svg viewBox="0 0 100 100">
    <path 
      d="M20 80 L 80 80 L 80 50 L 50 20 L 20 50 Z M40 80 L 40 60 L 60 60 L 60 80"
      fill={mode === 'filled' ? '#8D6E63' : 'none'}
      stroke={mode === 'outline' ? '#000' : 'none'} 
      strokeWidth="4" 
      strokeLinejoin="round" 
    />
  </svg>
);


const ICONS: Record<string, React.FC<IconProps>> = {
  leaf: LeafIcon,
  acorn: AcornIcon,
  pumpkin: PumpkinIcon,
  mushroom: MushroomIcon,
  house: HouseIcon,
};
const iconKeys = Object.keys(ICONS);

interface MatchItem {
  id: string;
  iconId: string;
}

const NoiBongGame = forwardRef<GameComponentHandles>((props, ref) => {
  const [leftItems, setLeftItems] = useState<MatchItem[]>([]);
  const [rightItems, setRightItems] = useState<MatchItem[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<MatchItem | null>(null);
  const [connections, setConnections] = useState<Record<string, string>>({});
  
  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContentRef = useRef<HTMLDivElement>(null);

  const generateItems = useCallback(() => {
    const chosenIcons = shuffleArray(iconKeys).slice(0, 5);
    
    const newLeftItems = chosenIcons.map((iconId, i) => ({ id: `l-${i}`, iconId }));
    const newRightItems = shuffleArray(chosenIcons).map((iconId, i) => ({ id: `r-${i}`, iconId }));
    
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
      const container = gameContentRef.current;
      if (!canvas || !container) return;
      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'var(--primary-color)';
      
      for(const leftId in connections) {
          const rightId = connections[leftId];
          const leftDotEl = dotRefs.current[leftId];
          const rightDotEl = dotRefs.current[rightId];
          if(leftDotEl && rightDotEl) {
              const rectL = leftDotEl.getBoundingClientRect();
              const rectR = rightDotEl.getBoundingClientRect();
              const rectCanvas = container.getBoundingClientRect();

              const startX = rectL.left + rectL.width / 2 - rectCanvas.left;
              const startY = rectL.top + rectL.height / 2 - rectCanvas.top;
              const endX = rectR.left + rectR.width / 2 - rectCanvas.left;
              const endY = rectR.top + rectR.height / 2 - rectCanvas.top;
              
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
            pdf.save("noi-bong.pdf");
      });
    }
  }));

  const handleLeftClick = (item: MatchItem) => {
    setSelectedLeft(item);
  }

  const handleRightClick = (item: MatchItem) => {
    if(selectedLeft) {
      if(selectedLeft.iconId === item.iconId) {
        setConnections(prev => ({...prev, [selectedLeft.id]: item.id}));
      }
      setSelectedLeft(null);
    }
  }

  const isSelected = (item: MatchItem) => selectedLeft?.id === item.id;
  
  const renderItem = (item: MatchItem, mode: 'outline' | 'filled', onClick: (item: MatchItem) => void) => {
    const IconComponent = ICONS[item.iconId];
    return (
      <div 
        key={item.id} 
        className={`match-item ${isSelected(item) ? 'selected' : ''}`}
        onClick={() => onClick(item)}
      >
        {IconComponent && <IconComponent mode={mode} />}
      </div>
    );
  };

  return (
    <div className="matching-game-container noi-bong-game" ref={gameContentRef}>
      <canvas ref={canvasRef} className="matching-canvas"></canvas>
      <div className="matching-column">
        {leftItems.map(item => (
            <div key={item.id} className="match-row">
                {renderItem(item, 'outline', handleLeftClick)}
                <div ref={el => { dotRefs.current[item.id] = el; }} className="connection-dot"></div>
            </div>
        ))}
      </div>
      <div className="separator-line-container">
        <div className="separator-line"></div>
      </div>
      <div className="matching-column">
        {rightItems.map(item => (
          <div key={item.id} className="match-row">
            <div ref={el => { dotRefs.current[item.id] = el; }} className="connection-dot"></div>
            {renderItem(item, 'filled', handleRightClick)}
          </div>
        ))}
      </div>
    </div>
  )
});

export default NoiBongGame;