import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { GameComponentHandles, getRandomInt } from './utils';

interface SumProblem {
  id: number;
  numbers: number[];
  answer: number;
}

const CongSoGame = forwardRef<GameComponentHandles>((props, ref) => {
  const [problems, setProblems] = useState<SumProblem[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const gameContentRef = useRef<HTMLDivElement>(null);

  const generateProblems = useCallback(() => {
    const newProblems: SumProblem[] = Array.from({ length: 6 }, (_, i) => {
      const numCount = getRandomInt(2, 3);
      const numbers = Array.from({ length: numCount }, () => getRandomInt(0, 9));
      const answer = numbers.reduce((sum, num) => sum + num, 0);
      return { id: i, numbers, answer };
    });
    setProblems(newProblems);
    setUserAnswers({});
  }, []);

  useEffect(() => {
    generateProblems();
  }, [generateProblems]);

  useImperativeHandle(ref, () => ({
    generateNew: generateProblems,
    exportPdf: () => {
        const gameElement = gameContentRef.current;
        if (!gameElement) return;

        const printContainer = document.createElement('div');
        printContainer.classList.add('pdf-print-container');
        
        const gameClone = gameElement.cloneNode(true) as HTMLElement;
        gameClone.style.width = `${gameElement.scrollWidth}px`; // Ensure content width is fixed for PDF generation
        const inputs = gameClone.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
        });

        printContainer.appendChild(gameClone);
        document.body.appendChild(printContainer);

        html2canvas(printContainer, { scale: 2 }).then(canvas => {
            document.body.removeChild(printContainer);

            const imgData = canvas.toDataURL('image/png');
            const margin = 40; // points
            const pdfWidth = canvas.width + margin * 2;
            const pdfHeight = canvas.height + margin * 2;

            const pdf = new jsPDF({
                orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
                unit: 'pt',
                format: [pdfWidth, pdfHeight]
            });

            pdf.addImage(imgData, 'PNG', margin, margin, canvas.width, canvas.height);
            pdf.save("cong-so.pdf");
        });
    }
  }));

  const handleInputChange = (id: number, value: string) => {
    setUserAnswers(prev => ({ ...prev, [id]: value.replace(/[^0-9]/g, '') }));
  };

  return (
    <div className="sum-it-up-game" ref={gameContentRef}>
      {problems.map(p => (
        <div key={p.id} className="sum-item">
          <div className="sum-item-numbers">{p.numbers.join(' + ')}</div>
          <input
            type="text"
            className="sum-item-input"
            value={userAnswers[p.id] || ''}
            onChange={(e) => handleInputChange(p.id, e.target.value)}
            aria-label={`Answer for ${p.numbers.join(' + ')}`}
          />
        </div>
      ))}
    </div>
  );
});

export default CongSoGame;