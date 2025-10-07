import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, shuffleArray } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";
import '../Styles/TimHinhDung.css';

interface PuzzleData {
    grid: string[];
    options: string[];
    correctOptionIndex: number;
    missingIndex: number;
}

// Gemini response schema definition
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        grid: {
            type: Type.ARRAY,
            description: 'An array of 9 strings for a 3x3 grid. 8 items are SVG strings (viewBox="0 0 100 100"), and one is the string "MISSING".',
            items: { type: Type.STRING },
        },
        options: {
            type: Type.ARRAY,
            description: 'An array of 5 SVG strings (viewBox="0 0 100 100") for the multiple-choice options.',
            items: { type: Type.STRING },
        },
        correctOptionIndex: {
            type: Type.INTEGER,
            description: 'The index (0-4) of the correct answer within the options array.',
        },
    },
    required: ['grid', 'options', 'correctOptionIndex'],
};

// Default puzzle to use as a fallback for API errors
const defaultPuzzles: Omit<PuzzleData, 'missingIndex'>[] = [
    {
        grid: [
            '<svg viewBox="0 0 100 100"><rect x="25" y="25" width="50" height="50" fill="red"/></svg>',
            '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="red"/></svg>',
            '<svg viewBox="0 0 100 100"><polygon points="50,15 85,85 15,85" fill="red"/></svg>',
            '<svg viewBox="0 0 100 100"><rect x="25" y="25" width="50" height="50" fill="blue"/></svg>',
            'MISSING',
            '<svg viewBox="0 0 100 100"><polygon points="50,15 85,85 15,85" fill="blue"/></svg>',
            '<svg viewBox="0 0 100 100"><rect x="25" y="25" width="50" height="50" fill="green"/></svg>',
            '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="green"/></svg>',
            '<svg viewBox="0 0 100 100"><polygon points="50,15 85,85 15,85" fill="green"/></svg>',
        ],
        options: [
            '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="red"/></svg>',
            '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="blue"/></svg>',
            '<svg viewBox="0 0 100 100"><rect x="25" y="25" width="50" height="50" fill="blue"/></svg>',
            '<svg viewBox="0 0 100 100"><polygon points="50,15 85,85 15,85" fill="green"/></svg>',
            '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="25" fill="green"/></svg>',
        ],
        correctOptionIndex: 1,
    }
];


const TimHinhDungGame = forwardRef<GameComponentHandles>((props, ref) => {
    const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selection, setSelection] = useState<{ index: number; isCorrect: boolean } | null>(null);
    const gameContentRef = useRef<HTMLDivElement>(null);

    const loadDefaultPuzzle = useCallback(() => {
        console.warn("API Error/Limit. Loading a default puzzle.");
        const defaultPuzzle = defaultPuzzles[0];
        const missingIndex = defaultPuzzle.grid.indexOf("MISSING");
        setPuzzle({ ...defaultPuzzle, missingIndex });
        setError(null);
    }, []);

    const generateNew = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSelection(null);
        setPuzzle(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Create a visual logic puzzle for children aged 6–8, inspired by classic IQ and pattern-reasoning tests (like Raven’s matrices or shape-color logic puzzles).

### General Requirements:
- The puzzle is displayed as a 3x3 grid, with one cell missing.
- Each cell contains a combination of simple geometric shapes (circle, square, triangle, star, etc.) and colors (red, blue, yellow, green, orange, purple).
- The design must be clean, colorful, and easy for children to understand visually.
- The missing cell must be represented as the exact string 'MISSING'.
- Provide 5 multiple-choice options (A–E) below the grid, one of which correctly completes the logical pattern.

### Output Format (strict JSON schema):
{
  'grid': [9 strings],
  'options': [5 strings],
  'correctOptionIndex': integer
}
- Each non-missing grid item and each option must be a valid inline SVG string with viewBox="0 0 100 100".
- Exactly one 'grid' item must be 'MISSING'.
- 'correctOptionIndex' must correspond to the correct SVG in 'options'.

### Design Logic (varied across puzzles):
Each puzzle should follow one or a mix of these pattern types:
1. **Shape progression** - outer or inner shapes rotate or change in order (circle → square → triangle).
2. **Color progression** - colors shift in sequence (red → yellow → blue → red).
3. **Position pattern** - inner shapes move position (top → middle → bottom).
4. **Counting pattern** - number of shapes or elements increases or decreases across rows/columns.
5. **Shape-color dependency** - certain shapes always have specific colors, or inner/outer combinations follow fixed rules.
6. **Alternating logic** - rows alternate in pattern rule (e.g., color changes in row 1, shape changes in row 2).
7. **Mixed composition** - outer and inner shapes differ (e.g., a blue circle containing a yellow triangle).

### Examples of Variants:
- Row-based pattern: each row changes shape, while color repeats down the column.
- Column-based pattern: colors rotate vertically, while inner shapes rotate horizontally.
- Combined pattern: both shape and color evolve together, forming a consistent logic grid.

### Constraints:
- Must remain visually solvable by young children (avoid too subtle patterns).
- Distractor options must be plausible but break one element of the logic (e.g., wrong color or shape order).
- Shapes and colors should contrast well visually.

### Output Rules:
- Output only the JSON object.
- Do not include any markdown, explanation, or commentary.
- The JSON must be syntactically valid and self-contained.
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

            const data = JSON.parse(response.text.trim());
            const missingIndex = data.grid.indexOf("MISSING");

            if (missingIndex === -1 || data.options.length !== 5) {
                throw new Error("Invalid data structure from AI.");
            }

            setPuzzle({ ...data, missingIndex });

        } catch (e) {
            console.error("Error generating puzzle:", e);
            let errorMessage = "Đã xảy ra lỗi khi tạo câu đố. Đang tải câu đố mặc định.";
             if (e instanceof Error) {
                errorMessage = e.message.includes("429") || e.message.toUpperCase().includes("RESOURCE_EXHAUSTED")
                    ? "Lượt truy cập API đã hết. Đang tải câu đố mặc định."
                    : errorMessage;
            }
            setError(errorMessage);
            loadDefaultPuzzle();
        } finally {
            setIsLoading(false);
        }
    }, [loadDefaultPuzzle]);

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

            // Remove selection state for clean PDF
            const selected = gameClone.querySelector('.selected, .correct, .incorrect');
            selected?.classList.remove('selected', 'correct', 'incorrect');
            
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
                pdf.save('tim-hinh-dung.pdf');
            });
        }
    }));

    const handleOptionClick = (index: number) => {
        if (!puzzle) return;
        const isCorrect = index === puzzle.correctOptionIndex;
        setSelection({ index, isCorrect });
    };

    if (isLoading) return <div className="pattern-find-loader">Đang tạo câu đố...</div>;
    if (error && !puzzle) return <div className="pattern-find-error">{error}</div>;
    if (!puzzle) return null;

    return (
        <div className="pattern-find-game" ref={gameContentRef}>
            <div className="pattern-find-grid">
                {puzzle.grid.map((item, index) => (
                    <div key={index} className="pattern-grid-cell">
                        {item === 'MISSING' ? (
                            <div className="question-mark">?</div>
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: item }} />
                        )}
                    </div>
                ))}
            </div>
            <div className="pattern-find-options">
                {puzzle.options.map((svg, index) => {
                    let className = 'pattern-option-cell';
                    if (selection && selection.index === index) {
                        className += selection.isCorrect ? ' correct' : ' incorrect';
                    } else if (selection && !selection.isCorrect && index === puzzle.correctOptionIndex) {
                        className += ' correct';
                    }
                    return (
                        <div key={index} className={className} onClick={() => handleOptionClick(index)}>
                             <div dangerouslySetInnerHTML={{ __html: svg }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default TimHinhDungGame;
