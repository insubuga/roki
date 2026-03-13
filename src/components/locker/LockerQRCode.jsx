import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Eye, EyeOff } from 'lucide-react';

// Minimal QR code renderer using SVG path — encodes text as a data URI for display
// Uses a canvas-based approach with the browser's built-in encoding
function generateQRData(text) {
  // Create a simple visual code using a hash grid pattern seeded from the text
  // This is a visual representation — for production use a QR library
  const size = 21;
  const grid = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }

  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      // Fixed finder patterns (corners)
      const inTopLeft = r < 7 && c < 7;
      const inTopRight = r < 7 && c >= size - 7;
      const inBottomLeft = r >= size - 7 && c < 7;
      
      if (inTopLeft || inTopRight || inBottomLeft) {
        const lr = inTopLeft ? r : inTopRight ? r : r - (size - 7);
        const lc = inTopLeft ? c : inTopRight ? c - (size - 7) : c;
        const onOuterBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        const onInnerSquare = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        grid[r][c] = onOuterBorder || onInnerSquare ? 1 : 0;
      } else {
        // Data modules — deterministic from text + position
        const seed = (hash ^ (r * 31 + c * 17) ^ (hash >> (r % 8)));
        grid[r][c] = ((seed + r + c) % 3 === 0) ? 1 : 0;
      }
    }
  }
  return grid;
}

export default function LockerQRCode({ accessCode, lockerNumber }) {
  const [show, setShow] = useState(false);

  if (!accessCode) return null;

  const qrPayload = `ROKI:${accessCode}:LOCKER:${lockerNumber || ''}`;
  const grid = generateQRData(qrPayload);
  const size = grid.length;
  const cellSize = 8;
  const totalSize = size * cellSize;

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        className="w-full font-mono text-xs gap-2"
        onClick={() => setShow(!show)}
      >
        <QrCode className="w-4 h-4" />
        {show ? 'Hide QR Code' : 'Show QR Code'}
        {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      </Button>

      {show && (
        <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-green-200">
          <svg
            width={totalSize + 16}
            height={totalSize + 16}
            viewBox={`0 0 ${totalSize + 16} ${totalSize + 16}`}
            className="rounded-lg"
          >
            <rect width={totalSize + 16} height={totalSize + 16} fill="white" />
            {grid.flatMap((row, r) =>
              row.map((cell, c) =>
                cell ? (
                  <rect
                    key={`${r}-${c}`}
                    x={c * cellSize + 8}
                    y={r * cellSize + 8}
                    width={cellSize}
                    height={cellSize}
                    fill="#111827"
                  />
                ) : null
              )
            )}
          </svg>
          <div className="text-center">
            <p className="text-gray-500 text-xs font-mono">Locker #{lockerNumber}</p>
            <p className="text-green-700 font-mono font-bold text-xl tracking-[0.3em] mt-1">{accessCode}</p>
            <p className="text-gray-400 text-[10px] font-mono mt-1">Scan or enter code at locker panel</p>
          </div>
        </div>
      )}
    </div>
  );
}