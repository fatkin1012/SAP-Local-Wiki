"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PictureViewerProps = {
  isOpen: boolean;
  images: string[];
  initialIndex: number;
  title: string;
  onClose: () => void;
  onSaveAnnotated: (annotatedImage: string, sourceIndex: number) => void;
};

export default function PictureViewer({
  isOpen,
  images,
  initialIndex,
  title,
  onClose,
  onSaveAnnotated,
}: PictureViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [eraseEnabled, setEraseEnabled] = useState(false);
  const [brushColor, setBrushColor] = useState("#ff3344");
  const [brushSize, setBrushSize] = useState(4);
  const [undoCount, setUndoCount] = useState(0);
  const [saving, setSaving] = useState(false);

  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const hasDrawnInStrokeRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<string[]>([]);

  const currentImage = useMemo(() => images[currentIndex], [currentIndex, images]);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setDrawEnabled(false);
      setEraseEnabled(false);
    }
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, isOpen, onClose]);

  const saveHistorySnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const snapshot = canvas.toDataURL("image/png");
    if (historyRef.current[historyRef.current.length - 1] === snapshot) {
      return;
    }

    historyRef.current = [...historyRef.current, snapshot];
    setUndoCount(historyRef.current.length - 1);
  };

  const syncCanvasSize = () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) {
      return;
    }

    canvas.width = image.clientWidth;
    canvas.height = image.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    historyRef.current = [canvas.toDataURL("image/png")];
    setUndoCount(0);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onResize = () => syncCanvasSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen, currentIndex]);

  const drawLine = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.globalCompositeOperation = eraseEnabled ? "destination-out" : "source-over";
    ctx.strokeStyle = eraseEnabled ? "rgba(0, 0, 0, 1)" : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawEnabled) {
      return;
    }

    const point = getCanvasPoint(e);
    drawingRef.current = true;
    hasDrawnInStrokeRef.current = true;
    lastPointRef.current = point;
    drawLine(point, point);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawEnabled || !drawingRef.current || !lastPointRef.current) {
      return;
    }

    const point = getCanvasPoint(e);
    drawLine(lastPointRef.current, point);
    hasDrawnInStrokeRef.current = true;
    lastPointRef.current = point;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingRef.current && hasDrawnInStrokeRef.current) {
      saveHistorySnapshot();
    }

    drawingRef.current = false;
    hasDrawnInStrokeRef.current = false;
    lastPointRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) {
      return;
    }

    historyRef.current = historyRef.current.slice(0, -1);
    const previousSnapshot = historyRef.current[historyRef.current.length - 1];
    if (!previousSnapshot) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setUndoCount(historyRef.current.length - 1);
    };
    img.src = previousSnapshot;
  };

  const handleClearMarks = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveHistorySnapshot();
  };

  const exportAnnotatedImage = async () => {
    const baseImageSrc = images[currentIndex];
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!baseImageSrc || !canvas || !image) {
      return;
    }

    setSaving(true);

    try {
      const merged = await new Promise<string>((resolve, reject) => {
        const base = new Image();
        base.onload = () => {
          const mergedCanvas = document.createElement("canvas");
          mergedCanvas.width = base.naturalWidth;
          mergedCanvas.height = base.naturalHeight;

          const ctx = mergedCanvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not create drawing context."));
            return;
          }

          ctx.drawImage(base, 0, 0, mergedCanvas.width, mergedCanvas.height);
          ctx.drawImage(canvas, 0, 0, mergedCanvas.width, mergedCanvas.height);
          resolve(mergedCanvas.toDataURL("image/png"));
        };
        base.onerror = () => reject(new Error("Failed to load source image."));
        base.src = baseImageSrc;
      });

      onSaveAnnotated(merged, currentIndex);
      handleClearMarks();
      setDrawEnabled(false);
      setEraseEnabled(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || images.length === 0 || !currentImage) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-6xl rounded-2xl border border-white/20 bg-slate-950/95 p-3 text-white md:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-emerald-200">
            {title} - Image {currentIndex + 1} / {images.length}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
              className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold hover:bg-white/10"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
              className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold hover:bg-white/10"
            >
              Next
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-rose-300/60 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-300/10"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-white/5 p-2">
          <button
            type="button"
            onClick={() => setDrawEnabled((prev) => !prev)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              drawEnabled ? "bg-emerald-500 text-white" : "border border-white/25 text-emerald-100"
            }`}
          >
            {drawEnabled ? "Drawing On" : "Enable Draw"}
          </button>

          <button
            type="button"
            onClick={() => {
              setEraseEnabled((prev) => !prev);
              if (!drawEnabled) {
                setDrawEnabled(true);
              }
            }}
            className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
              eraseEnabled ? "bg-amber-500 text-white" : "border border-white/25 text-amber-100"
            }`}
          >
            {eraseEnabled ? "Eraser On" : "Eraser"}
          </button>

          <label className="text-xs text-white/80">Color</label>
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="h-8 w-10 rounded border border-white/20 bg-transparent"
            aria-label="Brush color"
          />

          <label htmlFor="brush-size" className="text-xs text-white/80">
            Brush
          </label>
          <input
            id="brush-size"
            type="range"
            min={2}
            max={18}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="accent-emerald-400"
          />

          <button
            type="button"
            onClick={handleUndo}
            disabled={undoCount === 0}
            className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Undo
          </button>

          <button
            type="button"
            onClick={handleClearMarks}
            className="rounded-lg border border-white/25 px-3 py-1 text-xs font-semibold hover:bg-white/10"
          >
            Clear Marks
          </button>

          <button
            type="button"
            onClick={exportAnnotatedImage}
            disabled={saving}
            className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Marked Copy"}
          </button>
        </div>

        <div className="flex max-h-[70vh] justify-center overflow-auto rounded-xl border border-white/10 bg-black/30 p-2">
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={currentImage}
              alt={`Viewer image ${currentIndex + 1}`}
              className="max-h-[66vh] rounded-lg object-contain"
              onLoad={syncCanvasSize}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 ${drawEnabled ? eraseEnabled ? "cursor-cell" : "cursor-crosshair" : "pointer-events-none"}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
