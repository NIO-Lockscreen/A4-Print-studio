export type Tool = 'move' | 'brush' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'text';

export interface TextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

export type LongTextFont = 'sans' | 'serif' | 'mono';

export interface LongTextSettings {
  content: string;
  fontSize: number;
  lineHeight: number;
  align: 'left' | 'center' | 'justify';
  font: LongTextFont;
  color: string;
  margin: number;
  columns: 1 | 2;
}

export const LONG_TEXT_FONTS: Record<LongTextFont, string> = {
  sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace',
};

export interface Layer {
  id: string;
  name: string;
  type: 'draw' | 'text' | 'longtext';
  visible: boolean;
  opacity: number;
  textItems: TextItem[];
  longText?: LongTextSettings;
}
