import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, getRandomInt, shuffleArray } from './utils';

// --- SVG Symbol Components ---
const MinusIcon = () => <svg viewBox="0 0 100 100"><rect x="10" y="45" width="80" height="10" fill="#E53935" rx="5"/></svg>;
const CheckIcon = () => <svg viewBox="0 0 100 100"><path d="M20 50 L45 75 L80 25" stroke="#4CAF50" strokeWidth="12" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const CrossIcon = () => <svg viewBox="0 0 100 100"><g stroke="#3F51B5" strokeWidth="12" strokeLinecap="round"><line x1="20" y1="20" x2="80" y2="80"/><line x1="80" y1="20" x2="20" y2="80"/></g></svg>;
const CircleIcon = () => <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" stroke="#FFC107" strokeWidth="10" fill="none"/></svg>;
const PlusIcon = () => <svg viewBox="0 0 100 100"><g fill="#212121"><rect x="10" y="45" width="80" height="10" rx="5"/><rect x="45" y="10" width="10" height="80" rx="5"/></g></svg>;

const SYMBOLS: React.FC[] = [MinusIcon, CheckIcon, CrossIcon, CircleIcon, PlusIcon];

// --- SVG Stick Figure Components ---
const poses: React.FC[] = [
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="50"/><line x1="50" y1="40" x2="70" y2="50"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="30"/><line x1="50" y1="40" x2="70" y2="50"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="50"/><line x1="50" y1="40" x2="70" y2="30"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="30"/><line x1="50" y1="40" x2="70" y2="30"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="50"/><line x1="50" y1="40" x2="70" y2="50"/><line x1="50" y1="60" x2="30" y2="90"/><line x1="50" y1="60" x2="70" y2="70"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="50"/><line x1="50" y1="40" x2="70" y2="50"/><line x1="50" y1="60" x2="30" y2="70"/><line x1="50" y1="60" x2="70" y2="90"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="70"/><line x1="50" y1="40" x2="25" y2="30"/><line x1="50" y1="40" x2="75" y2="50"/><line x1="50" y1="70" x2="30" y2="90"/><line x1="50" y1="70" x2="70" y2="90" transform="rotate(-20 50 70)"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="50"/><line x1="50" y1="40" x2="70" y2="50"/><line x1="50" y1="60" x2="40" y2="90"/><line x1="50" y1="60" x2="60" y2="90"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="20" y2="40"/><line x1="50" y1="40" x2="80" y2="40"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="60"/><line x1="50" y1="40" x2="70" y2="60"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g transform="translate(0 5)"><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="40" y2="20"/><line x1="50" y1="40" x2="70" y2="50"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g transform="translate(0 5)"><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="50"/><line x1="50" y1="40" x2="60" y2="20"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="45" x2="20" y2="25"/><line x1="50" y1="45" x2="80" y2="25"/><line x1="50" y1="60" x2="30" y2="80"/><line x1="50" y1="60" x2="70" y2="80"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="50"/><line x1="50" y1="40" x2="70" y2="50"/><line x1="50" y1="60" x2="20" y2="60"/><line x1="50" y1="60" x2="80" y2="90"/></g>,
  () => <g><circle cx="50" cy="20" r="10"/><line x1="50" y1="30" x2="50" y2="60"/><line x1="50" y1="40" x2="30" y2="50"/><line x1="50" y1="40" x2="70" y2="50"/><line x1="50" y1="60" x2="80" y2="60"/><line x1="50" y1="60" x2="20" y2="90"/></g>,
].map((Pose, i) => () => <g stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"><Pose/></g>);


interface LegendItem {
  poseIndex: number;
  symbolIndex: number;
}
interface ProblemItem {
  id: number;
  poseIndex: number;
}

const DienKiTuGame = forwardRef<GameComponentHandles>((props, ref) => {
  const [legend, setLegend] = useState<LegendItem[]>([]);
  const [problems, setProblems] = useState<ProblemItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const gameContentRef = useRef<HTMLDivElement>(null);

  const generateNew = useCallback(() => {
    const allPoseIndices = Array.from({ length: poses.length }, (_, i) => i);
    const shuffledPoses = shuffleArray(allPoseIndices);
    
    const legendPoses = shuffledPoses.slice(0, 5);
    const symbolIndices = shuffleArray(Array.from({ length: SYMBOLS.length }, (_, i) => i));
    
    const newLegend = legendPoses.map((poseIndex, i) => ({
      poseIndex,
      symbolIndex: symbolIndices[i],
    }));

    const newProblems = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      poseIndex: getRandomInt(0, poses.length - 1),
    }));

    setLegend(newLegend);
    setProblems(newProblems);
    setUserAnswers({});
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

  const renderPose = (poseIndex: number) => {
    const PoseComponent = poses[poseIndex];
    return PoseComponent ? <PoseComponent /> : null;
  }
  const renderSymbol = (symbolIndex: number) => {
    const SymbolComponent = SYMBOLS[symbolIndex];
    return SymbolComponent ? <SymbolComponent /> : null;
  }

  return (
    <div className="character-fill-game" ref={gameContentRef}>
      <div className="character-fill-legend">
        {legend.map(({ poseIndex, symbolIndex }) => (
          <div key={poseIndex} className="char-item">
            <div className="char-figure-box">
              <svg viewBox="0 0 100 100">{renderPose(poseIndex)}</svg>
            </div>
            <div className="char-symbol-box">
               <svg viewBox="0 0 100 100">{renderSymbol(symbolIndex)}</svg>
            </div>
          </div>
        ))}
      </div>
      <div className="character-fill-grid">
        {problems.map(problem => (
          <div key={problem.id} className="char-item">
             <div className="char-figure-box">
                <svg viewBox="0 0 100 100">{renderPose(problem.poseIndex)}</svg>
             </div>
             <div className="char-input-box">
                <input
                    type="text"
                    className="char-input"
                    value={userAnswers[problem.id] || ''}
                    onChange={(e) => handleInputChange(problem.id, e.target.value)}
                    maxLength={1}
                />
             </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default DienKiTuGame;