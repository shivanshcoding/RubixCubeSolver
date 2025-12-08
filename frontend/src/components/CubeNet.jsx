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
      <div key={face} className="p-1">
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
      <div
        className="inline-grid gap-2"
        style={{ gridTemplateColumns: "repeat(4, max-content)", gridTemplateRows: "repeat(3, max-content)" }}
      >
        <div className="col-start-2 row-start-1">{faceGrid("U")}</div>
        <div className="col-start-1 row-start-2">{faceGrid("L")}</div>
        <div className="col-start-2 row-start-2">{faceGrid("F")}</div>
        <div className="col-start-3 row-start-2">{faceGrid("R")}</div>
        <div className="col-start-4 row-start-2">{faceGrid("B")}</div>
        <div className="col-start-2 row-start-3">{faceGrid("D")}</div>
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
