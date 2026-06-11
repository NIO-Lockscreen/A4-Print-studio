export type Tool = 'move' | 'brush' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'text';

export interface TextItem {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

export interface Layer {
  id: string;
  name: string;
  type: 'draw' | 'text';
  visible: boolean;
  opacity: number;
  textItems: TextItem[];
}
