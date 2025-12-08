import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useEffect, useState, useMemo } from 'react'
import * as THREE from 'three'

function AnimatedCube({ currentMove, speed = 1, children }) {
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
      {/* base cube */}
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      {children}
    </group>
  )
}

export default function Cube3D({ moveIndex = 0, moves = [], speed = 1, faces, palette }) {
  const currentMove = moves[moveIndex] || null

  const paletteMap = useMemo(() => {
    const map = { U: '#ffffff', R: '#ff0000', F: '#00ff00', D: '#ffff00', L: '#ffa500', B: '#0000ff' }
    if (Array.isArray(palette)) {
      for (const p of palette) map[p.face] = p.color
    }
    return map
  }, [palette])

  const tiles = useMemo(() => {
    if (!faces) return []
    const t = [-0.6, 0, 0.6]
    const entries = []
    const makeTile = (pos, rot, color, key) => ({ pos, rot, color, key })
    // U: y=+1.01, plane XZ
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const color = paletteMap[faces.U[r][c]]
      entries.push(makeTile([t[c], 1.01, -t[r]], [-Math.PI/2, 0, 0], color, `U-${r}-${c}`))
    }
    // D: y=-1.01, plane XZ
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const color = paletteMap[faces.D[r][c]]
      entries.push(makeTile([t[c], -1.01, t[r]], [Math.PI/2, 0, 0], color, `D-${r}-${c}`))
    }
    // F: z=-1.01, plane XY
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const color = paletteMap[faces.F[r][c]]
      entries.push(makeTile([t[c], t[2 - r], -1.01], [0, Math.PI, 0], color, `F-${r}-${c}`))
    }
    // B: z=+1.01, plane XY
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const color = paletteMap[faces.B[r][c]]
      entries.push(makeTile([-t[c], t[2 - r], 1.01], [0, 0, 0], color, `B-${r}-${c}`))
    }
    // R: x=+1.01, plane YZ
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const color = paletteMap[faces.R[r][c]]
      entries.push(makeTile([1.01, t[2 - r], t[c]], [0, -Math.PI/2, 0], color, `R-${r}-${c}`))
    }
    // L: x=-1.01, plane YZ
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const color = paletteMap[faces.L[r][c]]
      entries.push(makeTile([-1.01, t[2 - r], -t[c]], [0, Math.PI/2, 0], color, `L-${r}-${c}`))
    }
    return entries
  }, [faces, paletteMap])

  return (
    <div className="w-full h-80 bg-white rounded border">
      <Canvas camera={{ position: [4, 4, 4] }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} />
        <AnimatedCube currentMove={currentMove} speed={speed}>
          {tiles.map(({ pos, rot, color, key }) => (
            <mesh key={key} position={pos} rotation={rot}>
              <planeGeometry args={[0.62, 0.62]} />
              <meshStandardMaterial color={color} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </AnimatedCube>
      </Canvas>
    </div>
  )
}
