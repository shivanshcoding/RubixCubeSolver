import { useMemo } from "react";

const FACE_NAMES = ["U", "R", "F", "D", "L", "B"];

export default function CubeNet({ faces, setFaces, activeColor, palette }) {
  const counts = useMemo(() => {
    const c = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
    FACE_NAMES.forEach((f) => {
      faces[f].flat().forEach((v) => {
        c[v] = (c[v] || 0) + 1;
      });
    });
    return c;
  }, [faces]);

  function paintSticker(face, r, c) {
    // keep centers locked to canonical face
    if (r === 1 && c === 1) return;
    const nextGrid = faces[face].map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? activeColor : cell))
    );
    setFaces((prev) => ({ ...prev, [face]: nextGrid }));
  }

  const COLORS = palette.reduce((acc, item) => {
    acc[item.face] = item.color;
    return acc;
  }, {});

  function faceGrid(face) {
    return (
      <div key={face} className="p-3">
        <div className="mb-2 font-medium">Face {face}</div>
        <div className="grid grid-cols-3 gap-1">
          {faces[face].map((row, ri) =>
            row.map((cell, ci) => (
              <button
                key={`${face}-${ri}-${ci}`}
                onClick={() => paintSticker(face, ri, ci)}
                className="w-12 h-12 border rounded"
                style={{ backgroundColor: COLORS[cell] }}
                aria-label={`Sticker ${face}-${ri}-${ci}`}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FACE_NAMES.map((f) => faceGrid(f))}
      </div>
      <div className="mt-4 grid grid-cols-6 gap-2 text-center text-xs">
        {FACE_NAMES.map((f) => (
          <div key={f} className="bg-white rounded border p-2">
            {f}: {counts[f]}/9
          </div>
        ))}
      </div>
    </div>
  );
}
