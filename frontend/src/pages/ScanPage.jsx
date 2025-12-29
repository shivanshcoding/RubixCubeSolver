import { useState } from "react";
import { scanFaces, solveCube, validateCube } from "../services/api.js";
import { useNavigate } from "react-router-dom";

import CubeNet from "../components/CubeNet.jsx";
import Cube3DPreview from "../components/Cube3DPreview.jsx";

const FACE_NAMES = ["U", "R", "F", "D", "L", "B"];

// fallback palette if backend doesn't return one
const DEFAULT_PALETTE = [
  { face: "U", color: "#ffffff", label: "Up (U)" },
  { face: "R", color: "#ff0000", label: "Right (R)" },
  { face: "F", color: "#00ff00", label: "Front (F)" },
  { face: "D", color: "#ffff00", label: "Down (D)" },
  { face: "L", color: "#ffa500", label: "Left (L)" },
  { face: "B", color: "#0000ff", label: "Back (B)" },
];

export default function ScanPage() {
  const navigate = useNavigate();

  const [files, setFiles] = useState({
    U: null,
    R: null,
    F: null,
    D: null,
    L: null,
    B: null,
  });
  const [faces, setFaces] = useState(null);
  const [palette, setPalette] = useState(DEFAULT_PALETTE);
  const [activeColor, setActiveColor] = useState("U");

  const [cubeString, setCubeString] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);

  function onFile(face, file) {
    setFiles((prev) => ({ ...prev, [face]: file }));
  }

  async function onScan() {
    setError("");
    setValidated(false);

    if (Object.values(files).some((f) => !f)) {
      setError("Upload all 6 face images.");
      return;
    }

    setLoading(true);
    try {
      const scan = await scanFaces(files);

      setFaces(scan.faces);
      setCubeString(scan.cubeString);
      setPalette(scan.palette || DEFAULT_PALETTE);
    } catch (e) {
      setError(e?.response?.data?.detail?.error || "Scan failed.");
    } finally {
      setLoading(false);
    }
  }

  // === Validation ===
  async function onValidate() {
    setError("");
    const result = await validateCube(cubeString);

    if (!result.valid) {
      setValidated(false);
      setError(result.error);
      return;
    }

    setValidated(true);
  }

  // === Solve ===
  async function onSolve() {
    if (!validated) return setError("Validate before solving.");

    setLoading(true);
    try {
      const solution = await solveCube(cubeString);
      navigate("/solution", {
        state: {
          faces,
          palette,
          solution,
          cubeString,
        },
      });
    } catch (e) {
      setError("Failed to solve.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">AI Photo Scan</h2>

      {!faces && (
        <>
          <p>Upload clear, centered photos of each face.</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FACE_NAMES.map((f) => (
              <div key={f}>
                <label>Face {f}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFile(f, e.target.files?.[0] || null)}
                />
              </div>
            ))}
          </div>

          {Object.values(files).some((f) => f) && (
            <>
              <h3 className="text-lg font-semibold mt-4">
                Uploaded Faces Preview
              </h3>

              <div className="grid grid-cols-4 gap-2 place-items-center my-6 w-fit mx-auto">
                {/* U */}
                <div></div>
                <div>
                  {files.U && (
                    <img
                      src={URL.createObjectURL(files.U)}
                      alt="U"
                      className=" w-32 h-32 object-cover border rounded face-img"
                    />
                  )}
                </div>
                <div></div>
                <div></div>

                {/* L F R B */}
                <div>
                  {files.L && (
                    <img
                      src={URL.createObjectURL(files.L)}
                      alt="L"
                      className="w-32 h-32 object-cover border rounded face-img"
                    />
                  )}
                </div>
                <div>
                  {files.F && (
                    <img
                      src={URL.createObjectURL(files.F)}
                      alt="F"
                      className="w-32 h-32 object-cover border rounded face-img"
                    />
                  )}
                </div>
                <div>
                  {files.R && (
                    <img
                      src={URL.createObjectURL(files.R)}
                      alt="R"
                      className="w-32 h-32 object-cover border rounded face-img"
                    />
                  )}
                </div>
                <div>
                  {files.B && (
                    <img
                      src={URL.createObjectURL(files.B)}
                      alt="B"
                      className="w-32 h-32 object-cover border rounded face-img"
                    />
                  )}
                </div>

                {/* D */}
                <div></div>
                <div>
                  {files.D && (
                    <img
                      src={URL.createObjectURL(files.D)}
                      alt="D"
                      className="w-32 h-32 object-cover border rounded face-img"
                    />
                  )}
                </div>
                <div></div>
                <div></div>
              </div>
            </>
          )}

          {/* Scan Button */}
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
            onClick={onScan}
          >
            Analyze Cube
          </button>
        </>
      )}

      {faces && (
        <>
          <h3 className="text-lg font-semibold">
            Edit / Confirm Detected Cube
          </h3>

          {/* Color Buttons */}
          <div className="flex gap-2 my-2 flex-wrap">
            {palette.map((p) => (
              <button
                key={p.face}
                className={`px-3 py-2 rounded border ${
                  activeColor === p.face ? "ring-2 ring-blue-600" : ""
                }`}
                style={{ backgroundColor: p.color }}
                onClick={() => setActiveColor(p.face)}
              >
                {p.face}
              </button>
            ))}
          </div>

          {/* 2D + 3D */}
          <div className="flex flex-wrap gap-4 items-start">
            <CubeNet
              faces={faces}
              setFaces={setFaces}
              activeColor={activeColor}
              palette={palette}
            />
            <Cube3DPreview faces={faces} palette={palette} />
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="flex gap-2 mt-4">
            {!validated && (
              <button
                onClick={onValidate}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Validate Cube
              </button>
            )}
            {validated && (
              <button
                onClick={onSolve}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Solve Cube
              </button>
            )}
            <button
              className="bg-gray-300 px-3 py-2 rounded"
              onClick={() => {
                setFaces(null);
                setValidated(false);
                setError("");
              }}
            >
              Reset
            </button>
          </div>
        </>
      )}

      {loading && <div>Processing...</div>}
    </div>
  );
}
