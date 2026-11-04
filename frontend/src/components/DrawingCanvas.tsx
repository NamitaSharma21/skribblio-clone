import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawPoint, DrawStroke } from '../types.js';
import { Socket } from 'socket.io-client';
import { Paintbrush, Eraser, PaintBucket, Undo, Trash2 } from 'lucide-react';

interface DrawingCanvasProps {
  socket: Socket;
  isDrawer: boolean;
  initialStrokes?: DrawStroke[];
}

export const PALETTE_COLORS = [
  '#000000', '#ffffff', '#6b7280', '#9ca3af',
  '#ef4444', '#b91c1c', '#f97316', '#7c2d12',
  '#f59e0b', '#fde047', '#10b981', '#047857',
  '#06b6d4', '#0284c7', '#3b82f6', '#1d4ed8',
  '#8b5cf6', '#6d28d9', '#ec4899', '#be185d',
  '#f43f5e', '#a855f7'
];

export const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 8 },
  { label: 'L', size: 16 },
  { label: 'XL', size: 30 }
];

const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 600;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  socket,
  isDrawer,
  initialStrokes = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<DrawStroke[]>([...initialStrokes]);
  const isDrawingRef = useRef<boolean>(false);
  const currentStrokeRef = useRef<DrawStroke | null>(null);

  // Tool state
  const [currentTool, setCurrentTool] = useState<'brush' | 'eraser' | 'fill'>('brush');
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [currentSize, setCurrentSize] = useState<number>(8);

  // Redraw all strokes from scratch
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);

    // Replay all strokes
    for (const stroke of strokesRef.current) {
      if (stroke.tool === 'fill' && stroke.fillPoint) {
        applyFloodFill(ctx, stroke.fillPoint.x, stroke.fillPoint.y, stroke.color);
      } else if (stroke.points.length > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.lineWidth = stroke.size;

        const first = stroke.points[0];
        ctx.moveTo(first.x, first.y);

        if (stroke.points.length === 1) {
          ctx.lineTo(first.x + 0.1, first.y + 0.1);
        } else {
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  }, []);

  // Set up Canvas and Remote Socket Listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = VIRTUAL_WIDTH;
    canvas.height = VIRTUAL_HEIGHT;

    redrawCanvas();

    // Socket Event: Remote draw_start
    const handleRemoteDrawStart = (data: { x: number; y: number; color: string; size: number; tool: 'brush' | 'eraser' | 'fill' }) => {
      const stroke: DrawStroke = {
        id: Math.random().toString(36).substring(2, 9),
        tool: data.tool,
        color: data.color,
        size: data.size,
        points: [{ x: data.x, y: data.y }]
      };
      currentStrokeRef.current = stroke;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = data.tool === 'eraser' ? '#ffffff' : data.color;
        ctx.lineWidth = data.size;
        ctx.moveTo(data.x, data.y);
      }
    };

    // Socket Event: Remote draw_move
    const handleRemoteDrawMove = (data: { x: number; y: number }) => {
      const ctx = canvas.getContext('2d');
      if (ctx && currentStrokeRef.current) {
        currentStrokeRef.current.points.push({ x: data.x, y: data.y });
        ctx.lineTo(data.x, data.y);
        ctx.stroke();
      }
    };

    // Socket Event: Remote draw_end
    const handleRemoteDrawEnd = () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.restore();
      }
      if (currentStrokeRef.current) {
        strokesRef.current.push(currentStrokeRef.current);
        currentStrokeRef.current = null;
      }
    };

    // Socket Event: Remote draw_undo
    const handleRemoteDrawUndo = () => {
      strokesRef.current.pop();
      redrawCanvas();
    };

    // Socket Event: Remote canvas_clear
    const handleRemoteCanvasClear = () => {
      strokesRef.current = [];
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      }
    };

    // Socket Event: Remote draw_fill
    const handleRemoteDrawFill = (data: { x: number; y: number; color: string }) => {
      const fillStroke: DrawStroke = {
        id: Math.random().toString(36).substring(2, 9),
        tool: 'fill',
        color: data.color,
        size: 0,
        points: [],
        fillPoint: { x: data.x, y: data.y }
      };
      strokesRef.current.push(fillStroke);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        applyFloodFill(ctx, data.x, data.y, data.color);
      }
    };

    // Socket Event: Canvas history (e.g. on join or round start)
    const handleCanvasHistory = (data: { strokes: DrawStroke[] }) => {
      strokesRef.current = data.strokes || [];
      redrawCanvas();
    };

    socket.on('draw_start', handleRemoteDrawStart);
    socket.on('draw_move', handleRemoteDrawMove);
    socket.on('draw_end', handleRemoteDrawEnd);
    socket.on('draw_undo', handleRemoteDrawUndo);
    socket.on('canvas_clear', handleRemoteCanvasClear);
    socket.on('draw_fill', handleRemoteDrawFill);
    socket.on('canvas_history', handleCanvasHistory);

    return () => {
      socket.off('draw_start', handleRemoteDrawStart);
      socket.off('draw_move', handleRemoteDrawMove);
      socket.off('draw_end', handleRemoteDrawEnd);
      socket.off('draw_undo', handleRemoteDrawUndo);
      socket.off('canvas_clear', handleRemoteCanvasClear);
      socket.off('draw_fill', handleRemoteDrawFill);
      socket.off('canvas_history', handleCanvasHistory);
    };
  }, [socket, redrawCanvas]);

  // Request canvas history when isDrawer changes or on initial mount
  useEffect(() => {
    socket.emit('request_canvas_history');
  }, [socket, isDrawer]);

  // Convert mouse or touch event coordinates to virtual 800x600 coordinates
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): DrawPoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY)
    };
  };

  // Flood fill algorithm
  const applyFloodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillHex: string) => {
    const imgData = ctx.getImageData(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
    const data = imgData.data;

    // Convert hex to rgb
    const r = parseInt(fillHex.slice(1, 3), 16);
    const g = parseInt(fillHex.slice(3, 5), 16);
    const b = parseInt(fillHex.slice(5, 7), 16);

    const startIndex = (startY * VIRTUAL_WIDTH + startX) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    // If target color is already same as fill color, return
    if (targetR === r && targetG === g && targetB === b && targetA === 255) return;

    // Breadth-first search queue
    const queue: number[] = [startX, startY];
    const visited = new Uint8Array(VIRTUAL_WIDTH * VIRTUAL_HEIGHT);

    const matchTarget = (x: number, y: number) => {
      const idx = (y * VIRTUAL_WIDTH + x) * 4;
      return (
        Math.abs(data[idx] - targetR) < 30 &&
        Math.abs(data[idx + 1] - targetG) < 30 &&
        Math.abs(data[idx + 2] - targetB) < 30 &&
        data[idx + 3] > 0
      );
    };

    while (queue.length > 0) {
      const cy = queue.pop()!;
      const cx = queue.pop()!;
      const pos = cy * VIRTUAL_WIDTH + cx;

      if (visited[pos]) continue;
      visited[pos] = 1;

      const idx = pos * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;

      if (cx > 0 && !visited[pos - 1] && matchTarget(cx - 1, cy)) {
        queue.push(cx - 1, cy);
      }
      if (cx < VIRTUAL_WIDTH - 1 && !visited[pos + 1] && matchTarget(cx + 1, cy)) {
        queue.push(cx + 1, cy);
      }
      if (cy > 0 && !visited[pos - VIRTUAL_WIDTH] && matchTarget(cx, cy - 1)) {
        queue.push(cx, cy - 1);
      }
      if (cy < VIRTUAL_HEIGHT - 1 && !visited[pos + VIRTUAL_WIDTH] && matchTarget(cx, cy + 1)) {
        queue.push(cx, cy + 1);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Drawing event handlers
  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const pt = getCoordinates(e);
    if (!pt) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'fill') {
      applyFloodFill(ctx, pt.x, pt.y, currentColor);
      const fillStroke: DrawStroke = {
        id: Math.random().toString(36).substring(2, 9),
        tool: 'fill',
        color: currentColor,
        size: 0,
        points: [],
        fillPoint: pt
      };
      strokesRef.current.push(fillStroke);
      socket.emit('draw_fill', { x: pt.x, y: pt.y, color: currentColor });
      return;
    }

    isDrawingRef.current = true;
    const drawColor = currentTool === 'eraser' ? '#ffffff' : currentColor;

    currentStrokeRef.current = {
      id: Math.random().toString(36).substring(2, 9),
      tool: currentTool,
      color: drawColor,
      size: currentSize,
      points: [pt]
    };

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = currentSize;
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 0.1, pt.y + 0.1);
    ctx.stroke();

    socket.emit('draw_start', {
      x: pt.x,
      y: pt.y,
      color: drawColor,
      size: currentSize,
      tool: currentTool
    });
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !isDrawingRef.current || !currentStrokeRef.current) return;
    const pt = getCoordinates(e);
    if (!pt) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    currentStrokeRef.current.points.push(pt);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();

    socket.emit('draw_move', { x: pt.x, y: pt.y });
  };

  const handleEnd = () => {
    if (!isDrawer || !isDrawingRef.current) return;
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.restore();
    }

    if (currentStrokeRef.current) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }

    socket.emit('draw_end');
  };

  const handleUndo = () => {
    if (!isDrawer) return;
    strokesRef.current.pop();
    redrawCanvas();
    socket.emit('draw_undo');
  };

  const handleClear = () => {
    if (!isDrawer) return;
    strokesRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      }
    }
    socket.emit('canvas_clear');
  };

  return (
    <div className="drawing-canvas-container">
      {/* Canvas Area */}
      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          className={`skribbl-canvas ${isDrawer ? 'canvas-drawable' : 'canvas-readonly'}`}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        {!isDrawer && (
          <div className="canvas-spectator-badge">Spectating</div>
        )}
      </div>

      {/* Drawing Toolbar (Visible to Drawer only) */}
      {isDrawer && (
        <div className="drawing-toolbar">
          {/* Tools: Brush, Eraser, Fill */}
          <div className="tool-group">
            <button
              type="button"
              className={`tool-btn ${currentTool === 'brush' ? 'active' : ''}`}
              onClick={() => setCurrentTool('brush')}
              title="Brush / Pen"
            >
              <Paintbrush size={18} />
            </button>
            <button
              type="button"
              className={`tool-btn ${currentTool === 'eraser' ? 'active' : ''}`}
              onClick={() => setCurrentTool('eraser')}
              title="Eraser"
            >
              <Eraser size={18} />
            </button>
            <button
              type="button"
              className={`tool-btn ${currentTool === 'fill' ? 'active' : ''}`}
              onClick={() => setCurrentTool('fill')}
              title="Fill Bucket"
            >
              <PaintBucket size={18} />
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Brush Sizes */}
          <div className="size-group">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.size}
                type="button"
                className={`size-btn ${currentSize === b.size ? 'active' : ''}`}
                onClick={() => setCurrentSize(b.size)}
                title={`Size ${b.label}`}
              >
                <span
                  className="size-dot"
                  style={{
                    width: Math.min(22, Math.max(6, b.size * 0.7)),
                    height: Math.min(22, Math.max(6, b.size * 0.7)),
                    backgroundColor: currentTool === 'eraser' ? '#94a3b8' : currentColor
                  }}
                />
              </button>
            ))}
          </div>

          <div className="toolbar-divider" />

          {/* Color Palette */}
          <div className="color-group">
            <div className="palette-grid">
              {PALETTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`palette-color ${currentColor === c && currentTool !== 'eraser' ? 'active' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setCurrentColor(c);
                    if (currentTool === 'eraser') setCurrentTool('brush');
                  }}
                  title={c}
                />
              ))}
            </div>

            {/* Custom Color Input */}
            <label className="custom-color-picker" title="Pick custom color">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => {
                  setCurrentColor(e.target.value);
                  if (currentTool === 'eraser') setCurrentTool('brush');
                }}
              />
              <span className="picker-preview" style={{ backgroundColor: currentColor }} />
            </label>
          </div>

          <div className="toolbar-divider" />

          {/* Action buttons: Undo & Clear */}
          <div className="action-group">
            <button
              type="button"
              className="action-btn undo-btn"
              onClick={handleUndo}
              title="Undo last stroke"
            >
              <Undo size={18} />
              <span>Undo</span>
            </button>
            <button
              type="button"
              className="action-btn clear-btn"
              onClick={handleClear}
              title="Clear entire canvas"
            >
              <Trash2 size={18} />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
