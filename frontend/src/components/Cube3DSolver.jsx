"use client";
import * as THREE from "three";
import { useEffect, useRef, useState, useMemo } from "react";

export default function Cube3DSolver({ moves = [], faces, palette }) {
  const mountRef = useRef(null);
  const cubeletsRef = useRef([]);
  const cubeStateRef = useRef(null);
  const [moveIndex, setMoveIndex] = useState(-1);

  // COLORS: map {U:"#fff", R:"#f00"...}
  const COLORS = useMemo(() => {
    const out = {};
    palette.forEach((p) => (out[p.face] = p.color));
    return out;
  }, [palette]);

  // Build cubeState from faces
  useEffect(() => {
    cubeStateRef.current = [
      faces.U,
      faces.R,
      faces.F,
      faces.D,
      faces.L,
      faces.B,
    ].map((face) => face.map((row) => [...row]));
  }, [faces]);

  // Parse "R", "R'", "R2"
  function parseMove(move) {
    const face = move[0];
    let direction = -1;
    let times = 1;
    if (move.includes("'")) direction = 1;
    if (move.includes("2")) times = 2;
    return { face, direction, times };
  }

  // Reverse move
  function invertMove(move) {
    const { face, direction, times } = parseMove(move);
    return face + (times === 2 ? "2" : direction === -1 ? "'" : "");
  }

  // Get slice visually using mesh.position (just like Code-1)
  function getFaceCubelets(face) {
    let out = [];
    for (const c of cubeletsRef.current) {
      const pos = c.mesh.position;
      if (face === "U" && Math.abs(pos.y - 1.01) < 0.1) out.push(c);
      if (face === "D" && Math.abs(pos.y + 1.01) < 0.1) out.push(c);
      if (face === "F" && Math.abs(pos.z - 1.01) < 0.1) out.push(c);
      if (face === "B" && Math.abs(pos.z + 1.01) < 0.1) out.push(c);
      if (face === "L" && Math.abs(pos.x + 1.01) < 0.1) out.push(c);
      if (face === "R" && Math.abs(pos.x - 1.01) < 0.1) out.push(c);
    }
    return out;
  }

  // Update sticker state (like Code-1)
  function rotateFaceInCubeState(face, direction) {
    const F = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 }[face];
    const S = cubeStateRef.current;

    // Rotate the affected face 3x3
    const temp = S[F].map((r) => [...r]);
    if (direction === 1) {
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) S[F][j][2 - i] = temp[i][j];
    } else {
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) S[F][2 - j][i] = temp[i][j];
    }
  }

  // Repaint stickers based on mesh.position
  //   function repaint() {
  //     const S = cubeStateRef.current;

  //     cubeletsRef.current.forEach(c => {
  //       const m = c.mesh.material;
  //       const pos = c.mesh.position;

  //       for (let f=0; f<6; f++) m[f].color.set("#232323");

  //       if (pos.y > 0.9)
  //         m[2].color.set(COLORS[S[0][Math.round(pos.z+1)][Math.round(pos.x+1)]]);
  //       if (pos.y < -0.9)
  //         m[3].color.set(COLORS[S[3][2-Math.round(pos.z+1)][Math.round(pos.x+1)]]);

  //       if (pos.x > 0.9)
  //         m[0].color.set(COLORS[S[1][2-Math.round(pos.y+1)][2-Math.round(pos.z+1)]]);
  //       if (pos.x < -0.9)
  //         m[1].color.set(COLORS[S[4][2-Math.round(pos.y+1)][Math.round(pos.z+1)]]);

  //       if (pos.z > 0.9)
  //         m[4].color.set(COLORS[S[2][2-Math.round(pos.y+1)][Math.round(pos.x+1)]]);
  //       if (pos.z < -0.9)
  //         m[5].color.set(COLORS[S[5][2-Math.round(pos.y+1)][2-Math.round(pos.x+1)]]);
  //     });
  //   }

function repaint() {
  const S = cubeStateRef.current;

  cubeletsRef.current.forEach(c => {
    const m = c.mesh.material;
    const { x, y, z } = c; // USE STORED VALUES LIKE CODE-1

    for (let i=0;i<6;i++) m[i].color.set("#232323");

    if (y === 1)  m[2].color.set(COLORS[S[0][z+1][x+1]]);
    if (y === -1) m[3].color.set(COLORS[S[3][2-(z+1)][x+1]]);
    if (x === 1)  m[0].color.set(COLORS[S[1][2-(y+1)][2-(z+1)]]);
    if (x === -1) m[1].color.set(COLORS[S[4][2-(y+1)][z+1]]);
    if (z === 1)  m[4].color.set(COLORS[S[2][2-(y+1)][x+1]]);
    if (z === -1) m[5].color.set(COLORS[S[5][2-(y+1)][2-(x+1)]]);
  });
}

  // Animation identical to Code-1
  function applyMove(move) {
    const { face, direction, times } = parseMove(move);
    const AX = {
      U: [0, 1, 0],
      D: [0, -1, 0],
      F: [0, 0, 1],
      B: [0, 0, -1],
      L: [-1, 0, 0],
      R: [1, 0, 0],
    };

    const slice = getFaceCubelets(face);
    const axis = new THREE.Vector3(...AX[face]);
    let frame = 0;

    function animateTurn() {
      if (frame < 20) {
        const a = ((Math.PI / 2) * direction) / 20;
        slice.forEach((c) => {
          c.mesh.rotateOnWorldAxis(axis, a);
          c.mesh.position.applyAxisAngle(axis, a);
        });
        frame++;
        requestAnimationFrame(animateTurn);
      } else {
        slice.forEach((c) => {
          c.mesh.position.set(
            Math.round(c.mesh.position.x * 1000) / 1000,
            Math.round(c.mesh.position.y * 1000) / 1000,
            Math.round(c.mesh.position.z * 1000) / 1000
          );
        });

        rotateFaceInCubeState(face, direction);
        repaint();

        if (times === 2) applyMove(face); // R2, U2, etc
      }
    }

    animateTurn();
  }

  const next = () => {
    if (moveIndex < moves.length - 1) {
      applyMove(moves[moveIndex + 1]);
      setMoveIndex(moveIndex + 1);
    }
  };

  const prev = () => {
    if (moveIndex >= 0) {
      applyMove(invertMove(moves[moveIndex]));
      setMoveIndex(moveIndex - 1);
    }
  };

  const reset = () => {
    setMoveIndex(-1);
    cubeStateRef.current = [
      faces.U,
      faces.R,
      faces.F,
      faces.D,
      faces.L,
      faces.B,
    ].map((f) => f.map((r) => [...r]));

    cubeletsRef.current.forEach((c) => {
      c.mesh.rotation.set(0, 0, 0);
      c.mesh.position.set(c.x, c.y, c.z);
    });

    repaint();
  };

  // Mount scene
  useEffect(() => {
    if (!mountRef.current) return;
    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.set(5, 6, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dl = new THREE.DirectionalLight(0xffffff, 0.4);
    dl.position.set(8, 12, 10);
    scene.add(dl);

    const sz = 0.95,
      gap = 0.06;
    const cubelets = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const geo = new THREE.BoxGeometry(sz, sz, sz);
          const mats = [...Array(6)].map(
            () => new THREE.MeshLambertMaterial({ color: 0x232323 })
          );
          const m = new THREE.Mesh(geo, mats);
          m.position.set(x * (sz + gap), y * (sz + gap), z * (sz + gap));
          scene.add(m);
          cubelets.push({ mesh: m, x, y, z });

        }

    cubeletsRef.current = cubelets;
    repaint();

    renderer.setAnimationLoop(() => renderer.render(scene, camera));
    return () => renderer.dispose?.();
  }, []);

  return (
    <div className="relative w-full h-[310px] border rounded bg-black/10">
      <div ref={mountRef} className="w-full h-full" />

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-white/80 rounded p-2">
        <button onClick={prev}>Prev</button>
        <button onClick={next}>Next</button>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}
