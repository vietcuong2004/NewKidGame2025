import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, shuffleArray } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";
import '../Styles/DienKiTu.css';

// Data structures for the game
interface EmojiLegendItem {
  emoji: string;  // The main emoji
  symbol: string; // The corresponding symbol
}
interface EmojiProblemItem {
  id: number;
  emoji: string;
}

// Fixed, simple symbols for children to draw
const SYMBOLS = ['O', 'X', '+', '✓', '—'];

// Gemini response schema definition
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        legendEmojis: {
            type: Type.ARRAY,
            description: 'A list of 5 unique emoji characters that fit the theme for the legend.',
            items: { type: Type.STRING },
        },
        problemEmojis: {
            type: Type.ARRAY,
            description: 'A list of 20 emoji characters for the game grid, related to the theme.',
            items: { type: Type.STRING },
        },
    },
    required: ['legendEmojis', 'problemEmojis'],
};


const DienKiTuGame = forwardRef<GameComponentHandles>((props, ref) => {
    const [theme, setTheme] = useState('đồ ăn');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [legend, setLegend] = useState<EmojiLegendItem[]>([]);
    const [problems, setProblems] = useState<EmojiProblemItem[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const gameContentRef = useRef<HTMLDivElement>(null);

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
              Create data for an emoji matching game for a child (5-7 years old). The theme is "${theme}".
              1.  Create a list of 5 unique emoji characters that fit the theme. These will be used for the game's legend.
              2.  Create a list of 20 emoji characters for the game grid. These should also be related to the theme. Some should be from the legend list, and some can be different.
              3.  Return the entire output as a single JSON object that strictly follows the provided schema, with a 'legendEmojis' array and a 'problemEmojis' array. Do not include any text or markdown formatting outside of the JSON object.
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

            const puzzleData = JSON.parse(response.text.trim());
            if (!puzzleData.legendEmojis || puzzleData.legendEmojis.length < 5 || !puzzleData.problemEmojis || puzzleData.problemEmojis.length < 20) {
                 throw new Error("Cấu trúc dữ liệu nhận từ AI không hợp lệ. Vui lòng tạo lại.");
            }
            
            const shuffledSymbols = shuffleArray(SYMBOLS);
            const newLegend = puzzleData.legendEmojis.map((emoji: string, index: number) => ({
                emoji: emoji,
                symbol: shuffledSymbols[index],
            }));

            setLegend(newLegend);
            setProblems(puzzleData.problemEmojis.map((emoji: string, i: number) => ({ emoji, id: i })));
            setUserAnswers({});

        } catch (e) {
            console.error("Error generating game:", e);
            let errorMessage = "Đã xảy ra lỗi không xác định. Vui lòng thử lại.";
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [theme]);

    useEffect(() => {
        generateGame();
    }, []); // Run only on initial mount with default theme

    useImperativeHandle(ref, () => ({
        generateNew: generateGame,
        exportPdf: () => {
            const gameElement = gameContentRef.current;
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
                pdf.save("dien-ki-tu.pdf");
            });
        }
    }));

    const handleInputChange = (id: number, value: string) => {
        setUserAnswers(prev => ({ ...prev, [id]: value }));
    };

    return (
        <div className="character-fill-game">
            <div className="character-fill-controls">
                <label htmlFor="char-fill-theme-input" style={{fontWeight: '700'}}>Chủ đề:</label>
                <input
                    id="char-fill-theme-input"
                    type="text"
                    className="theme-input"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="ví dụ: động vật, không gian, trái cây"
                    disabled={isLoading}
                    aria-label="Theme input for character fill game"
                />
            </div>

            <div ref={gameContentRef} className="character-fill-main-content">
                {isLoading ? (
                    <div className="character-fill-loader">Đang tạo câu đố với chủ đề "{theme}"...</div>
                ) : error ? (
                    <div className="character-fill-error">{error}</div>
                ) : (
                    <>
                        <div className="character-fill-legend">
                            {legend.map(({ emoji, symbol }) => (
                                <div key={emoji} className="char-item">
                                    <div className="char-figure-box">{emoji}</div>
                                    <div className="char-symbol-box">{symbol}</div>
                                </div>
                            ))}
                        </div>
                        <div className="character-fill-grid">
                            {problems.map(problem => (
                                <div key={problem.id} className="char-item">
                                    <div className="char-figure-box">{problem.emoji}</div>
                                    <div className="char-input-box">
                                        <input
                                            type="text"
                                            className="char-input"
                                            value={userAnswers[problem.id] || ''}
                                            onChange={(e) => handleInputChange(problem.id, e.target.value)}
                                            maxLength={1}
                                            aria-label={`Input for emoji ${problem.emoji}`}
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

export default DienKiTuGame;