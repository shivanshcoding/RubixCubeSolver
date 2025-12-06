export default function MoveControls({
  moveIndex,
  setMoveIndex,
  moves,
  playing,
  setPlaying,
  speed,
  setSpeed,
}) {
  function prev() {
    setMoveIndex((i) => Math.max(0, i - 1))
  }
  function next() {
    setMoveIndex((i) => Math.min(moves.length - 1, i + 1))
  }
  return (
    <div className="flex items-center gap-2">
      <button className="px-3 py-1 rounded border" onClick={prev}>Prev</button>
      <button className="px-3 py-1 rounded border" onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
      <button className="px-3 py-1 rounded border" onClick={next}>Next</button>
      <div className="ml-4 flex items-center gap-2">
        <span className="text-sm">Speed</span>
        <input type="range" min="0.5" max="3" step="0.5" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} />
      </div>
    </div>
  )
}

