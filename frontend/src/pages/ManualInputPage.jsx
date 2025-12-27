import { useMemo, useState } from "react";
import CubeNet from "../components/CubeNet.jsx";
import { solveCube, validateCube } from "../services/api.js";
import { useNavigate } from "react-router-dom";
import Cube3DPreview from "../components/Cube3DPreview.jsx";

const FACE_NAMES = ["U", "R", "F", "D", "L", "B"];

const DEFAULT_FACE_GRIDS = {
  U: [
    ["U", "U", "U"],
    ["U", "U", "U"],
    ["U", "U", "U"],
  ],
  R: [
    ["R", "R", "R"],
    ["R", "R", "R"],
    ["R", "R", "R"],
  ],
  F: [
    ["F", "F", "F"],
    ["F", "F", "F"],
    ["F", "F", "F"],
  ],
  D: [
    ["D", "D", "D"],
    ["D", "D", "D"],
    ["D", "D", "D"],
  ],
  L: [
    ["L", "L", "L"],
    ["L", "L", "L"],
    ["L", "L", "L"],
  ],
  B: [
    ["B", "B", "B"],
    ["B", "B", "B"],
    ["B", "B", "B"],
  ],
};

const COLOR_PALETTE = [
  { face: "U", color: "#ffffff", label: "Up Face(U)" },
  { face: "R", color: "#ff0000", label: "Right Face(R)" },
  { face: "F", color: "#00ff00", label: "Front Face(F)" },
  { face: "D", color: "#ffff00", label: "Down Face(D)" },
  { face: "L", color: "#ffa500", label: "Left Face(L)" },
  { face: "B", color: "#0000ff", label: "Back Face(B)" },
];

export default function ManualInputPage() {
  const navigate = useNavigate();
  const [step1_done, setStep1_done] = useState(false);
  const [palette, setPalette] = useState(COLOR_PALETTE);
  const [faces, setFaces] = useState(DEFAULT_FACE_GRIDS);
  const [activeColor, setActiveColor] = useState("U");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);

  const counts = useMemo(() => {
    const c = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
    FACE_NAMES.forEach((f) => {
      faces[f].flat().forEach((v) => {
        c[v] = (c[v] || 0) + 1;
      });
    });
    return c;
  }, [faces]);

  function isCountsValid() {
    return FACE_NAMES.every((f) => counts[f] === 9);
  }
  async function onValidate() {
    setError("");

    if (!isCountsValid()) {
      setValidated(false);
      setError("Each face letter must appear exactly 9 times.");
      return;
    }

    const cubeString = ["U", "R", "F", "D", "L", "B"]
      .map((face) => faces[face].flat().join(""))
      .join("");

    const result = await validateCube(cubeString);

    if (!result.valid) {
      setValidated(false);
      setError(result.error);
      return;
    }

    setValidated(true);
  }

async function onSolve() {
  if (!validated) {
    setError("Cube must be validated before solving.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    const cubeString = ["U","R","F","D","L","B"]
      .map((face) => faces[face].flat().join(""))
      .join("");

    const res = await solveCube(cubeString); // backend response

    navigate("/solution", {
      state: {
        faces,
        palette,
        res,
      },
    });

  } catch (e) {
    const msg =
      e?.response?.data?.detail?.error ||
      e?.message ||
      "Failed to solve.";
    setError(msg);
  } finally {
    setLoading(false);
  }
}


  function onReset() {
    setFaces(DEFAULT_FACE_GRIDS);
    setError("");
    setValidated(false);
  }
  const handleSubmit = (e) => {
    e.preventDefault();
    setStep1_done(true);
    console.log("Current palette:", palette);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Welcome to the Manual Input Page
      </h2>
      <p className="text-sm text-gray-600">
        Follow the given instructions to input the cube manually.
      </p>

      {step1_done ? (
        <div>
          <h2>Selected Colors</h2>
          <ul>
            {palette.map((p) => (
              <li key={p.face}>
                {p.label}: {p.color}
                <span
                  style={{
                    display: "inline-block",
                    width: "16px",
                    height: "16px",
                    backgroundColor: p.color,
                    marginLeft: "8px",
                  }}
                ></span>
              </li>
            ))}
          </ul>
          <div>
            <p>Wanna change the colours? </p>
            <button type="button" onClick={() => setStep1_done(false)}>
              Go to Step1
            </button>
          </div>
        </div>
      ) : (
        // your existing Step 1 UI
        <div className="step1">
          <h2>
            <b>Step 1:</b> Choose Your Cube Colors
          </h2>

          <ol className="instructions-list">
            <li>
              Hold the cube with its <b>Front</b> face facing you and <b>Up</b>{" "}
              face facing up.
            </li>
            <li>
              <b>Pick the 6 colors</b> in the correct face (Up, Right, Front,
              Down, Left, Back).
            </li>
            <li>
              Click <b>Continue</b> to proceed.
            </li>
          </ol>
          <div id="color-palette-section">
            <form id="color-palette-form" onSubmit={handleSubmit}>
              <div className="color-palette-row">
                {palette.map((p, idx) => (
                  <label key={p.face}>
                    {p.label}:{" "}
                    <input
                      type="color"
                      value={p.color}
                      onChange={(e) => {
                        const newColor = e.target.value;
                        setPalette((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, color: newColor } : item
                          )
                        );
                      }}
                    />
                  </label>
                ))}
              </div>
              <button type="submit">Continue</button>
            </form>
          </div>
        </div>
      )}

      {step1_done ? (
        <>
          <div className="step2">
            <h2>
              <b>Step 2:</b> Enter Your Cube
            </h2>
            <ol className="instructions-list">
              <li>Select a color from the palette below.</li>
              <li>
                Click on any sticker in the 2D cube net to apply the selected
                color.
              </li>
              <li>
                Fill all stickers on all faces. <b>Centers are fixed</b> and
                define each face color.
              </li>
              <li>
                Watch the <b>3D preview</b> update live as you edit the cube.
              </li>
              <li>
                When you are done, check the status below. Only a{" "}
                <b>valid cube</b> can be submitted.
              </li>
              <li>
                Click <b>Validate Cube</b> first; when valid, <b>Solve Cube</b>
                appears. Use <b>Reset</b> to start over.
              </li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {palette.map((item) => (
              <button
                key={item.face}
                className={`px-3 py-2 rounded border ${
                  activeColor === item.face ? "ring-2 ring-blue-600" : ""
                }`}
                onClick={() => setActiveColor(item.face)}
                style={{ backgroundColor: item.color }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="step2-work flex flex-wrap gap-2 items-center">
            <div className="2dcube">
              <CubeNet
                faces={faces}
                setFaces={setFaces}
                activeColor={activeColor}
                palette={palette}
              />
            </div>
            <div className="cube3d-preview">
              <Cube3DPreview faces={faces} palette={palette} />
            </div>
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="mt-2 flex gap-2 items-center">
            {!validated && (
              <button
                onClick={onValidate}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Validate Cube
              </button>
            )}
            {validated && (
              <button
                onClick={onSolve}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Solve Cube
              </button>
            )}
            <button
              onClick={onReset}
              className="bg-gray-200 text-gray-900 px-4 py-2 rounded hover:bg-gray-300 border"
            >
              Reset
            </button>
          </div>
        </>
      ) : null}

    </div>
  );
}
