"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/ui/Button";

interface Props {
  file: File;
  onCancel: () => void;
  onSave: (imageUrl: string) => void;
}

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

export function ImageCropper({ file, onCancel, onSave }: Props) {
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [background, setBackground] = useState("#ffffff");
  const [useBackground, setUseBackground] = useState(true);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      setSource(image);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function scale() {
    if (!source) return 1;
    return Math.max(CROP_SIZE / source.naturalWidth, CROP_SIZE / source.naturalHeight) * zoom;
  }

  function imagePosition() {
    if (!source) return { x: 0, y: 0, width: 0, height: 0 };
    const factor = scale();
    const width = source.naturalWidth * factor;
    const height = source.naturalHeight * factor;
    return {
      x: (CROP_SIZE - width) / 2 + offset.x,
      y: (CROP_SIZE - height) / 2 + offset.y,
      width,
      height,
    };
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    setOffset({
      x: event.clientX - dragStart.current.x,
      y: event.clientY - dragStart.current.y,
    });
  }

  function save() {
    if (!source) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (useBackground) {
      context.fillStyle = background;
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    }
    const position = imagePosition();
    const ratio = OUTPUT_SIZE / CROP_SIZE;
    context.drawImage(source, position.x * ratio, position.y * ratio, position.width * ratio, position.height * ratio);
    onSave(canvas.toDataURL("image/png"));
  }

  const position = imagePosition();

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex flex-wrap items-start gap-5">
        <div
          className="relative h-[280px] w-[280px] shrink-0 cursor-grab touch-none overflow-hidden rounded-full border-2 border-accent bg-white active:cursor-grabbing"
          onPointerDown={(event) => {
            dragging.current = true;
            dragStart.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={move}
          onPointerUp={() => { dragging.current = false; }}
          onPointerCancel={() => { dragging.current = false; }}
        >
          {source && <img src={source.src} alt="Crop preview" className="absolute max-w-none" style={{ left: position.x, top: position.y, width: position.width, height: position.height }} />}
        </div>
        <div className="min-w-[220px] flex-1 space-y-4">
          <div>
            <p className="text-sm font-semibold">Adjust logo</p>
            <p className="mt-1 text-xs text-muted">Drag the image inside the circle and use zoom to choose the visible area.</p>
          </div>
          <label className="block text-sm text-muted">
            Zoom
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-accent" />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={useBackground} onChange={(event) => setUseBackground(event.target.checked)} className="h-4 w-4 accent-accent" />
            Add solid background for transparent images
          </label>
          {useBackground && <label className="flex items-center gap-3 text-sm text-muted">Background color<input type="color" value={background} onChange={(event) => setBackground(event.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5" /></label>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="button" onClick={save} disabled={!source}>Use this crop</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
