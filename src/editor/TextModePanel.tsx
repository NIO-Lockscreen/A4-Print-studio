import { X, AlignLeft, AlignCenter, AlignJustify, Sparkles, FileText, TriangleAlert } from 'lucide-react';
import type { LongTextSettings, LongTextFont } from './types';
import { LONG_TEXT_FONTS } from './types';

interface TextModePanelProps {
  settings: LongTextSettings;
  onChange: (patch: Partial<LongTextSettings>) => void;
  onClose: () => void;
  onAutoFit: () => void;
  overflowing: boolean;
  onTextFocus: () => void;
  onTextBlur: () => void;
  offsetForToolbar: boolean;
}

const ALIGN_OPTIONS = [
  { value: 'left' as const, icon: AlignLeft, label: 'Venstrejustert' },
  { value: 'center' as const, icon: AlignCenter, label: 'Midtstilt' },
  { value: 'justify' as const, icon: AlignJustify, label: 'Blokkjustert' },
];

const FONT_OPTIONS: { value: LongTextFont; label: string }[] = [
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
  { value: 'mono', label: 'Mono' },
];

function SliderRow({ label, min, max, step, value, display, onChange }: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-indigo-600 min-w-0"
      />
      <span className="text-xs font-mono text-slate-400 w-9 text-right shrink-0">{display}</span>
    </div>
  );
}

export default function TextModePanel({
  settings,
  onChange,
  onClose,
  onAutoFit,
  overflowing,
  onTextFocus,
  onTextBlur,
  offsetForToolbar,
}: TextModePanelProps) {
  return (
    <div
      className={`no-print absolute top-4 bottom-4 ${offsetForToolbar ? 'left-[4.5rem]' : 'left-4'} z-40 w-80 bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col overflow-hidden`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <FileText size={14} className="text-slate-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tekstmodus</span>
        <button
          title="Lukk"
          onClick={onClose}
          className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <X size={14} />
        </button>
      </div>

      <textarea
        value={settings.content}
        onChange={(e) => onChange({ content: e.target.value })}
        onFocus={onTextFocus}
        onBlur={onTextBlur}
        placeholder="Lim inn eller skriv teksten din her …"
        className="mx-3 mt-3 flex-1 min-h-32 resize-none rounded-lg border border-slate-200 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
      />

      {overflowing && (
        <div className="mx-3 mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <TriangleAlert size={14} className="shrink-0" />
          Teksten får ikke plass på arket. Prøv «Tilpass automatisk».
        </div>
      )}

      <div className="p-3 space-y-3 overflow-y-auto">
        <SliderRow
          label="Skriftstørrelse"
          min={8}
          max={72}
          value={settings.fontSize}
          display={String(settings.fontSize)}
          onChange={(v) => onChange({ fontSize: v })}
        />
        <SliderRow
          label="Linjeavstand"
          min={1}
          max={2.5}
          step={0.1}
          value={settings.lineHeight}
          display={settings.lineHeight.toFixed(1)}
          onChange={(v) => onChange({ lineHeight: v })}
        />
        <SliderRow
          label="Marg"
          min={0}
          max={140}
          value={settings.margin}
          display={String(settings.margin)}
          onChange={(v) => onChange({ margin: v })}
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-24 shrink-0">Justering</span>
          <div className="flex gap-1">
            {ALIGN_OPTIONS.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                title={label}
                onClick={() => onChange({ align: value })}
                className={`p-2 rounded-lg transition-colors ${
                  settings.align === value ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-24 shrink-0">Skrifttype</span>
          <div className="flex gap-1">
            {FONT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                title={label}
                onClick={() => onChange({ font: value })}
                style={{ fontFamily: LONG_TEXT_FONTS[value] }}
                className={`px-2.5 py-1 rounded-lg text-sm transition-colors ${
                  settings.font === value ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Aa
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-24 shrink-0">Spalter</span>
          <div className="flex gap-1">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => onChange({ columns: n })}
                className={`px-2.5 py-1 rounded-lg text-sm transition-colors ${
                  settings.columns === n ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <label title="Tekstfarge" className="ml-auto flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-500">Farge</span>
            <span
              className="w-6 h-6 rounded-full border border-slate-300 shadow-inner"
              style={{ backgroundColor: settings.color }}
            />
            <input
              type="color"
              value={settings.color}
              onChange={(e) => onChange({ color: e.target.value })}
              className="sr-only"
            />
          </label>
        </div>

        <button
          onClick={onAutoFit}
          className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm font-medium"
        >
          <Sparkles size={15} /> Tilpass automatisk
        </button>
      </div>
    </div>
  );
}
