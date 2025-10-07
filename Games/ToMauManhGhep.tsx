import React, { useState, useCallback, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, shuffleArray } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";
import '../Styles/ToMauManhGhep.css';

interface PuzzleTemplate {
  pieces: string[]; // SVG path strings
  colors: string[]; // Hex color codes
  viewBox: string;
}

interface PuzzleState {
  id: number;
  palette: string[];
  pieceColors: string[];
}

// Gemini response schema definition
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        pieces: {
            type: Type.ARRAY,
            description: 'An array of 4-6 SVG path data strings (`d="..."`) that form a simple, interlocking geometric puzzle.',
            items: { type: Type.STRING },
        },
        colors: {
            type: Type.ARRAY,
            description: 'An array of hex color codes that are vibrant and child-friendly, matching the number of pieces.',
            items: { type: Type.STRING },
        },
        viewBox: {
            type: Type.STRING,
            description: 'The SVG viewBox string, typically "0 0 100 100".',
        },
    },
    required: ['pieces', 'colors', 'viewBox'],
};

// Default game data to use as a fallback for API errors
const defaultGameData: PuzzleTemplate = {
    pieces: [
        "M0 50 V0 H50 C50 25 75 25 75 50 H50 C25 50 25 75 0 75 V50",
        "M100 50 V100 H50 C50 75 25 75 25 50 H50 C75 50 75 25 100 25 V50",
        "M50 100 H0 V50 H25 C25 75 50 75 50 100",
        "M50 0 H100 V50 H75 C75 25 50 25 50 0",
        "M50 50 C25 50 25 25 0 25 V50 H50 M50 50 C75 50 75 25 100 25 V50 H50 M50 50 C75 50 75 75 100 75 V50 H50 M50 50 C25 50 25 75 0 75 V50 H50"
    ],
    colors: ['#2ecc71', '#f1c40f', '#3498db', '#e74c3c', '#e84393'],
    viewBox: "-2 -2 104 104"
};

const ToMauManhGhepGame = forwardRef<GameComponentHandles>((props, ref) => {
  const [currentTemplate, setCurrentTemplate] = useState<PuzzleTemplate | null>(null);
  const [referenceColors, setReferenceColors] = useState<string[]>([]);
  const [puzzles, setPuzzles] = useState<PuzzleState[]>([]);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gameContentRef = useRef<HTMLDivElement>(null);

  const setupPuzzleState = useCallback((template: PuzzleTemplate) => {
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

  const loadDefaultData = useCallback(() => {
    console.warn("API Error/Limit. Loading a default puzzle.");
    setupPuzzleState(defaultGameData);
    setError(null);
  }, [setupPuzzleState]);

  const generateNew = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
          Create a visually appealing and intricate coloring puzzle for a child, similar to an abstract or stained-glass window pattern. The puzzle must fit perfectly within a square.

          ### Requirements:
          1.  **Design**: The puzzle should be composed of 5 to 7 interlocking pieces formed by a combination of smooth, curved lines and straight lines that divide a 100x100 SVG canvas. The overall pattern should be abstract and artistic.
          2.  **Completeness**: All pieces must fit together perfectly to fill the entire 100x100 square without any gaps or overlaps. The outer boundary of the combined puzzle pieces must form a perfect square from (0,0) to (100,100).
          3.  **SVG Paths**: Generate an array of SVG path data strings for the 'pieces'. Each string must be a valid 'd' attribute for an SVG \`<path>\` element.
          4.  **Colors**: Generate an array of vibrant, contrasting, and child-friendly hex color codes for the 'colors', with exactly one color for each piece.
          5.  **ViewBox**: Provide a 'viewBox' string, which must be "0 0 100 100".

          ### Output Format (Strict JSON):
          Return the entire output as a single JSON object that strictly follows the provided schema. Do not include any text, markdown, or explanations outside of the JSON object.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.9,
            },
        });

        const data = JSON.parse(response.text.trim()) as PuzzleTemplate;
        if (!data.pieces || !data.colors || data.pieces.length !== data.colors.length) {
            throw new Error("Invalid data structure from AI.");
        }
        setupPuzzleState(data);

    } catch(e) {
        console.error("Error generating puzzle:", e);
        let errorMessage = "Đã xảy ra lỗi khi tạo câu đố.";
         if (e instanceof Error) {
            errorMessage = e.message.includes("429") || e.message.toUpperCase().includes("RESOURCE_EXHAUSTED")
                ? "Lượt truy cập API đã hết. Đang tải câu đố mặc định."
                : errorMessage;
        }
        setError(errorMessage);
        loadDefaultData();
    } finally {
        setIsLoading(false);
    }
  }, [loadDefaultData, setupPuzzleState]);

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
      {template.pieces.map((pathData, index) => (
        <path 
          key={index}
          d={pathData}
          fill={colors[index] || 'white'}
          stroke="#333"
          strokeWidth="2"
          onClick={() => isReference ? {} : handlePieceClick(puzzleId!, index)}
          className="puzzle-piece"
        />
      ))}
    </svg>
  );

  if (isLoading) {
    return <div className="puzzle-loader">Đang tạo mảnh ghép mới...</div>;
  }
  
  if (error && !currentTemplate) {
    return <div className="puzzle-error">{error}</div>;
  }
  
  if (!currentTemplate) {
    return null;
  }

  return (
    <div className="color-puzzle-game" ref={gameContentRef}>
      {error && <div className="puzzle-error" style={{marginBottom: '10px'}}>{error}</div>}
      <div className="reference-puzzle">
        {renderPuzzle(currentTemplate, referenceColors, true)}
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
                  aria-label={`Select color ${color}`}
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
