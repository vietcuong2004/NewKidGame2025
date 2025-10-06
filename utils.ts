export interface GameComponentHandles {
  generateNew: () => void;
  exportPdf: () => void;
}

export const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
export const shuffleArray = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);
