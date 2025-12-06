import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState } from 'react'

const FACE_COLORS = {
  U: '#ffffff',
  R: '#ff0000',
  F: '#00ff00',
  D: '#ffff00',
  L: '#ffa500',
  B: '#0000ff',
}

function AnimatedCube({ currentMove, speed = 1 }) {
  const group = useRef()
  const [target, setTarget] = useState([0, 0, 0])

  useEffect(() => {
    if (!currentMove) return
    const m = currentMove
    let axis = [0, 0, 0]
    let angle = Math.PI / 2
    if (m.endsWith("2")) angle = Math.PI
    if (m.endsWith("'")) angle = -angle
    const base = m[0]
    switch (base) {
      case 'U': axis = [0, 1, 0]; break
      case 'D': axis = [0, -1, 0]; break
      case 'R': axis = [1, 0, 0]; break
      case 'L': axis = [-1, 0, 0]; break
      case 'F': axis = [0, 0, -1]; break
      case 'B': axis = [0, 0, 1]; break
      default: axis = [0, 0, 0]
    }
    setTarget(([x, y, z]) => [x + axis[0] * angle, y + axis[1] * angle, z + axis[2] * angle])
  }, [currentMove])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const step = delta * 2 * speed
    // ease rotation towards target
    g.rotation.x += Math.sign(target[0] - g.rotation.x) * Math.min(Math.abs(target[0] - g.rotation.x), step)
    g.rotation.y += Math.sign(target[1] - g.rotation.y) * Math.min(Math.abs(target[1] - g.rotation.y), step)
    g.rotation.z += Math.sign(target[2] - g.rotation.z) * Math.min(Math.abs(target[2] - g.rotation.z), step)
  })

  return (
    <group ref={group}>
      {/* simple cube */}
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#dddddd" />
      </mesh>
    </group>
  )
}

export default function Cube3D({ moveIndex = 0, moves = [], speed = 1 }) {
  const currentMove = moves[moveIndex] || null
  return (
    <div className="w-full h-80 bg-white rounded border">
      <Canvas camera={{ position: [4, 4, 4] }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} />
        <AnimatedCube currentMove={currentMove} speed={speed} />
      </Canvas>
    </div>
  )
}

