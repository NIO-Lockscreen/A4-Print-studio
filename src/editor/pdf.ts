import type { PDFDocumentProxy, PDFWorker } from 'pdfjs-dist';

type PdfJs = typeof import('pdfjs-dist');

export interface PdfSource {
  doc: PDFDocumentProxy;
  fileName: string;
  page: number;
  pageCount: number;
}

export interface RenderedPdfPage {
  src: string;
  natWidth: number;
  natHeight: number;
}

// PDF units are points (72 per inch); the page layout uses 96 CSS px per inch.
const PT_TO_PX = 96 / 72;

// Rasterise so the long side gets 300 DPI when printed on A4 (297 mm = 3508 px).
const RENDER_LONG_SIDE = 3508;

// CMaps, standard fonts, ICC profiles and WASM image decoders (e.g. JBIG2 in
// scanned documents) are fetched on demand; vite.config.ts serves them here.
const assetBase = () => new URL(`${import.meta.env.BASE_URL}pdfjs/`, window.location.href).href;

let pdfjsPromise: Promise<{ pdfjs: PdfJs; worker: PDFWorker }> | null = null;

// pdf.js is large, so it is only downloaded the first time a PDF is opened.
// The legacy build includes polyfills for browsers without the newest JS APIs.
const loadPdfjs = () => {
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, workerUrl]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;
    // One worker shared by every imported document.
    return { pdfjs, worker: new pdfjs.PDFWorker() };
  }).catch(err => {
    // Allow a retry, e.g. after a network hiccup.
    pdfjsPromise = null;
    throw err;
  });
  return pdfjsPromise;
};

export const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

// Resolves to null if the user cancels the password prompt.
export async function openPdf(file: File): Promise<PDFDocumentProxy | null> {
  const { pdfjs, worker } = await loadPdfjs();
  const base = assetBase();
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    worker,
    cMapUrl: `${base}cmaps/`,
    standardFontDataUrl: `${base}standard_fonts/`,
    iccUrl: `${base}iccs/`,
    wasmUrl: `${base}wasm/`,
  });

  let cancelled = false;
  task.onPassword = (updatePassword: (password: string) => void, reason: number) => {
    const password = window.prompt(reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD
      ? 'Feil passord. Prøv igjen:'
      : 'PDF-en er passordbeskyttet. Skriv inn passordet:');
    if (password === null) {
      cancelled = true;
      void task.destroy();
    } else {
      updatePassword(password);
    }
  };

  try {
    return await task.promise;
  } catch (err) {
    if (cancelled) return null;
    throw err;
  }
}

export async function renderPdfPage(doc: PDFDocumentProxy, pageNumber: number): Promise<RenderedPdfPage> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: RENDER_LONG_SIDE / Math.max(base.width, base.height) });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvas, viewport, intent: 'print' }).promise;
  page.cleanup();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode PDF page'))), 'image/png');
  });
  // Free the large backing store right away instead of waiting for GC.
  canvas.width = 0;
  canvas.height = 0;

  // The object URL is never revoked: undo history may still point at it.
  return {
    src: URL.createObjectURL(blob),
    natWidth: base.width * PT_TO_PX,
    natHeight: base.height * PT_TO_PX,
  };
}
