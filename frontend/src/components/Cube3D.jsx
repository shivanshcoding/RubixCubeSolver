"use client";
import * as THREE from "three";
import { useEffect, useRef, useMemo, useState } from "react";

export default function Cube3D({ moves = [], faces, palette, state = "preview" }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const cubeletsRef = useRef([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Convert palette → color lookup
  const colors = useMemo(() => {
    const out = {};
    palette.forEach(p => (out[p.face] = p.color));
    return out;
  }, [palette]);

  // ---------------------------
  // 🎬 SOLVER MOVE PARSER
  // ---------------------------
  function parseMove(move) {
    const face = move[0];
    let direction = -1;
    let times = 1;
    if (move.length > 1) {
      if (move[1] === "'") direction = 1;
      if (move[1] === "2") times = 2;
    }
    return { face, direction, times };
  }

  // ---------------------------
  // 🔄 APPLY MOVE TO CUBE
  // ---------------------------
  function applyMoveTo3DCube(move) {
    const { face, direction, times } = parseMove(move);
    animateFaceRotation(face, direction, times);
  }

  // ANIMATED TURN
  function animateFaceRotation(face, direction, times, callback) {
    const axisMap = {
      U: [0, 1, 0],
      D: [0, -1, 0],
      F: [0, 0, 1],
      B: [0, 0, -1],
      L: [-1, 0, 0],
      R: [1, 0, 0],
    };

    function getFaceSlice(face) {
      return cubeletsRef.current.filter((c) => {
        const p = c.mesh.position;
        return (
          (face === "U" && p.y > 0.9) ||
          (face === "D" && p.y < -0.9) ||
          (face === "F" && p.z > 0.9) ||
          (face === "B" && p.z < -0.9) ||
          (face === "R" && p.x > 0.9) ||
          (face === "L" && p.x < -0.9)
        );
      });
    }

    const axis = new THREE.Vector3(...axisMap[face]);
    const angle = (Math.PI / 2) * direction;
    const slice = getFaceSlice(face);

    let frame = 0;
    const totalFrames = 20;

    function rotate() {
      if (frame < totalFrames) {
        const delta = angle / totalFrames;
        slice.forEach((c) => {
          c.mesh.rotateOnWorldAxis(axis, delta);
          c.mesh.position.applyAxisAngle(axis, delta);
        });
        frame++;
        requestAnimationFrame(rotate);
      } else {
        if (callback) callback();
      }
    }
    rotate();
  }

  // ---------------------------
  // 🎥 3D INIT
  // ---------------------------
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // build cubelets
    const cubelets = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const mats = Array.from({ length: 6 }, () => new THREE.MeshBasicMaterial({ color: "#232323" }));
          const cubelet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mats);
          cubelet.position.set(x, y, z);
          scene.add(cubelet);
          cubelets.push({ mesh: cubelet, x, y, z });
        }
    cubeletsRef.current = cubelets;

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (state === "preview") scene.rotation.y += 0.009;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      if (renderer.domElement && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // ---------------------------
  // 🎨 UPDATE COLORS IN PREVIEW
  // ---------------------------
  useEffect(() => {
    if (!faces) return;
    const cubelets = cubeletsRef.current;
    if (!cubelets.length) return;

    cubelets.forEach(({ mesh, x, y, z }) => {
      const m = mesh.material;
      for (let i = 0; i < 6; i++) m[i].color.set("#232323");

      if (y === 1) m[2].color.set(colors[faces.U[z + 1][x + 1]]);
      if (y === -1) m[3].color.set(colors[faces.D[2 - (z + 1)][x + 1]]);
      if (x === 1) m[0].color.set(colors[faces.R[2 - (y + 1)][2 - (z + 1)]]);
      if (x === -1) m[1].color.set(colors[faces.L[2 - (y + 1)][z + 1]]);
      if (z === 1) m[4].color.set(colors[faces.F[2 - (y + 1)][x + 1]]);
      if (z === -1) m[5].color.set(colors[faces.B[2 - (y + 1)][2 - (x + 1)]]);
    });
  }, [faces, colors]);

  // ---------------------------
  // 🧩 SOLVER MODE
  // ---------------------------
  useEffect(() => {
    if (state !== "solver") return;
    if (!moves[moveIndex]) return;
    applyMoveTo3DCube(moves[moveIndex]);
  }, [moveIndex, state]);

  const next = () => setMoveIndex((i) => Math.min(i + 1, moves.length - 1));
  const prev = () => setMoveIndex((i) => Math.max(i - 1, 0));
  const reset = () => setMoveIndex(0);

  return (
    <div className="relative w-full h-[310px] border rounded-md bg-black/20">
      <div ref={mountRef} className="w-full h-full" />

      {state === "solver" && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/70 p-2 rounded text-xs">
          <button onClick={prev} className="px-2 border rounded">Prev</button>
          <button onClick={next} className="px-2 border rounded">Next</button>
          <button onClick={reset} className="px-2 border rounded">Reset</button>
        </div>
      )}
    </div>
  );
}
