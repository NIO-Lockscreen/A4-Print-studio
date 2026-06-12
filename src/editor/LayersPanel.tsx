import { Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Type, Paintbrush, Layers as LayersIcon, Image as ImageIcon, FileText } from 'lucide-react';
import type { Layer } from './types';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: 1 | -1) => void;
  onAddDraw: () => void;
  onAddText: () => void;
  onOpacityChange: (id: string, opacity: number) => void;
  hasImage: boolean;
  imageVisible: boolean;
  onToggleImageVisible: () => void;
}

export default function LayersPanel({
  layers,
  activeLayerId,
  onSelect,
  onToggleVisible,
  onDelete,
  onMove,
  onAddDraw,
  onAddText,
  onOpacityChange,
  hasImage,
  imageVisible,
  onToggleImageVisible,
}: LayersPanelProps) {
  // Topmost layer is last in the array; show it first like Photoshop.
  const reversed = [...layers].reverse();
  const active = layers.find((l) => l.id === activeLayerId) ?? null;

  return (
    <div className="no-print absolute right-4 top-14 z-30 w-60 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <LayersIcon size={14} className="text-slate-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lag</span>
        <div className="ml-auto flex gap-1">
          <button
            title="Nytt tegnelag"
            onClick={onAddDraw}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <Paintbrush size={14} />
          </button>
          <button
            title="Nytt tekstlag"
            onClick={onAddText}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <Type size={14} />
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        {reversed.map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => onSelect(layer.id)}
              className={`group flex items-center gap-2 px-2 py-1.5 mx-1 rounded-lg cursor-pointer ${
                isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'
              }`}
            >
              <button
                title={layer.visible ? 'Skjul lag' : 'Vis lag'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisible(layer.id);
                }}
                className="p-1 text-slate-500 hover:text-slate-800"
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              {layer.type === 'draw' ? (
                <Paintbrush size={12} className="text-slate-400 shrink-0" />
              ) : layer.type === 'longtext' ? (
                <FileText size={12} className="text-slate-400 shrink-0" />
              ) : (
                <Type size={12} className="text-slate-400 shrink-0" />
              )}
              <span className={`text-sm truncate flex-1 ${isActive ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                {layer.name}
              </span>
              <div className={`flex items-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                  title="Flytt opp"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(layer.id, 1);
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  title="Flytt ned"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(layer.id, -1);
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <ChevronDown size={14} />
                </button>
                <button
                  title="Slett lag"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(layer.id);
                  }}
                  className="p-0.5 text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}

        {hasImage && (
          <div className="flex items-center gap-2 px-2 py-1.5 mx-1 rounded-lg">
            <button
              title={imageVisible ? 'Skjul bilde' : 'Vis bilde'}
              onClick={onToggleImageVisible}
              className="p-1 text-slate-500 hover:text-slate-800"
            >
              {imageVisible ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <ImageIcon size={12} className="text-slate-400 shrink-0" />
            <span className="text-sm text-slate-500 italic flex-1">Bilde (bakgrunn)</span>
          </div>
        )}

        {layers.length === 0 && !hasImage && (
          <p className="text-xs text-slate-400 px-3 py-2">Ingen lag ennå</p>
        )}
      </div>

      {active && (
        <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-2">
          <span className="text-xs text-slate-500 shrink-0">Dekkevne</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(active.opacity * 100)}
            onChange={(e) => onOpacityChange(active.id, Number(e.target.value) / 100)}
            className="flex-1 accent-indigo-600 min-w-0"
          />
          <span className="text-xs font-mono text-slate-400 w-9 text-right shrink-0">
            {Math.round(active.opacity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
