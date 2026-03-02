import React, { useRef, useState, useEffect } from 'react';
import { Upload, Printer, ZoomIn, ZoomOut, Move, RotateCw, Trash2, Image as ImageIcon, Maximize } from 'lucide-react';

interface ImageState {
  src: string;
  scale: number;
  x: number;
  y: number;
  rotation: number;
}

export default function App() {
  const [image, setImage] = useState<ImageState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [previewScale, setPreviewScale] = useState(1);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // A4 dimensions in pixels at 96 DPI (standard screen resolution)
  // 210mm = 793.7px, 297mm = 1122.5px
  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

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
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
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
    window.print();
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
            disabled={!image}
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
          {image ? (
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
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 m-4 rounded-xl" style={{width: 'calc(100% - 2rem)', height: 'calc(100% - 2rem)'}}>
              <ImageIcon size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Ingen bilde valgt</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
