import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";
import '../Styles/MaHoaPhepTinh.css';

// Data structures for the game
interface LegendItem {
  icon: string; // The emoji character
  value: number;
}

interface SymbolProblem {
    id: number;
    operand1: string;
    operand2: string;
    operator: '+' | '-';
    result: number;
}

// Fix: Define a type for game data to ensure operator is correctly typed as '+' or '-'.
// This resolves a TypeScript error and improves type safety for API responses.
interface GameData {
  iconMap: LegendItem[];
  problems: Omit<SymbolProblem, 'id'>[];
}

// Gemini response schema definition
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    iconMap: {
      type: Type.ARRAY,
      description: 'A map of 9 unique emojis to unique numbers from 1 to 9.',
      items: {
        type: Type.OBJECT,
        properties: {
          icon: { type: Type.STRING, description: 'A single, unique emoji character that fits the theme (e.g., "🐶", "🍎").' },
          value: { type: Type.INTEGER, description: 'The unique number assigned to the icon (from 1 to 9).' },
        },
        required: ['icon', 'value'],
      },
    },
    problems: {
      type: Type.ARRAY,
      description: 'A list of 12 simple math problems with a mix of addition and subtraction, using the emojis as operands.',
      items: {
        type: Type.OBJECT,
        properties: {
          operand1: { type: Type.STRING, description: 'The emoji character of the first operand.' },
          operand2: { type: Type.STRING, description: 'The emoji character of the second operand.' },
          operator: { type: Type.STRING, description: 'The operator, either "+" or "-".' },
          result: { type: Type.INTEGER, description: 'The correct result of the operation.' },
        },
        required: ['operand1', 'operand2', 'operator', 'result'],
      },
    },
  },
  required: ['iconMap', 'problems'],
};

// Default game data to use as a fallback for API errors
const defaultGameData: GameData = {
  iconMap: [
    { icon: '🐶', value: 1 }, { icon: '🐱', value: 2 }, { icon: '🐭', value: 3 },
    { icon: '🦊', value: 4 }, { icon: '🐻', value: 5 }, { icon: '🐼', value: 6 },
    { icon: '🐨', value: 7 }, { icon: '🐯', value: 8 }, { icon: '🦁', value: 9 },
  ],
  problems: [
    { operand1: '🐱', operand2: '🐶', operator: '+', result: 3 },
    { operand1: '🦁', operand2: '🦊', operator: '-', result: 5 },
    { operand1: '🐻', operand2: '🐭', operator: '+', result: 8 },
    { operand1: '🐯', operand2: '🐨', operator: '-', result: 1 },
    { operand1: '🐼', operand2: '🐱', operator: '+', result: 8 },
    { operand1: '🦊', operand2: '🐶', operator: '+', result: 5 },
    { operand1: '🐨', operand2: '🐻', operator: '-', result: 2 },
    { operand1: '🐭', operand2: '🐭', operator: '+', result: 6 },
    { operand1: '🦁', operand2: '🐯', operator: '-', result: 1 },
    { operand1: '🐼', operand2: '🦊', operator: '-', result: 2 },
    { operand1: '🐶', operand2: '🐨', operator: '+', result: 8 },
    { operand1: '🐯', operand2: '🐭', operator: '-', result: 5 },
  ]
};

const MaHoaPhepTinhGame = forwardRef<GameComponentHandles>((props, ref) => {
    const [theme, setTheme] = useState('động vật');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [legend, setLegend] = useState<LegendItem[]>([]);
    const [problems, setProblems] = useState<SymbolProblem[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const gameContentRef = useRef<HTMLDivElement>(null);
    const mainContentRef = useRef<HTMLDivElement>(null);

    const loadDefaultData = useCallback(() => {
        console.log("API limit reached or error occurred. Loading default animal theme.");
        setTheme('động vật');
        setLegend(defaultGameData.iconMap);
        setProblems(defaultGameData.problems.map((p, i) => ({ ...p, id: i })));
        setUserAnswers({});
        setError(null);
    }, []);

    const generateGame = useCallback(async () => {
        if (!theme.trim()) {
            setError("Vui lòng nhập chủ đề để tạo trò chơi.");
            return;
        }
        setIsLoading(true);
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const prompt = `
              Create a fun emoji math worksheet for a child aged 5-7. The theme is "${theme}".
              1. Generate a list of 9 unique, simple, and visually distinct emojis that fit the theme "${theme}".
              2. Assign a unique number from 1 to 9 to each emoji.
              3. Create a list of 12 simple math problems using the emojis as operands.
              4. The problems must be a mix of both addition (+) and subtraction (-). For subtraction, ensure the result is not negative.
              5. The 'icon' for each item must be a single emoji character (e.g., "🐶", "🍎").
              6. Return the entire output as a single JSON object that strictly follows the provided schema. Do not include any text or markdown formatting outside of the JSON object.
            `;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 1.0,
                },
            });

            const puzzleData = JSON.parse(response.text.trim()) as GameData;
             if (!puzzleData.iconMap || puzzleData.iconMap.length < 9 || !puzzleData.problems) {
                throw new Error("Cấu trúc dữ liệu nhận từ AI không hợp lệ. Vui lòng tạo lại.");
            }

            const newLegend: LegendItem[] = puzzleData.iconMap;
            const newProblems: SymbolProblem[] = puzzleData.problems.map((p, i: number) => ({ ...p, id: i }));

            setLegend(newLegend);
            setProblems(newProblems);
            setUserAnswers({});

        } catch (e) {
            console.error("Error generating game:", e);
            let errorMessage = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
            if (e instanceof Error) {
                errorMessage = e.message;
            }

            // Check for rate limit error and use fallback
            if (errorMessage.includes("429") || errorMessage.toUpperCase().includes("RESOURCE_EXHAUSTED")) {
                loadDefaultData();
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    }, [theme, loadDefaultData]);

    useEffect(() => {
        generateGame();
    }, []); // Run only on initial mount with default theme

    useImperativeHandle(ref, () => ({
        generateNew: generateGame,
        exportPdf: () => {
             const gameElement = mainContentRef.current;
             if (!gameElement) return;
 
             const printContainer = document.createElement('div');
             printContainer.classList.add('pdf-print-container');
             
             const gameClone = gameElement.cloneNode(true) as HTMLElement;
             gameClone.style.width = `${gameElement.scrollWidth}px`;
             const inputs = gameClone.querySelectorAll('input');
             inputs.forEach(input => { input.value = ''; });
 
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
                 pdf.save("ma-hoa-phep-tinh.pdf");
             });
        }
    }));

    const handleInputChange = (id: number, value: string) => {
        setUserAnswers(prev => ({ ...prev, [id]: value.replace(/[^0-9]/g, '') }));
    };

    return (
        <div className="symbol-math-game" ref={gameContentRef}>
            <div className="symbol-math-controls">
                <label htmlFor="theme-input" style={{fontWeight: '700'}}>Chủ đề ảnh:</label>
                <input
                    id="theme-input"
                    type="text"
                    className="theme-input"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="ví dụ: động vật, không gian, trái cây"
                    disabled={isLoading}
                    aria-label="Image theme input"
                />
            </div>
            <div ref={mainContentRef}>
                {isLoading ? (
                    <div className="symbol-math-loader">
                        <p>Đang tạo câu đố với chủ đề "{theme}"...</p>
                    </div>
                ) : error ? (
                    <div className="symbol-math-error">{error}</div>
                ) : (
                    <>
                        <div className="symbol-math-legend">
                            {legend.map(item => (
                                <div key={item.icon} className="legend-item" aria-label={`${item.icon} equals ${item.value}`}>
                                    <span>{item.icon}</span>
                                    <div className="legend-item-number">{item.value}</div>
                                </div>
                            ))}
                        </div>
                        <div className="symbol-math-problems">
                            {problems.map(p => (
                                <div key={p.id} className="problem-row">
                                    <div className="gift-box">{p.operand1}</div>
                                    <span>{p.operator}</span>
                                    <div className="gift-box">{p.operand2}</div>
                                    <span>=</span>
                                    <div className="gift-box">
                                        <input
                                            type="text"
                                            className="problem-input"
                                            value={userAnswers[p.id] || ''}
                                            onChange={(e) => handleInputChange(p.id, e.target.value)}
                                            aria-label={`Answer for problem ${p.operand1} ${p.operator} ${p.operand2}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
});

export default MaHoaPhepTinhGame;