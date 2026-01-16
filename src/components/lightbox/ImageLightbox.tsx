import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, ExternalLink, Download } from "lucide-react";
import { cn } from "@/lib/utils";

export type LightboxSlide = {
  src: string;
  alt?: string;
  title?: string;
  downloadUrl?: string;
};

type Props = {
  open: boolean;
  slides: LightboxSlide[];
  index: number;
  onClose: () => void;
  onIndexChange?: (nextIndex: number) => void;
  className?: string;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function ImageLightbox({
  open,
  slides,
  index,
  onClose,
  onIndexChange,
  className,
}: Props) {
  const slide = slides[index];
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    pointerId: number;
  } | null>(null);

  const canPrev = index > 0;
  const canNext = index < slides.length - 1;

  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const goPrev = () => {
    if (!canPrev) return;
    onIndexChange?.(index - 1);
  };

  const goNext = () => {
    if (!canNext) return;
    onIndexChange?.(index + 1);
  };

  // Reset zoom/pan when slide changes or opens.
  useEffect(() => {
    if (!open) return;
    resetView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keyboard shortcuts.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "+" || e.key === "=") setScale((s) => clamp(s * 1.15, 1, 6));
      if (e.key === "-" || e.key === "_") setScale((s) => clamp(s / 1.15, 1, 6));
      if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, slides.length]);

  const safeSlide = useMemo(() => {
    if (!slide?.src) return null;
    return slide;
  }, [slide]);

  if (!open || slides.length === 0 || !safeSlide) return null;

  const onWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    const factor = direction > 0 ? 1.1 : 1 / 1.1;
    setScale((s) => clamp(s * factor, 1, 6));
  };

  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (scale <= 1) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      pointerId: e.pointerId,
    };
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragRef.current) return;
    if (dragRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    // Soft clamp — we don't know exact dimensions, but this keeps it sane.
    const max = (scale - 1) * 240;
    setOffset({
      x: clamp(dragRef.current.startOffsetX + dx, -max, max),
      y: clamp(dragRef.current.startOffsetY + dy, -max, max),
    });
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (!dragRef.current) return;
    if (dragRef.current.pointerId !== e.pointerId) return;
    dragRef.current = null;
  };

  const onDoubleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setScale((s) => (s === 1 ? 2 : 1));
    setOffset({ x: 0, y: 0 });
  };

  const portal = (
    <div
      className={cn(
        "fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm",
        "animate-in fade-in duration-150",
        className
      )}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      {/* Top bar */}
      <div
        className="absolute top-0 inset-x-0 p-3 flex items-center justify-between gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="text-white text-sm font-medium truncate">
            {safeSlide.title ?? safeSlide.alt ?? "Image"}
          </div>
          <div className="text-white/50 text-xs">
            {index + 1} / {slides.length}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={safeSlide.src}
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 flex items-center gap-2 text-sm"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
            Open
          </a>
          <a
            href={safeSlide.downloadUrl ?? safeSlide.src}
            download
            className="h-9 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 flex items-center gap-2 text-sm"
            title="Download"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white/90"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div
        className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={goPrev}
          disabled={!canPrev}
          className={cn(
            "h-10 w-10 grid place-items-center rounded-xl border text-white/90",
            canPrev ? "bg-white/10 hover:bg-white/15 border-white/10" : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
          )}
          title="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setScale((s) => clamp(s / 1.15, 1, 6))}
          className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90"
          title="Zoom out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={() => setScale((s) => clamp(s * 1.15, 1, 6))}
          className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90"
          title="Zoom in"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={resetView}
          className="h-10 w-10 grid place-items-center rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white/90"
          title="Reset view"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button
          onClick={goNext}
          disabled={!canNext}
          className={cn(
            "h-10 w-10 grid place-items-center rounded-xl border text-white/90",
            canNext ? "bg-white/10 hover:bg-white/15 border-white/10" : "bg-white/5 border-white/5 opacity-50 cursor-not-allowed"
          )}
          title="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Stage */}
      <div
        className="absolute inset-0 flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "w-full h-full max-w-[min(1200px,100%)] max-h-[min(78vh,100%)]",
            "rounded-2xl bg-black/25 border border-white/10 overflow-hidden",
            "touch-none select-none"
          )}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          <div className="w-full h-full grid place-items-center bg-black/30">
            <img
              src={safeSlide.src}
              alt={safeSlide.alt ?? "Image"}
              className={cn(
                "max-w-full max-h-full object-contain",
                scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
              )}
              style={{
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
                transition: dragRef.current ? "none" : "transform 120ms ease-out",
                willChange: "transform",
              }}
              draggable={false}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(portal, document.body);
}

