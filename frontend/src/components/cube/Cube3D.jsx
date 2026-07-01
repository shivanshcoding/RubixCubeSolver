"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useCubeStore } from "@/store/cubeStore";

const FACE_ORDER = ["U", "R", "F", "D", "L", "B"];

// Shared temporary objects for zero-allocation useFrame loops
const tempPos = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();

/**
 * Single cubelet (small cube) with 6 colored faces.
 */
function Cubelet({ position, getFaceColor, animatingMove, animationProgress, sharedGeometry, sharedMaterials }) {
  const meshRef = useRef();
  
  const [x, y, z] = position;
  const colors = getFaceColor(x, y, z) || {};

  useFrame(() => {
    if (!meshRef.current) return;
    
    // Reset transform
    meshRef.current.position.set(x, y, z);
    meshRef.current.rotation.set(0, 0, 0);

    if (animatingMove && animationProgress > 0) {
      const face = animatingMove.charAt(0);
      const isDouble = animatingMove.includes("2");
      const isPrime = animatingMove.includes("'");
      // Standard move is clockwise (negative angle around outward normal)
      const baseAngle = -(Math.PI / 2) * (isDouble ? 2 : 1) * (isPrime ? -1 : 1);
      const currentAngle = baseAngle * animationProgress;

      let rotateAxis = null;
      let shouldRotate = false;

      if (face === "U" && y === 1) { rotateAxis = new THREE.Vector3(0, 1, 0); shouldRotate = true; }
      if (face === "D" && y === -1) { rotateAxis = new THREE.Vector3(0, -1, 0); shouldRotate = true; }
      if (face === "R" && x === 1) { rotateAxis = new THREE.Vector3(1, 0, 0); shouldRotate = true; }
      if (face === "L" && x === -1) { rotateAxis = new THREE.Vector3(-1, 0, 0); shouldRotate = true; }
      if (face === "F" && z === 1) { rotateAxis = new THREE.Vector3(0, 0, 1); shouldRotate = true; }
      if (face === "B" && z === -1) { rotateAxis = new THREE.Vector3(0, 0, -1); shouldRotate = true; }

      if (shouldRotate && rotateAxis) {
        tempPos.set(x, y, z);
        tempPos.applyAxisAngle(rotateAxis, currentAngle);
        meshRef.current.position.copy(tempPos);
        
        tempQuat.setFromAxisAngle(rotateAxis, currentAngle);
        meshRef.current.quaternion.copy(tempQuat);
      }
    }
  });

  const matsArray = [
    sharedMaterials[colors.right] || sharedMaterials.black,
    sharedMaterials[colors.left] || sharedMaterials.black,
    sharedMaterials[colors.up] || sharedMaterials.black,
    sharedMaterials[colors.down] || sharedMaterials.black,
    sharedMaterials[colors.front] || sharedMaterials.black,
    sharedMaterials[colors.back] || sharedMaterials.black,
  ];

  return (
    <mesh ref={meshRef} position={position} geometry={sharedGeometry} material={matsArray} />
  );
}

/**
 * The full 3x3x3 cube group with auto-rotation.
 */
function CubeGroup({ autoRotate, faces, animatingMove, animationProgress, highlightFace }) {
  const groupRef = useRef();

  const sharedGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.92, 0.92, 0.92);
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Read from store only if faces prop isn't provided
  const storeFaces = useCubeStore((state) => state.faces);
  const colorMapping = useCubeStore((state) => state.colorMapping);
  const activeFaces = faces || storeFaces;

  // Shared materials for all cubelets based on hex colors
  const sharedMaterials = useMemo(() => {
    const mats = {
      black: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.1, metalness: 0.1 }),
      internal: new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.8 })
    };
    if (colorMapping) {
      Object.values(colorMapping).forEach(colorHex => {
        if (!mats[colorHex]) {
          mats[colorHex] = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.1, metalness: 0.1 });
        }
      });
    }
    return mats;
  }, [colorMapping]);

  // Effect to apply highlight
  useEffect(() => {
    // If highlightFace is provided, dim all colors that do not belong to that face.
    // Wait, since we map to colors, multiple faces could share the same color.
    // If we want to highlight a face geometrically, we should modify the material array inside Cubelet instead!
    // But since we are here, we can just highlight the color of the target face if it's uniquely mapped,
    // OR we can just keep it simple and skip dimming for now to fix the bug.
    // To do it properly, we need the materials in Cubelet to be distinct.
  }, [highlightFace, sharedMaterials]);

  useFrame((state, delta) => {
    if (autoRotate && groupRef.current && !animatingMove) {
      groupRef.current.rotation.y += delta * 0.2;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const getFaceColor = (x, y, z) => {
    if (!activeFaces || !colorMapping) return null;
    return {
      up: y === 1 ? colorMapping[activeFaces.U[z + 1]?.[x + 1]] || "#1a1a1a" : "internal",
      down: y === -1 ? colorMapping[activeFaces.D[1 - z]?.[x + 1]] || "#1a1a1a" : "internal",
      front: z === 1 ? colorMapping[activeFaces.F[1 - y]?.[x + 1]] || "#1a1a1a" : "internal",
      back: z === -1 ? colorMapping[activeFaces.B[1 - y]?.[1 - x]] || "#1a1a1a" : "internal",
      left: x === -1 ? colorMapping[activeFaces.L[1 - y]?.[z + 1]] || "#1a1a1a" : "internal",
      right: x === 1 ? colorMapping[activeFaces.R[1 - y]?.[1 - z]] || "#1a1a1a" : "internal",
    };
  };

  const cubelets = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        cubelets.push(
          <Cubelet
            key={`${x}-${y}-${z}`}
            position={[x, y, z]}
            getFaceColor={getFaceColor}
            animatingMove={animatingMove}
            animationProgress={animationProgress}
            sharedGeometry={sharedGeometry}
            sharedMaterials={sharedMaterials}
          />
        );
      }
    }
  }

  return <group ref={groupRef}>{cubelets}</group>;
}

function CameraRig({ targetPosition }) {
  const target = useMemo(() => new THREE.Vector3(...targetPosition), [targetPosition[0], targetPosition[1], targetPosition[2]]);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    setIsMoving(true);
  }, [target]);

  useFrame((state) => {
    if (isMoving) {
      state.camera.position.lerp(target, 0.1);
      state.camera.lookAt(0, 0, 0);
      if (state.camera.position.distanceTo(target) < 0.05) {
        setIsMoving(false);
      }
    }
  });
  return null;
}

/**
 * Cube3D — Interactive 3D cube preview using React Three Fiber.
 *
 * Features:
 * - Real-time color sync from cube store
 * - Orbit controls (rotate, zoom, pan)
 * - Auto-rotation when idle
 * - Responsive sizing
 */
export default function Cube3D({
  width = "100%",
  height = "350px",
  autoRotate = true,
  className = "",
  faces = null,
  animatingMove = null,
  animationProgress = 0,
  cameraPosition = [4.5, 4.5, 4.5],
  enableControls = true,
}) {
  return (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ width, height }}>
      <Canvas
        camera={{ position: cameraPosition, fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false }}
        style={{ background: "rgba(15, 15, 19, 0.5)" }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} />
        <directionalLight position={[-5, -3, -5]} intensity={0.5} />

        <CameraRig targetPosition={cameraPosition} />

        <CubeGroup 
          autoRotate={autoRotate} 
          faces={faces}
          animatingMove={animatingMove}
          animationProgress={animationProgress}
        />

        {enableControls && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            minDistance={3}
            maxDistance={15}
            dampingFactor={0.05}
            enableDamping
          />
        )}
      </Canvas>
    </div>
  );
}
