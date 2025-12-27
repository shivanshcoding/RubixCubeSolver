import { useLocation, useNavigate } from "react-router-dom";
import Cube3D from "../components/Cube3D.jsx";

export default function SolutionPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    return (
      <div>
        No data found.{" "}
        <button onClick={() => navigate("/")}>Go Home</button>
      </div>
    );
  }

  const { faces, palette, res } = state;
  const moves = res?.moves || [];
  const moveCount = res?.moveCount || moves.length;
  const solveTimeMs = res?.solveTimeMs || 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Solution</h2>

      <div className="text-sm text-gray-600">
        Moves: {moveCount} · Time: {solveTimeMs} ms
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Cube manages controls + move playback by itself */}
        <Cube3D
          faces={faces}
          palette={palette}
          moves={moves}
          state="solver"
        />

        <div className="bg-white p-4 border rounded">
          <h3 className="font-medium mb-2">Move sequence</h3>
          <pre className="whitespace-pre-wrap break-words">
            {moves.join(" ")}
          </pre>

          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 border rounded"
          >
            Back Home
          </button>
        </div>
      </div>
    </div>
  );
}
