import React, { useRef, useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { Upload, Printer, ZoomIn, ZoomOut, RotateCw, Trash2, Image as ImageIcon, Maximize, Wand2 } from 'lucide-react';
import Toolbar from './editor/Toolbar';
import LayersPanel from './editor/LayersPanel';
import type { Tool, Layer, TextItem } from './editor/types';

interface ImageState {
  src: string;
  scale: number;
  x: number;
  y: number;
  rotation: number;
}

type UndoEntry =
  | { kind: 'draw'; layerId: string; dataUrl: string }
  | { kind: 'layers'; layers: Layer[] };

interface StrokeState {
  layerId: string;
  tool: Tool;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
}

interface TextDragState {
  layerId: string;
  itemId: string;
  lastX: number;
  lastY: number;
  moved: boolean;
  before: Layer[];
}

export default function App() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewScale, setPreviewScale] = useState(1);

  // Advanced mode (Photoshop-like editing) state
  const [advancedMode, setAdvancedMode] = useState(false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('move');
  const [color, setColor] = useState('#1e293b');
  const [strokeWidth, setStrokeWidth] = useState(6);
  const [fontSize, setFontSize] = useState(36);
  const [imageVisible, setImageVisible] = useState(true);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [undoDepth, setUndoDepth] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const layerCanvases = useRef(new Map<string, HTMLCanvasElement>());
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const strokeRef = useRef<StrokeState | null>(null);
  const textDragRef = useRef<TextDragState | null>(null);
  const undoStack = useRef<UndoEntry[]>([]);
  const counters = useRef({ draw: 0, text: 0, id: 0 });

  // A4 dimensions in pixels at 96 DPI (standard screen resolution)
  // 210mm = 793.7px, 297mm = 1122.5px
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

  // Drawing layers use a 2x backing store for crisper print output.
  const CANVAS_SCALE = 2;

  // Update preview scale on resize
  useEffect(() => {
    const updateScale = () => {
      if (wrapperRef.current) {
        const { width, height } = wrapperRef.current.getBoundingClientRect();
        // Leave some margin
        const availableWidth = width - 40;
        const availableHeight = height - 40;

        const scaleX = availableWidth / A4_WIDTH_PX;
        const scaleY = availableHeight / A4_HEIGHT_PX;

        // Fit to screen, but don't zoom in more than 1 (unless user wants to, but let's keep it simple)
        setPreviewScale(Math.min(scaleX, scaleY, 1));
      }
    };

    window.addEventListener('resize', updateScale);
    updateScale();

    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Reset state for new image
          setImage({
            src: event.target.result as string,
            scale: 1,
            x: 0,
            y: 0,
            rotation: 0
          });
          setImageVisible(true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
    if (advancedMode && tool !== 'move') return;
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !image) return;
    e.preventDefault(); // Prevent scrolling on touch

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const deltaX = (clientX - dragStart.x) / previewScale;
    const deltaY = (clientY - dragStart.y) / previewScale;

    setImage({
      ...image,
      x: image.x + deltaX,
      y: image.y + deltaY
    });

    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handlePrint = () => {
    // The browser uses document.title as the default PDF / print filename.
    // Temporarily switch it to "A4 Print" for the print dialog, then restore.
    const originalTitle = document.title;
    document.title = 'A4 Print';

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    window.print();

    // Fallback in case afterprint doesn't fire (some browsers).
    setTimeout(restoreTitle, 1000);
  };

  const fitToPage = () => {
    if (!image || !canvasRef.current) return;

    const img = new Image();
    img.src = image.src;
    img.onload = () => {
      // Use the fixed A4 dimensions
      const canvasWidth = A4_WIDTH_PX;
      const canvasHeight = A4_HEIGHT_PX;

      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;

      // "Cover" logic
      const newScale = Math.max(scaleX, scaleY);

      setImage({
        ...image,
        scale: newScale,
        x: (canvasWidth - img.width * newScale) / 2,
        y: (canvasHeight - img.height * newScale) / 2,
        rotation: 0
      });
    };
  };

  // Zoom controls for the IMAGE
  const zoomIn = () => setImage(prev => prev ? { ...prev, scale: prev.scale * 1.1 } : null);
  const zoomOut = () => setImage(prev => prev ? { ...prev, scale: prev.scale * 0.9 } : null);
  const rotate = () => setImage(prev => prev ? { ...prev, rotation: (prev.rotation + 90) % 360 } : null);
  const clear = () => setImage(null);

  // ---------- Advanced mode: layers ----------

  const makeLayer = (type: 'draw' | 'text'): Layer => {
    counters.current.id += 1;
    const n = type === 'draw' ? ++counters.current.draw : ++counters.current.text;
    return {
      id: `layer-${Date.now()}-${counters.current.id}`,
      name: type === 'draw' ? `Lag ${n}` : `Tekst ${n}`,
      type,
      visible: true,
      opacity: 1,
      textItems: [],
    };
  };

  const addLayer = (type: 'draw' | 'text') => {
    const layer = makeLayer(type);
    setLayers(prev => [...prev, layer]);
    setActiveLayerId(layer.id);
  };

  const deleteLayer = (id: string) => {
    const remaining = layers.filter(l => l.id !== id);
    setLayers(remaining);
    if (activeLayerId === id) {
      setActiveLayerId(remaining.length ? remaining[remaining.length - 1].id : null);
    }
  };

  const moveLayer = (id: string, dir: 1 | -1) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const toggleLayerVisible = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const setLayerOpacity = (id: string, opacity: number) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, opacity } : l));
  };

  // Return the active layer if it matches the wanted type, otherwise create one.
  // flushSync makes the new layer's <canvas> available immediately so the
  // stroke that triggered the creation can draw on it right away.
  const ensureLayerOfType = (type: 'draw' | 'text'): Layer => {
    const current = layers.find(l => l.id === activeLayerId);
    if (current && current.type === type) return current;
    const layer = makeLayer(type);
    flushSync(() => {
      setLayers(prev => [...prev, layer]);
      setActiveLayerId(layer.id);
    });
    return layer;
  };

  const toggleAdvanced = () => {
    const next = !advancedMode;
    setAdvancedMode(next);
    if (next && layers.length === 0) {
      addLayer('draw');
    }
    if (!next) {
      setTool('move');
      setEditingTextId(null);
    }
  };

  // ---------- Advanced mode: undo ----------

  const pushUndo = (entry: UndoEntry) => {
    undoStack.current.push(entry);
    if (undoStack.current.length > 30) undoStack.current.shift();
    setUndoDepth(undoStack.current.length);
  };

  const undo = useCallback(() => {
    const entry = undoStack.current.pop();
    setUndoDepth(undoStack.current.length);
    if (!entry) return;
    if (entry.kind === 'draw') {
      const canvas = layerCanvases.current.get(entry.layerId);
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const img = new Image();
      img.onload = () => {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = entry.dataUrl;
    } else {
      setLayers(entry.layers);
      if (!entry.layers.some(l => l.id === activeLayerId)) {
        setActiveLayerId(entry.layers.length ? entry.layers[entry.layers.length - 1].id : null);
      }
    }
  }, [activeLayerId]);

  useEffect(() => {
    if (!advancedMode) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advancedMode, undo]);

  // ---------- Advanced mode: drawing ----------

  // Convert a pointer position to A4 page coordinates, independent of preview zoom.
  const getPagePoint = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * A4_WIDTH_PX,
      y: ((e.clientY - rect.top) / rect.height) * A4_HEIGHT_PX,
    };
  };

  const getLayerCtx = (layerId: string) => {
    const canvas = layerCanvases.current.get(layerId);
    const ctx = canvas?.getContext('2d');
    if (!ctx) return null;
    ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return ctx;
  };

  const applyStrokeStyle = (ctx: CanvasRenderingContext2D, erase: boolean) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
  };

  const drawShape = (ctx: CanvasRenderingContext2D, shape: Tool, x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath();
    if (shape === 'line') {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    } else if (shape === 'rect') {
      ctx.rect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    } else {
      ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  };

  const clearPreviewCanvas = () => {
    const preview = previewCanvasRef.current;
    const ctx = preview?.getContext('2d');
    if (!preview || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, preview.width, preview.height);
  };

  const handleDrawStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!advancedMode || tool === 'move') return;
    // Stop the browser's default focus/selection behaviour; otherwise the
    // freshly mounted text input is blurred (and emptied) by this same click.
    e.preventDefault();
    const point = getPagePoint(e);

    if (tool === 'text') {
      // Clicking elsewhere while editing commits the open input.
      if (editingTextId) {
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }
      const before = layers;
      const layer = ensureLayerOfType('text');
      const item: TextItem = {
        id: `text-${Date.now()}-${++counters.current.id}`,
        x: point.x,
        y: point.y,
        text: '',
        fontSize,
        color,
      };
      flushSync(() => {
        setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, textItems: [...l.textItems, item] } : l));
        setEditingTextId(item.id);
      });
      pushUndo({ kind: 'layers', layers: before });
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const layer = ensureLayerOfType('draw');
    const canvas = layerCanvases.current.get(layer.id);
    const ctx = getLayerCtx(layer.id);
    if (!canvas || !ctx) return;

    pushUndo({ kind: 'draw', layerId: layer.id, dataUrl: canvas.toDataURL() });
    strokeRef.current = { layerId: layer.id, tool, startX: point.x, startY: point.y, lastX: point.x, lastY: point.y };

    if (tool === 'brush' || tool === 'eraser') {
      applyStrokeStyle(ctx, tool === 'eraser');
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x + 0.01, point.y + 0.01);
      ctx.stroke();
    }
  };

  const handleDrawMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const stroke = strokeRef.current;
    if (!stroke) return;
    const point = getPagePoint(e);

    if (stroke.tool === 'brush' || stroke.tool === 'eraser') {
      const ctx = getLayerCtx(stroke.layerId);
      if (ctx) {
        applyStrokeStyle(ctx, stroke.tool === 'eraser');
        ctx.beginPath();
        ctx.moveTo(stroke.lastX, stroke.lastY);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    } else {
      // Shape tools: live preview on the overlay canvas.
      clearPreviewCanvas();
      const preview = previewCanvasRef.current;
      const ctx = preview?.getContext('2d');
      if (preview && ctx) {
        ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = strokeWidth;
        ctx.globalCompositeOperation = 'source-over';
        drawShape(ctx, stroke.tool, stroke.startX, stroke.startY, point.x, point.y);
      }
    }

    stroke.lastX = point.x;
    stroke.lastY = point.y;
  };

  const handleDrawEnd = () => {
    const stroke = strokeRef.current;
    if (!stroke) return;
    strokeRef.current = null;

    if (stroke.tool === 'line' || stroke.tool === 'rect' || stroke.tool === 'ellipse') {
      clearPreviewCanvas();
      const ctx = getLayerCtx(stroke.layerId);
      if (ctx) {
        applyStrokeStyle(ctx, false);
        drawShape(ctx, stroke.tool, stroke.startX, stroke.startY, stroke.lastX, stroke.lastY);
      }
    }
  };

  // ---------- Advanced mode: text items ----------

  const commitText = (layerId: string, itemId: string, value: string) => {
    setEditingTextId(null);
    const layer = layers.find(l => l.id === layerId);
    const item = layer?.textItems.find(t => t.id === itemId);
    if (!layer || !item) return;
    if (item.text !== '' && item.text !== value) {
      pushUndo({ kind: 'layers', layers });
    }
    if (!value.trim()) {
      setLayers(prev => prev.map(l => l.id === layerId ? { ...l, textItems: l.textItems.filter(t => t.id !== itemId) } : l));
    } else if (item.text !== value) {
      setLayers(prev => prev.map(l => l.id === layerId ? { ...l, textItems: l.textItems.map(t => t.id === itemId ? { ...t, text: value } : t) } : l));
    }
  };

  const handleTextPointerDown = (e: React.PointerEvent<HTMLDivElement>, layerId: string, item: TextItem) => {
    if (!advancedMode || tool !== 'move') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    textDragRef.current = { layerId, itemId: item.id, lastX: e.clientX, lastY: e.clientY, moved: false, before: layers };
  };

  const handleTextPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = textDragRef.current;
    if (!drag) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const dx = ((e.clientX - drag.lastX) / rect.width) * A4_WIDTH_PX;
    const dy = ((e.clientY - drag.lastY) / rect.height) * A4_HEIGHT_PX;
    if (dx === 0 && dy === 0) return;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.moved = true;
    setLayers(prev => prev.map(l => l.id === drag.layerId
      ? { ...l, textItems: l.textItems.map(t => t.id === drag.itemId ? { ...t, x: t.x + dx, y: t.y + dy } : t) }
      : l));
  };

  const handleTextPointerUp = () => {
    const drag = textDragRef.current;
    textDragRef.current = null;
    if (drag?.moved) {
      pushUndo({ kind: 'layers', layers: drag.before });
    }
  };

  const hasContent = image !== null || layers.length > 0;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-100 font-sans overflow-hidden">

      {/* Sidebar Controls - Hidden on Print */}
      <div className="no-print w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 shadow-sm z-10 overflow-y-auto h-auto md:h-full shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shrink-0">
            <Printer size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">A4 Print Studio</h1>
        </div>

        <div className="space-y-4">
          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors group h-48"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-white group-hover:shadow-sm transition-all">
                <Upload className="text-slate-400 group-hover:text-indigo-600" size={24} />
              </div>
              <p className="font-medium text-slate-700">Last opp bilde</p>
              <p className="text-xs text-slate-500 mt-1">Klikk for å velge fil</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Justering</span>
                  <span className="text-xs font-mono text-slate-400">{(image.scale * 100).toFixed(0)}%</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={zoomOut} className="flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700">
                    <ZoomOut size={16} /> Zoom ut
                  </button>
                  <button onClick={zoomIn} className="flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700">
                    <ZoomIn size={16} /> Zoom inn
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                   <button onClick={rotate} className="flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700">
                    <RotateCw size={16} /> Roter
                  </button>
                  <button onClick={fitToPage} className="flex items-center justify-center gap-2 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium text-slate-700">
                    <Maximize size={16} /> Fyll side
                  </button>
                </div>
              </div>

              <button
                onClick={clear}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors text-sm font-medium"
              >
                <Trash2 size={16} /> Fjern bilde
              </button>
            </div>
          )}

          <button
            onClick={toggleAdvanced}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl transition-colors text-sm font-medium border ${
              advancedMode
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Wand2 size={16} /> Avansert modus {advancedMode ? 'på' : 'av'}
          </button>
          {advancedMode && (
            <p className="text-xs text-slate-400 -mt-2">
              Tegn, skriv og bruk lag direkte på arket. Dobbeltklikk på tekst for å redigere.
            </p>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <button
            onClick={handlePrint}
            disabled={!hasContent}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <Printer size={20} />
            Print A4
          </button>
          <p className="text-center text-xs text-slate-400 mt-3">
            Tips: Sjekk at skriverinnstillingene er satt til A4 og "Ingen marger" for best resultat.
          </p>
        </div>
      </div>

      {/* Main Preview Area */}
      <div
        ref={wrapperRef}
        className="flex-1 overflow-hidden p-4 md:p-10 flex items-center justify-center bg-slate-200 relative"
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <div className="no-print absolute top-4 right-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 border border-slate-200 shadow-sm pointer-events-none z-20">
          A4 Forhåndsvisning
        </div>

        {advancedMode && (
          <>
            <Toolbar
              tool={tool}
              onToolChange={setTool}
              color={color}
              onColorChange={setColor}
              strokeWidth={strokeWidth}
              onStrokeWidthChange={setStrokeWidth}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
              canUndo={undoDepth > 0}
              onUndo={undo}
            />
            <LayersPanel
              layers={layers}
              activeLayerId={activeLayerId}
              onSelect={setActiveLayerId}
              onToggleVisible={toggleLayerVisible}
              onDelete={deleteLayer}
              onMove={moveLayer}
              onAddDraw={() => addLayer('draw')}
              onAddText={() => addLayer('text')}
              onOpacityChange={setLayerOpacity}
              hasImage={!!image}
              imageVisible={imageVisible}
              onToggleImageVisible={() => setImageVisible(v => !v)}
            />
          </>
        )}

        {/* A4 Container - Fixed Size 210mm x 297mm */}
        <div
          id="print-container"
          ref={canvasRef}
          className="bg-white shadow-2xl relative overflow-hidden"
          style={{
            width: '210mm',
            height: '297mm',
            transform: `scale(${previewScale})`,
            transformOrigin: 'center center',
            // Ensure it doesn't shrink in flex
            flexShrink: 0,
          }}
        >
          {image && imageVisible && (
            <div
              className="absolute cursor-move origin-top-left"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              style={{
                transform: `translate(${image.x}px, ${image.y}px) scale(${image.scale}) rotate(${image.rotation}deg)`,
                willChange: 'transform',
              }}
            >
              <img
                src={image.src}
                alt="Print preview"
                className="max-w-none pointer-events-none select-none"
                draggable={false}
              />
            </div>
          )}

          {!image && layers.length === 0 && (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 m-4 rounded-xl" style={{width: 'calc(100% - 2rem)', height: 'calc(100% - 2rem)'}}>
              <ImageIcon size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Ingen bilde valgt</p>
            </div>
          )}

          {/* Annotation layers (draw + text), bottom-to-top in array order */}
          {layers.map(layer => layer.type === 'draw' ? (
            <canvas
              key={layer.id}
              ref={el => {
                if (el) {
                  layerCanvases.current.set(layer.id, el);
                } else {
                  layerCanvases.current.delete(layer.id);
                }
              }}
              width={A4_WIDTH_PX * CANVAS_SCALE}
              height={A4_HEIGHT_PX * CANVAS_SCALE}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ opacity: layer.opacity, visibility: layer.visible ? 'visible' : 'hidden' }}
            />
          ) : (
            <div
              key={layer.id}
              className="absolute inset-0 pointer-events-none"
              style={{ opacity: layer.opacity, visibility: layer.visible ? 'visible' : 'hidden' }}
            >
              {layer.textItems.map(item => editingTextId === item.id ? (
                <input
                  key={item.id}
                  autoFocus
                  defaultValue={item.text}
                  className="absolute bg-transparent outline-none border border-dashed border-indigo-400 pointer-events-auto px-1 -mx-1"
                  style={{
                    left: item.x,
                    top: item.y,
                    fontSize: item.fontSize,
                    color: item.color,
                    lineHeight: 1.2,
                    width: '10em',
                    zIndex: 40,
                  }}
                  onPointerDown={e => e.stopPropagation()}
                  onBlur={e => commitText(layer.id, item.id, e.currentTarget.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                  }}
                />
              ) : (
                <div
                  key={item.id}
                  className={`absolute whitespace-pre select-none ${
                    advancedMode && tool === 'move'
                      ? 'pointer-events-auto cursor-move hover:outline-1 hover:outline-dashed hover:outline-indigo-400'
                      : ''
                  }`}
                  style={{ left: item.x, top: item.y, fontSize: item.fontSize, color: item.color, lineHeight: 1.2 }}
                  onPointerDown={e => handleTextPointerDown(e, layer.id, item)}
                  onPointerMove={handleTextPointerMove}
                  onPointerUp={handleTextPointerUp}
                  onDoubleClick={() => advancedMode && setEditingTextId(item.id)}
                >
                  {item.text}
                </div>
              ))}
            </div>
          ))}

          {/* Live preview for shape tools */}
          <canvas
            ref={previewCanvasRef}
            width={A4_WIDTH_PX * CANVAS_SCALE}
            height={A4_HEIGHT_PX * CANVAS_SCALE}
            className="no-print absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 20 }}
          />

          {/* Pointer overlay that captures drawing input */}
          {advancedMode && tool !== 'move' && (
            <div
              className="no-print absolute inset-0"
              style={{ zIndex: 30, cursor: tool === 'text' ? 'text' : 'crosshair', touchAction: 'none' }}
              onPointerDown={handleDrawStart}
              onPointerMove={handleDrawMove}
              onPointerUp={handleDrawEnd}
              onPointerCancel={handleDrawEnd}
            />
          )}
        </div>
      </div>
    </div>
  );
}
