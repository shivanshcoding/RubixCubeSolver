"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

const FACE_COLORS = {
  U: { bg: "#FFFFFF", text: "#000" },
  D: { bg: "#FFFF00", text: "#000" },
  F: { bg: "#00CC00", text: "#fff" },
  B: { bg: "#0044FF", text: "#fff" },
  R: { bg: "#FF0000", text: "#fff" },
  L: { bg: "#FF8800", text: "#fff" },
};

function FaceMesh({ face, resources }) {
  const { bg, text } = FACE_COLORS[face];
  return (
    <group>
      {/* Base plane */}
      <mesh position={[0, 0, -0.05]} geometry={resources.geometries.base} material={resources.materials.base} />
      {/* Stickers */}
      {[-1, 0, 1].map((x) =>
        [-1, 0, 1].map((y) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.01]} geometry={resources.geometries.sticker} material={resources.materials[face]}>
            {x === 0 && y === 0 && (
              null //add text here afterwards
            )}
          </mesh>
        ))
      )}
    </group>
  );
}

function UnfoldingCube({ resources }) {
  const uHingeRef = useRef(null);
  const dHingeRef = useRef(null);
  const lHingeRef = useRef(null);
  const rHingeRef = useRef(null);
  const bHingeRef = useRef(null);
  const rotateRef = useRef(null);
  const shiftRef = useRef(null);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const cycle = t % 6;
    let progress = 0;
    if (cycle < 1) progress = 0;
    else if (cycle < 2.5) progress = (cycle - 1) / 1.5;
    else if (cycle < 3.5) progress = 1;
    else if (cycle < 5) progress = 1 - (cycle - 3.5) / 1.5;
    else progress = 0;

    // easeInOutQuad
    progress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    if (uHingeRef.current) {
      uHingeRef.current.rotation.x = THREE.MathUtils.lerp(0, Math.PI / 2, progress);
      dHingeRef.current.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2, progress);
      lHingeRef.current.rotation.y = THREE.MathUtils.lerp(0, Math.PI / 2, progress);
      rHingeRef.current.rotation.y = THREE.MathUtils.lerp(0, -Math.PI / 2, progress);
      bHingeRef.current.rotation.y = THREE.MathUtils.lerp(0, -Math.PI / 2, progress);
    }

    if (shiftRef.current) {
      shiftRef.current.position.x = THREE.MathUtils.lerp(0, -1.5, progress);
      shiftRef.current.position.z = THREE.MathUtils.lerp(0, -1.5, progress);
    }

    if (rotateRef.current) {
      rotateRef.current.rotation.y += delta * 0.2;
      rotateRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    }
  });

  return (
    <group ref={rotateRef}>
      <group ref={shiftRef}>
        {/* Shift assembly back so folded cube is centered around 0,0,0 */}
        <group position={[0, 0, -1.5]}>
          {/* F Face is the root */}
          <group position={[0, 0, 1.5]}>
            <FaceMesh face="F" resources={resources} />
            
            {/* U Hinge */}
            <group ref={uHingeRef} position={[0, 1.5, 0]}>
              <group position={[0, 0, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <FaceMesh face="U" resources={resources} />
              </group>
            </group>

            {/* D Hinge */}
            <group ref={dHingeRef} position={[0, -1.5, 0]}>
              <group position={[0, 0, -1.5]} rotation={[Math.PI / 2, 0, 0]}>
                <FaceMesh face="D" resources={resources} />
              </group>
            </group>

            {/* L Hinge */}
            <group ref={lHingeRef} position={[-1.5, 0, 0]}>
              <group position={[0, 0, -1.5]} rotation={[0, -Math.PI / 2, 0]}>
                <FaceMesh face="L" resources={resources} />
              </group>
            </group>

            {/* R Hinge */}
            <group ref={rHingeRef} position={[1.5, 0, 0]}>
              <group position={[0, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}>
                <FaceMesh face="R" resources={resources} />
                
                {/* B Hinge (child of R Face) */}
                <group ref={bHingeRef} position={[1.5, 0, 0]}>
                  <group position={[0, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}>
                    <FaceMesh face="B" resources={resources} />
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export default function CubeUnfold3D({ width = "100%", height = "350px" }) {
  const resources = useMemo(() => {
    return {
      geometries: {
        base: new THREE.BoxGeometry(2.96, 2.96, 0.1),
        sticker: new THREE.BoxGeometry(0.92, 0.92, 0.02)
      },
      materials: {
        base: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.5, metalness: 0.1 }),
        U: new THREE.MeshStandardMaterial({ color: FACE_COLORS.U.bg, roughness: 0.2, metalness: 0.1 }),
        D: new THREE.MeshStandardMaterial({ color: FACE_COLORS.D.bg, roughness: 0.2, metalness: 0.1 }),
        F: new THREE.MeshStandardMaterial({ color: FACE_COLORS.F.bg, roughness: 0.2, metalness: 0.1 }),
        B: new THREE.MeshStandardMaterial({ color: FACE_COLORS.B.bg, roughness: 0.2, metalness: 0.1 }),
        R: new THREE.MeshStandardMaterial({ color: FACE_COLORS.R.bg, roughness: 0.2, metalness: 0.1 }),
        L: new THREE.MeshStandardMaterial({ color: FACE_COLORS.L.bg, roughness: 0.2, metalness: 0.1 }),
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(resources.geometries).forEach(g => g.dispose());
      Object.values(resources.materials).forEach(m => m.dispose());
    };
  }, [resources]);

  return (
    <div style={{ width, height }} className="rounded-xl overflow-hidden cursor-move relative">
      <Canvas 
        camera={{ position: [0, 0, 12], fov: 45 }} 
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <directionalLight position={[-5, -3, -5]} intensity={0.5} />
        
        <UnfoldingCube resources={resources} />
        
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          enableRotate={true} 
          minDistance={5} 
          maxDistance={30} 
          dampingFactor={0.05} 
          enableDamping 
        />
      </Canvas>
    </div>
  );
}
