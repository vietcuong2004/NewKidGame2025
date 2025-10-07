import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, shuffleArray } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";
import '../Styles/NoiSo.css';

interface LeftItem {
  id: string;
  svg: string;
  count: number;
}
interface RightItem {
  id: string;
  count: number;
}

// Gemini response schema
const responseSchema = {
    type: Type.ARRAY,
    description: "A list of 5 pairs for the matching game.",
    items: {
        type: Type.OBJECT,
        properties: {
            svg: {
                type: Type.STRING,
                description: "An inline SVG string (viewBox='0 0 100 100') showing 1 to 9 objects based on the theme. The objects should be simple, clear, and easy for a child to count."
            },
            count: {
                type: Type.INTEGER,
                description: "The number of objects (1-9) depicted in the SVG."
            }
        },
        required: ["svg", "count"]
    }
};

// Default data for fallback
const defaultGameData = [
  { svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="15" fill="#e74c3c"/></svg>', count: 1 },
  { svg: '<svg viewBox="0 0 100 100"><rect x="20" y="35" width="30" height="30" fill="#3498db"/><rect x="55" y="35" width="30" height="30" fill="#3498db"/></svg>', count: 2 },
  { svg: '<svg viewBox="0 0 100 100"><polygon points="50,15 85,50 50,85 15,50" fill="#f1c40f"/><polygon points="15,15 45,15 45,45 15,45" fill="#f1c40f"/><polygon points="55,55 85,55 85,85 55,85" fill="#f1c40f"/></svg>', count: 3 },
  { svg: '<svg viewBox="0 0 100 100"><path d="M50 20 L60 40 L80 40 L65 55 L70 75 L50 65 L30 75 L35 55 L20 40 L40 40 Z" fill="#2ecc71"/><path d="M20 70 L30 90 L10 90 Z" fill="#2ecc71"/><path d="M80 70 L90 90 L70 90 Z" fill="#2ecc71"/><path d="M50 80 L60 95 L40 95 Z" fill="#2ecc71"/></svg>', count: 4 },
  { svg: '<svg viewBox="0 0 100 100"><circle cx="25" cy="25" r="10" fill="#9b59b6"/><circle cx="75" cy="25" r="10" fill="#9b59b6"/><circle cx="50" cy="50" r="10" fill="#9b59b6"/><circle cx="25" cy="75" r="10" fill="#9b59b6"/><circle cx="75" cy="75" r="10" fill="#9b59b6"/></svg>', count: 5 }
];


const NoiSoGame = forwardRef<GameComponentHandles>((props, ref) => {
  const [theme, setTheme] = useState('đơn giản');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leftItems, setLeftItems] = useState<LeftItem[]>([]);
  const [rightItems, setRightItems] = useState<RightItem[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<LeftItem | null>(null);
  const [connections, setConnections] = useState<Record<string, string>>({});
  
  const dotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContentRef = useRef<HTMLDivElement>(null);

  const loadDefaultData = useCallback(() => {
    console.warn("API Error/Limit. Loading default data.");
    const baseItems = shuffleArray(defaultGameData);
    const newLeftItems = baseItems.map((item, i) => ({ id: `l-${i}`, ...item }));
    const newRightItems = shuffleArray(baseItems.map((item, i) => ({ id: `r-${i}`, count: item.count })));

    setLeftItems(newLeftItems);
    setRightItems(newRightItems);
    setConnections({});
    setSelectedLeft(null);
    setError(null);
  }, []);

  const generateNew = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    if (!theme.trim()) {
      setError("Vui lòng nhập chủ đề.");
      setIsLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Create data for a number matching game for a child (age 3-5). The theme is "${theme}".
        - Generate a list of 5 pairs.
        - Each pair must contain:
          1. An 'svg': An inline SVG string (viewBox='0 0 100 100') showing a number of objects (from 1 to 9). The number of objects for each of the 5 pairs must be unique. The SVG should be simple, colorful, and the objects easy to count.
          2. A 'count': The integer number of objects shown in the SVG.
        - Return the output as a single JSON array that strictly follows the provided schema. Do not include any text or markdown formatting.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const data = JSON.parse(response.text.trim());
      if (!Array.isArray(data) || data.length < 5) {
        throw new Error("Dữ liệu từ AI không hợp lệ.");
      }
      
      const newLeftItems = data.map((item: any, i: number) => ({ id: `l-${i}`, svg: item.svg, count: item.count }));
      const newRightItems = shuffleArray(data.map((item: any, i: number) => ({ id: `r-${i}`, count: item.count })));

      setLeftItems(newLeftItems);
      setRightItems(newRightItems);
      setConnections({});
      setSelectedLeft(null);

    } catch(e) {
        console.error("Error generating game:", e);
        let errorMessage = "Lỗi không xác định. Đang tải dữ liệu mặc định.";
        if (e instanceof Error) {
            errorMessage = e.message.includes("429") || e.message.toUpperCase().includes("RESOURCE_EXHAUSTED")
                ? "Lượt truy cập API đã hết. Đang tải dữ liệu mặc định."
                : errorMessage;
        }
        setError(errorMessage);
        loadDefaultData();
    } finally {
        setIsLoading(false);
    }
  }, [theme, loadDefaultData]);
  
  useEffect(() => {
    generateNew();
  }, []); // Generate on initial load
  
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
    generateNew,
    exportPdf: () => {
      const gameElement = gameContentRef.current;
      if (!gameElement) return;
        
      const printContainer = document.createElement('div');
      printContainer.classList.add('pdf-print-container');
      
      const gameClone = gameElement.cloneNode(true) as HTMLElement;
      gameClone.style.width = `${gameElement.scrollWidth}px`; 
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
            pdf.save("noi-so.pdf");
      });
    }
  }));

  const handleLeftClick = (item: LeftItem) => {
    setSelectedLeft(item);
  }

  const handleRightClick = (item: RightItem) => {
    if(selectedLeft) {
      if(selectedLeft.count === item.count) {
        setConnections(prev => ({...prev, [selectedLeft.id]: item.id}));
      }
      setSelectedLeft(null);
    }
  }

  const isSelected = (item: LeftItem | RightItem) => selectedLeft?.id === item.id;

  return (
    <div className="game-wrapper noi-so-wrapper">
        <div className="game-controls">
            <label htmlFor="theme-input">Chủ đề:</label>
            <input
                id="theme-input"
                type="text"
                className="theme-input"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="ví dụ: trái cây, động vật"
                disabled={isLoading}
            />
        </div>
        
        {isLoading && <div className="game-loader">Đang tạo trò chơi với chủ đề "{theme}"...</div>}
        {error && !isLoading && <div className="game-error">{error}</div>}

        {!isLoading && (
            <div className="matching-game-container noi-so-game" ref={gameContentRef}>
                <canvas ref={canvasRef} className="matching-canvas"></canvas>
                <div className="matching-column left-column">
                    {leftItems.map(item => (
                        <div key={item.id} className="match-row">
                            <div 
                                className={`match-item ${isSelected(item) ? 'selected' : ''}`}
                                onClick={() => handleLeftClick(item)}
                                dangerouslySetInnerHTML={{ __html: item.svg }}
                            />
                            <div ref={el => { dotRefs.current[item.id] = el; }} className="connection-dot"></div>
                        </div>
                    ))}
                </div>
                <div className="separator-line"></div>
                <div className="matching-column right-column">
                    {rightItems.map(item => (
                    <div key={item.id} className="match-row">
                        <div ref={el => { dotRefs.current[item.id] = el; }} className="connection-dot"></div>
                         <div 
                            className={`match-item number-item ${isSelected(item) ? 'selected' : ''}`}
                            onClick={() => handleRightClick(item)}
                         >
                             {item.count}
                         </div>
                    </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  )
});

export default NoiSoGame;