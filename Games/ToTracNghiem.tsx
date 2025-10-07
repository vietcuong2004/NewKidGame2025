// Fix: Corrected typo 'useImperactiveHandle' to 'useImperativeHandle' in the import statement.
import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, shuffleArray } from '../utils';
import { GoogleGenAI, Type } from "@google/genai";
import '../Styles/ToTracNghiem.css';

// Gemini response schema definition
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    grid: {
      type: Type.ARRAY,
      description: 'An array of 25 numbers, where 1 represents a filled cell and 0 an empty cell, forming the character on a 5x5 grid.',
      items: { type: Type.INTEGER },
    },
  },
  required: ['grid'],
};

interface PatternRow {
    id: number;
    model: number[];
    userGrid: number[];
}

const ToTracNghiemGame = forwardRef<GameComponentHandles>((props, ref) => {
    const [patterns, setPatterns] = useState<PatternRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const gameContentRef = useRef<HTMLDivElement>(null);

    const generateNew = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const characters = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
            const selectedChars = shuffleArray(characters).slice(0, 8);

            const patternPromises = selectedChars.map(char => {
                const prompt = `Generate a pixel art representation of the character '${char}' on a 5x5 grid. The output should be a single JSON object containing a 'grid' property, which is an array of 25 numbers (either 0 for an empty cell or 1 for a filled cell). Do not include any text or markdown formatting outside of the JSON object.`;
                
                return ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                    },
                });
            });

            const responses = await Promise.all(patternPromises);
            
            const newPatterns = responses.map((response, index) => {
                const data = JSON.parse(response.text.trim());
                if (!data.grid || !Array.isArray(data.grid) || data.grid.length !== 25) {
                    throw new Error(`Invalid grid data received for character '${selectedChars[index]}'.`);
                }
                return {
                    id: index,
                    model: data.grid,
                    userGrid: Array(25).fill(0),
                };
            });

            setPatterns(newPatterns);

        } catch (e) {
            console.error("Error generating patterns:", e);
            let errorMessage = "Đã xảy ra lỗi khi tạo mẫu. Vui lòng thử lại.";
            if (e instanceof Error) {
                errorMessage = e.message;
            }
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
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
            
            const userDots = gameClone.querySelectorAll('.user-grid .pattern-dot');
            userDots.forEach(dot => dot.classList.remove('filled'));

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
                pdf.save('to-trac-nghiem.pdf');
            });
        }
    }));

    const handleDotClick = (rowId: number, dotIndex: number) => {
        setPatterns(prevPatterns =>
            prevPatterns.map(row => {
                if (row.id === rowId) {
                    const newUserGrid = [...row.userGrid];
                    newUserGrid[dotIndex] = newUserGrid[dotIndex] === 1 ? 0 : 1;
                    return { ...row, userGrid: newUserGrid };
                }
                return row;
            })
        );
    };

    const renderGrid = (gridData: number[], isInteractive: boolean, rowId?: number) => (
        <div className={`pattern-grid ${isInteractive ? 'user-grid' : ''}`}>
            {gridData.map((dot, index) => (
                <div
                    key={index}
                    className={`pattern-dot ${dot === 1 ? 'filled' : ''}`}
                    onClick={isInteractive ? () => handleDotClick(rowId!, index) : undefined}
                    aria-label={isInteractive ? `Dot ${index + 1}, currently ${dot === 1 ? 'filled' : 'empty'}` : `Model dot ${index + 1}`}
                />
            ))}
        </div>
    );

    if (isLoading) {
        return <div className="pattern-loader">Đang tạo các mẫu hình mới...</div>;
    }

    if (error) {
        return <div className="pattern-error">Lỗi: {error}</div>;
    }

    return (
        <div className="multiple-choice-coloring-game" ref={gameContentRef}>
            {patterns.map(row => (
                <div key={row.id} className="pattern-row">
                    {renderGrid(row.model, false)}
                    <div className="pattern-separator">➔</div>
                    {renderGrid(row.userGrid, true, row.id)}
                </div>
            ))}
        </div>
    );
});

export default ToTracNghiemGame;