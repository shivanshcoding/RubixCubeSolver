"use client";
import * as THREE from "three";
import { useEffect, useRef, useMemo, useState } from "react";

export default function Cube3DSolver({ moves = [], faces, palette }) {
  const mountRef = useRef(null);
  const cubeletsRef = useRef([]);
  const [moveIndex, setMoveIndex] = useState(0);

  const colors = useMemo(() => {
    const out = {};
    palette.forEach(p => (out[p.face] = p.color));
    return out;
  }, [palette]);

  function parseMove(move) {
    const face = move[0];
    let direction = move.includes("'") ? 1 : -1;
    let times = move.includes("2") ? 2 : 1;
    return { face, direction, times };
  }

  function applyMoveTo3DCube(move) {
    const { face, direction, times } = parseMove(move);

    const axis = {
      U: [0, 1, 0],
      D: [0, -1, 0],
      F: [0, 0, 1],
      B: [0, 0, -1],
      L: [-1, 0, 0],
      R: [1, 0, 0],
    }[face];

    const slice = cubeletsRef.current.filter((c) => {
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

    const vec = new THREE.Vector3(...axis);
    const angle = (Math.PI / 2) * direction;

    let frame = 0;
    const total = 20;

    function animate() {
      if (frame < total) {
        const delta = angle / total;
        slice.forEach(c => {
          c.mesh.rotateOnWorldAxis(vec, delta);
          c.mesh.position.applyAxisAngle(vec, delta);
        });
        frame++;
        requestAnimationFrame(animate);
      }
    }
    animate();
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const cubelets = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const mats = [...Array(6)].map(() => new THREE.MeshBasicMaterial({ color: "#232323" }));
          const cubelet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mats);
          cubelet.position.set(x, y, z);
          scene.add(cubelet);
          cubelets.push({ mesh: cubelet });
        }
    cubeletsRef.current = cubelets;

    const render = () => renderer.render(scene, camera);
    renderer.setAnimationLoop(render);

    return () => {
      renderer.dispose();
      if (renderer.domElement) mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (moves[moveIndex]) applyMoveTo3DCube(moves[moveIndex]);
  }, [moveIndex]);

  const next = () => setMoveIndex(i => Math.min(i + 1, moves.length - 1));
  const prev = () => setMoveIndex(i => Math.max(i - 1, 0));
  const reset = () => window.location.reload(); // simplest reset

  return (
    <div className="relative w-full h-[310px] border rounded bg-black/20">
      <div ref={mountRef} className="w-full h-full" />

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/80 p-2 rounded text-xs">
        <button onClick={prev} className="px-2 border rounded">Prev</button>
        <button onClick={next} className="px-2 border rounded">Next</button>
        <button onClick={reset} className="px-2 border rounded">Reset</button>
      </div>
    </div>
  );
}
