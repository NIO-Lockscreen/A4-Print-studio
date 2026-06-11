import React from 'react';
import { MousePointer2, Paintbrush, Eraser, Minus, Square, Circle, Type, Undo2 } from 'lucide-react';
import type { Tool } from './types';

const TOOLS: { id: Tool; icon: React.ComponentType<{ size?: number }>; label: string }[] = [
  { id: 'move', icon: MousePointer2, label: 'Flytt / velg' },
  { id: 'brush', icon: Paintbrush, label: 'Pensel' },
  { id: 'eraser', icon: Eraser, label: 'Viskelær' },
  { id: 'line', icon: Minus, label: 'Linje' },
  { id: 'rect', icon: Square, label: 'Rektangel' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse' },
  { id: 'text', icon: Type, label: 'Tekst' },
];

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  color: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  canUndo: boolean;
  onUndo: () => void;
}

export default function Toolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  fontSize,
  onFontSizeChange,
  canUndo,
  onUndo,
}: ToolbarProps) {
  return (
    <>
      {/* Vertical tool palette */}
      <div className="no-print absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 flex flex-col gap-1">
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => onToolChange(id)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              tool === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon size={18} />
          </button>
        ))}

        <div className="h-px bg-slate-200 my-1" />

        <label title="Farge" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 cursor-pointer">
          <span
            className="w-5 h-5 rounded-full border border-slate-300 shadow-inner"
            style={{ backgroundColor: color }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="sr-only"
          />
        </label>

        <button
          title="Angre"
          onClick={onUndo}
          disabled={!canUndo}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Undo2 size={18} />
        </button>
      </div>

      {/* Options bar for the active tool */}
      {tool !== 'move' && (
        <div className="no-print absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white rounded-full shadow-lg border border-slate-200 px-4 py-2 flex items-center gap-3">
          {tool === 'text' ? (
            <>
              <span className="text-xs font-medium text-slate-500">Skriftstørrelse</span>
              <input
                type="range"
                min={10}
                max={120}
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="w-32 accent-indigo-600"
              />
              <span className="text-xs font-mono text-slate-400 w-8 text-right">{fontSize}</span>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-slate-500">Tykkelse</span>
              <input
                type="range"
                min={1}
                max={60}
                value={strokeWidth}
                onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
                className="w-32 accent-indigo-600"
              />
              <span className="text-xs font-mono text-slate-400 w-8 text-right">{strokeWidth}</span>
            </>
          )}
        </div>
      )}
    </>
  );
}
