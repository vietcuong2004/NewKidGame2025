import React, { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, shuffleArray } from './utils';

// --- L-Shape Puzzle Piece Components ---
const LPiece1: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
  <path d="M0 50 V0 H50 C50 25 75 25 75 50 H50 C25 50 25 75 0 75 V50" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);
const LPiece2: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
  <path d="M50 0 H100 V50 H75 C75 25 50 25 50 0" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);
const LPiece3: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
  <path d="M100 50 V100 H50 C50 75 25 75 25 50 H50 C75 50 75 25 100 25 V50" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);
const LPiece4: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
  <path d="M50 100 H0 V50 H25 C25 75 50 75 50 100" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);
const LPiece5: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
  <path d="M50 50 C25 50 25 25 0 25 V50 H50 M50 50 C75 50 75 25 100 25 V50 H50 M50 50 C75 50 75 75 100 75 V50 H50 M50 50 C25 50 25 75 0 75 V50 H50" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);

// --- Square Puzzle Piece Components ---
const SquarePiece1: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
    <path d="M0 0 H50 C40 25 60 25 50 50 H0Z" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);
const SquarePiece2: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
    <path d="M50 0 H100 V50 H50 C60 25 40 25 50 0Z" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);
const SquarePiece3: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
    <path d="M0 50 H50 C60 75 40 75 50 100 H0Z" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);
const SquarePiece4: React.FC<{ color: string; onClick: () => void }> = ({ color, onClick }) => (
    <path d="M50 50 H100 V100 H50 C40 75 60 75 50 50Z" fill={color} stroke="#333" strokeWidth="2" onClick={onClick} className="puzzle-piece" />
);


interface PuzzleState {
  id: number;
  palette: string[];
  pieceColors: string[];
}

interface PuzzleTemplate {
    id: string;
    pieces: React.FC<{ color: string; onClick: () => void }>[];
    colors: string[];
    viewBox: string;
}

const puzzleTemplates: PuzzleTemplate[] = [
    {
        id: 'l-shape',
        pieces: [LPiece1, LPiece3, LPiece4, LPiece2, LPiece5],
        colors: ['#2ecc71', '#f1c40f', '#3498db', '#e74c3c', '#e84393'],
        viewBox: "-2 -2 104 104"
    },
    {
        id: 'square-shape',
        pieces: [SquarePiece1, SquarePiece2, SquarePiece3, SquarePiece4],
        colors: ['#e67e22', '#1abc9c', '#9b59b6', '#34495e'],
        viewBox: "-2 -2 104 104"
    }
];

const ToMauManhGhepGame = forwardRef<GameComponentHandles>((props, ref) => {
  const [currentTemplate, setCurrentTemplate] = useState<PuzzleTemplate>(puzzleTemplates[0]);
  const [referenceColors, setReferenceColors] = useState<string[]>([]);
  const [puzzles, setPuzzles] = useState<PuzzleState[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const gameContentRef = useRef<HTMLDivElement>(null);

  const generateNew = useCallback(() => {
    const template = puzzleTemplates[Math.floor(Math.random() * puzzleTemplates.length)];
    setCurrentTemplate(template);

    const shuffledColors = shuffleArray(template.colors);
    setReferenceColors(shuffledColors);

    const newPuzzles = Array.from({ length: 4 }, (_, i) => ({
      id: i,
      palette: shuffleArray(shuffledColors),
      pieceColors: Array(template.pieces.length).fill('white'),
    }));
    setPuzzles(newPuzzles);
    setSelectedColor(null);
  }, []);

  useEffect(() => {
    generateNew();
  }, [generateNew]);

  useImperativeHandle(ref, () => ({
    generateNew,
    exportPdf: () => {
      const gameElement = gameContentRef.current;
      if (!gameElement) return;

      const printContainer = document.createElement('div');
      printContainer.classList.add('pdf-print-container');
      
      const gameClone = gameElement.cloneNode(true) as HTMLElement;
      gameClone.style.width = `${gameElement.scrollWidth}px`;
      
      const selectedSwatch = gameClone.querySelector('.color-swatch.selected');
      selectedSwatch?.classList.remove('selected');

      printContainer.appendChild(gameClone);
      document.body.appendChild(printContainer);

      html2canvas(printContainer, { scale: 2 }).then(canvas => {
          document.body.removeChild(printContainer);

          const imgData = canvas.toDataURL('image/png');
          const margin = 40;
          const pdfWidth = canvas.width + margin * 2;
          const pdfHeight = canvas.height + margin * 2;
          
          const pdf = new jsPDF({
              orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
              unit: 'pt',
              format: [pdfWidth, pdfHeight]
          });
          
          pdf.addImage(imgData, 'PNG', margin, margin, canvas.width, canvas.height);
          pdf.save('to-mau-manh-ghep.pdf');
      });
    }
  }));

  const handlePieceClick = (puzzleId: number, pieceIndex: number) => {
    if (!selectedColor) return;
    setPuzzles(prevPuzzles => prevPuzzles.map(p => {
      if (p.id === puzzleId) {
        const newPieceColors = [...p.pieceColors];
        newPieceColors[pieceIndex] = selectedColor;
        return { ...p, pieceColors: newPieceColors };
      }
      return p;
    }));
  };

  const renderPuzzle = (template: PuzzleTemplate, colors: string[], isReference = false, puzzleId?: number) => (
    <svg viewBox={template.viewBox} className="puzzle-svg">
      {template.pieces.map((Piece, index) => (
        <Piece 
          key={index} 
          color={colors[index] || 'white'}
          onClick={() => isReference ? {} : handlePieceClick(puzzleId!, index)} 
        />
      ))}
    </svg>
  );

  return (
    <div className="color-puzzle-game" ref={gameContentRef}>
      <div className="reference-puzzle">
        {referenceColors.length > 0 && renderPuzzle(currentTemplate, referenceColors, true)}
      </div>
      <div className="puzzle-grid">
        {puzzles.map(puzzle => (
          <div key={puzzle.id} className="puzzle-instance">
            {renderPuzzle(currentTemplate, puzzle.pieceColors, false, puzzle.id)}
            <div className="color-palette">
              {puzzle.palette.map(color => (
                <div 
                  key={`${puzzle.id}-${color}`}
                  className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default ToMauManhGhepGame;