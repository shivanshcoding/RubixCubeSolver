import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Cube3D from '../components/Cube3D.jsx'
import MoveControls from '../components/MoveControls.jsx'

export default function SolutionPage() {
  const { state } = useLocation()
  const moves = state?.moves || []
  const moveCount = state?.moveCount || moves.length
  const solveTimeMs = state?.solveTimeMs || 0
  const [moveIndex, setMoveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      setMoveIndex((i) => {
        if (i >= moves.length - 1) {
          clearInterval(interval)
          return i
        }
        return i + 1
      })
    }, 800 / speed)
    return () => clearInterval(interval)
  }, [playing, speed, moves.length])

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Solution</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <Cube3D moveIndex={moveIndex} moves={moves} speed={speed} />
        <div className="bg-white rounded border p-4">
          <div className="mb-2 text-sm text-gray-600">Move count: {moveCount} · Solve time: {solveTimeMs} ms</div>
          <MoveControls moveIndex={moveIndex} setMoveIndex={setMoveIndex} moves={moves} playing={playing} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed} />
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
              {moves.map((m, i) => (
                <span key={i} className={`px-2 py-1 rounded border text-sm ${i === moveIndex ? 'bg-blue-50 border-blue-400' : 'bg-white'}`}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

