export type Face = 'neutral' | 'happy' | 'tired' | 'cheer';

interface FaceShape {
  eyeL: string;
  eyeR: string;
  eyeW: number;
  /** Брови; нет — без бровей */
  brows?: string;
  mouth: string;
  /** Рот закрашен (улыбка с открытым ртом) */
  mouthFilled?: boolean;
}

const dot = { eyeL: 'M-15 8 L-15 8.5', eyeR: 'M15 8 L15 8.5', eyeW: 7 };
const arcUp = { eyeL: 'M-21 10 Q-15 3 -9 10', eyeR: 'M9 10 Q15 3 21 10', eyeW: 3.5 };

/** Лица из макета «Chibi»: глаза, брови и рот; голова и поза от лица не зависят */
export const FACES: Record<Face, FaceShape> = {
  neutral: { ...dot, mouth: 'M-6 24 Q0 29 6 24' },
  happy: { ...arcUp, mouth: 'M-9 22 Q0 33 9 22 Z', mouthFilled: true },
  tired: { eyeL: 'M-21 8 Q-15 13 -9 8', eyeR: 'M9 8 Q15 13 21 8', eyeW: 3.5, mouth: 'M-4 26 Q0 22 4 26 Q0 29 -4 26 Z', mouthFilled: true },
  cheer: { ...arcUp, brows: 'M-22 -8 Q-15 -13 -8 -8 M22 -8 Q15 -13 8 -8', mouth: 'M-12 20 Q0 38 12 20 Z', mouthFilled: true },
};
