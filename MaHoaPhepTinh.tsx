import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, getRandomInt, shuffleArray } from './utils';

// --- SVG Icon Components ---
const HollyIcon = () => <svg viewBox="0 0 100 100"><g fill="#388E3C"><circle cx="50" cy="30" r="12"/><path d="M50 30 C 20 20, 20 60, 50 50 C 80 60, 80 20, 50 30z"/><circle cx="40" cy="60" r="12"/><path d="M40 60 C 10 50, 10 90, 40 80 C 70 90, 70 50, 40 60z"/><circle cx="60" cy="60" r="12"/><path d="M60 60 C 30 50, 30 90, 60 80 C 90 90, 90 50, 60 60z"/></g><g fill="#D32F2F"><circle cx="50" cy="55" r="8"/><circle cx="35" cy="40" r="8"/><circle cx="65" cy="40" r="8"/></g></svg>;
const GiftIcon = () => <svg viewBox="0 0 100 100"><g fill="#7B1FA2"><rect x="20" y="40" width="60" height="40" rx="5"/><rect x="45" y="20" width="10" height="60"/><rect x="20" y="55" width="60" height="10"/></g></svg>;
const SkateIcon = () => <svg viewBox="0 0 100 100"><g fill="none" stroke="#B0BEC5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 30 L 80 30 L 70 70 L 25 70 Z"/><path d="M25 70 L 75 70 L 75 80 L 25 80 Z"/></g></svg>;
const GingerbreadIcon = () => <svg viewBox="0 0 100 100"><g fill="#A1887F"><circle cx="50" cy="30" r="15"/><path d="M35 50 L 65 50 L 65 80 Q 50 95, 35 80 Z"/></g><g fill="#FFF"><circle cx="45" cy="30" r="3"/><circle cx="55" cy="30" r="3"/><circle cx="50" cy="55" r="3"/><circle cx="50" cy="68" r="3"/></g></svg>;
const TreeIcon = () => <svg viewBox="0 0 100 100"><g fill="#388E3C"><path d="M50 20 L 20 50 L 80 50 Z"/><path d="M50 40 L 25 70 L 75 70 Z"/></g><rect x="45" y="70" width="10" height="15" fill="#795548"/></svg>;
const StockingIcon = () => <svg viewBox="0 0 100 100"><path d="M30 20 H 70 V 50 C 70 60, 60 70, 50 70 H 40 C 20 70, 20 90, 40 90 H 60" fill="#D32F2F" stroke="#FFF" strokeWidth="5" strokeLinejoin="round"/></svg>;
const IglooIcon = () => <svg viewBox="0 0 100 100"><path d="M20 80 A 40 40, 0, 0, 1, 80 80 Z" fill="#E3F2FD"/><path d="M40 80 H 60 V 60 H 40 Z" fill="#90CAF9"/></svg>;
const SnowmanIcon = () => <svg viewBox="0 0 100 100"><g fill="#FFF" stroke="#000" strokeWidth="2"><circle cx="50" cy="70" r="20"/><circle cx="50" cy="40" r="15"/></g><g fill="#000"><circle cx="47" cy="38" r="2"/><circle cx="53" cy="38" r="2"/><circle cx="50" cy="65" r="2"/><circle cx="50" cy="75" r="2"/></g></svg>;
const BellsIcon = () => <svg viewBox="0 0 100 100"><g fill="#FBC02D"><path d="M30 40 C 30 20, 70 20, 70 40 V 70 H 30 Z"/><path d="M60 40 C 60 20, 100 20, 100 40 V 70 H 60 Z" transform="translate(-20, 0)"/></g></svg>;


const ICONS: Record<string, React.FC> = {
  holly: HollyIcon, gift: GiftIcon, skate: SkateIcon, gingerbread: GingerbreadIcon, tree: TreeIcon,
  stocking: StockingIcon, igloo: IglooIcon, snowman: SnowmanIcon, bells: BellsIcon,
};
const iconKeys = Object.keys(ICONS);

interface SymbolProblem {
    id: number;
    symbol1: string;
    symbol2: string;
    answer: number;
}
type Legend = Record<string, number>;

const MaHoaPhepTinhGame = forwardRef<GameComponentHandles>((props, ref) => {
    const [legend, setLegend] = useState<Legend>({});
    const [problems, setProblems] = useState<SymbolProblem[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const gameContentRef = useRef<HTMLDivElement>(null);

    const generateGame = useCallback(() => {
        const numbers = shuffleArray(Array.from({length: 9}, (_, i) => i + 1));
        const newLegend: Legend = {};
        iconKeys.forEach((key, index) => {
            newLegend[key] = numbers[index];
        });

        const newProblems: SymbolProblem[] = Array.from({ length: 12 }, (_, i) => {
            const s1 = iconKeys[getRandomInt(0, 8)];
            const s2 = iconKeys[getRandomInt(0, 8)];
            return {
                id: i,
                symbol1: s1,
                symbol2: s2,
                answer: newLegend[s1] + newLegend[s2],
            };
        });

        setLegend(newLegend);
        setProblems(newProblems);
        setUserAnswers({});
    }, []);

    useEffect(() => {
        generateGame();
    }, [generateGame]);

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
                pdf.save("ma-hoa-phep-tinh.pdf");
            });
        }
    }));

    const handleInputChange = (id: number, value: string) => {
        setUserAnswers(prev => ({ ...prev, [id]: value.replace(/[^0-9]/g, '') }));
    };

    const renderSymbol = (symbolKey: string) => {
        const IconComponent = ICONS[symbolKey];
        return IconComponent ? <IconComponent /> : null;
    }

    return (
        <div className="symbol-math-game" ref={gameContentRef}>
            <div className="symbol-math-legend">
                {iconKeys.map(key => (
                    <div key={key} className="legend-item">
                        {renderSymbol(key)}
                        <div className="legend-item-number">{legend[key]}</div>
                    </div>
                ))}
            </div>
            <div className="symbol-math-problems">
                {problems.map(p => (
                    <div key={p.id} className="problem-row">
                        <div className="gift-box">{renderSymbol(p.symbol1)}</div>
                        <span>+</span>
                        <div className="gift-box">{renderSymbol(p.symbol2)}</div>
                        <span>=</span>
                        <div className="gift-box">
                            <input
                                type="text"
                                className="problem-input"
                                value={userAnswers[p.id] || ''}
                                onChange={(e) => handleInputChange(p.id, e.target.value)}
                                aria-label={`Answer for problem ${p.id}`}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default MaHoaPhepTinhGame;