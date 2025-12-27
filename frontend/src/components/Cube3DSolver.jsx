"use client";
import * as THREE from "three";
import { useEffect, useRef, useState, useMemo } from "react";

export default function Cube3DSolver({ moves = [], faces, palette }) {
  const mountRef = useRef(null);
  const cubeletsRef = useRef([]);
  const cubeStateRef = useRef(null);
  const [moveIndex, setMoveIndex] = useState(0);

  // COLORS: map {U:"#fff", R:"#f00"...}
  const COLORS = useMemo(() => {
    const out = {};
    palette.forEach((p) => (out[p.face] = p.color));
    return out;
  }, [palette]);

  // Build cubeState from faces prop on mount
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

  // Parse move: "R", "R'", "R2"
  function parseMove(move) {
    const face = move[0];
    let direction = -1;
    let times = 1;
    if (move[1] === "'") direction = 1;
    if (move[1] === "2") times = 2;
    return { face, direction, times };
  }

  function invertMove(move) {
    const { face, direction, times } = parseMove(move);
    return { face, direction: -direction, times };
  }
  function getFaceCubelets(face) {
    let res = [];
    for (let cubelet of cubeletsRef.current) {
      let pos = cubelet.mesh.position;
      if (face === "U" && Math.abs(pos.y - 1.01) < 0.1) res.push(cubelet);
      else if (face === "D" && Math.abs(pos.y + 1.01) < 0.1) res.push(cubelet);
      else if (face === "F" && Math.abs(pos.z - 1.01) < 0.1) res.push(cubelet);
      else if (face === "B" && Math.abs(pos.z + 1.01) < 0.1) res.push(cubelet);
      else if (face === "L" && Math.abs(pos.x + 1.01) < 0.1) res.push(cubelet);
      else if (face === "R" && Math.abs(pos.x - 1.01) < 0.1) res.push(cubelet);
    }
    return res;
  }

  // Update cubeState array for sticker data

function rotateFaceInCubeState(face, direction) {
    function rotateFaceMatrix(fidx, dir) {
        let faceArr = cubeStateRef.current[fidx];
        let temp = faceArr.map(row => row.slice());
        if (dir === 1) {
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    faceArr[j][2 - i] = temp[i][j];
        } else {
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    faceArr[2 - j][i] = temp[i][j];
        }
    }

    const FACES = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };
    const adjacent = {
        U: [[[5, 0, 2], [5, 0, 1], [5, 0, 0]], [[1, 0, 2], [1, 0, 1], [1, 0, 0]], [[2, 0, 2], [2, 0, 1], [2, 0, 0]], [[4, 0, 2], [4, 0, 1], [4, 0, 0]]],
        D: [[[2, 2, 2], [2, 2, 1], [2, 2, 0]], [[1, 2, 2], [1, 2, 1], [1, 2, 0]], [[5, 2, 2], [5, 2, 1], [5, 2, 0]], [[4, 2, 2], [4, 2, 1], [4, 2, 0]]],
        F: [[[0, 2, 0], [0, 2, 1], [0, 2, 2]], [[1, 0, 0], [1, 1, 0], [1, 2, 0]], [[3, 0, 2], [3, 0, 1], [3, 0, 0]], [[4, 2, 2], [4, 1, 2], [4, 0, 2]]],
        B: [[[0, 0, 2], [0, 0, 1], [0, 0, 0]], [[4, 2, 0], [4, 1, 0], [4, 0, 0]], [[3, 2, 0], [3, 2, 1], [3, 2, 2]], [[1, 0, 2], [1, 1, 2], [1, 2, 2]]],
        R: [[[0, 0, 2], [0, 1, 2], [0, 2, 2]], [[5, 2, 0], [5, 1, 0], [5, 0, 0]], [[3, 0, 2], [3, 1, 2], [3, 2, 2]], [[2, 0, 2], [2, 1, 2], [2, 2, 2]]],
        L: [[[0, 2, 0], [0, 1, 0], [0, 0, 0]], [[2, 0, 0], [2, 1, 0], [2, 2, 0]], [[3, 2, 0], [3, 1, 0], [3, 0, 0]], [[5, 0, 2], [5, 1, 2], [5, 2, 2]]],
    };

    rotateFaceMatrix(FACES[face], direction);
    const adj = adjacent[face];
    const temp = adj.map(arr => arr.map(([f, r, c]) => cubeStateRef.current[f][r][c]));
    const mapTo = direction === 1 ? [3, 0, 1, 2] : [1, 2, 3, 0];
    for (let i = 0; i < 4; i++) {
        const from = temp[mapTo[i]];
        for (let j = 0; j < 3; j++) {
            let [f, r, c] = adj[i][j];
            cubeStateRef.current[f][r][c] = from[j];
        }
    }
}

  // Update mesh coordinates so rotations persist
 
function rotateFaceCoords(face, direction) {
    for (let c of cubeletsRef.current) {
        let { x, y, z } = c;
        let newX = x, newY = y, newZ = z;
        let apply = false;
        switch (face) {
            case 'U': if (y === 1) { apply = true;[newX, newZ] = direction === 1 ? [-z, x] : [z, -x]; } break;
            case 'D': if (y === -1) { apply = true;[newX, newZ] = direction === 1 ? [z, -x] : [-z, x]; } break;
            case 'F': if (z === 1) { apply = true;[newX, newY] = direction === 1 ? [y, -x] : [-y, x]; } break;
            case 'B': if (z === -1) { apply = true;[newX, newY] = direction === 1 ? [-y, x] : [y, -x]; } break;
            case 'L': if (x === -1) { apply = true;[newY, newZ] = direction === 1 ? [-z, y] : [z, -y]; } break;
            case 'R': if (x === 1) { apply = true;[newY, newZ] = direction === 1 ? [z, -y] : [-z, y]; } break;
        }
        if (apply) { c.x = newX; c.y = newY; c.z = newZ; }
    }
}


  // Repaint stickers from cubeState
  function repaintStickers() {
    const S = cubeStateRef.current;
    cubeletsRef.current.forEach((c) => {
      const { mesh, x, y, z } = c;
      const m = mesh.material;
      for (let i = 0; i < 6; i++) m[i].color.set("#232323");
      if (y === 1) m[2].color.set(COLORS[S[0][z + 1][x + 1]]);
      if (y === -1) m[3].color.set(COLORS[S[3][2 - (z + 1)][x + 1]]);
      if (x === 1) m[0].color.set(COLORS[S[1][2 - (y + 1)][2 - (z + 1)]]);
      if (x === -1) m[1].color.set(COLORS[S[4][2 - (y + 1)][z + 1]]);
      if (z === 1) m[4].color.set(COLORS[S[2][2 - (y + 1)][x + 1]]);
      if (z === -1) m[5].color.set(COLORS[S[5][2 - (y + 1)][2 - (x + 1)]]);
    });
  }

  // Animate move exactly like JS
  function applyMove(move) {
    const { face, direction, times } = parseMove(move);
    const axisMap = {
      U: [0, 1, 0],
      D: [0, -1, 0],
      F: [0, 0, 1],
      B: [0, 0, -1],
      L: [-1, 0, 0],
      R: [1, 0, 0],
    };
    const slice = getFaceCubelets(face);
    const axis = new THREE.Vector3(...axisMap[face]);
    const angle = (Math.PI / 2) * direction;

    let f = 0;
    const total = 20;

    function step() {
      if (f < total) {
        const d = angle / total;
        slice.forEach((c) => {
          c.mesh.rotateOnWorldAxis(axis, d);
          c.mesh.position.applyAxisAngle(axis, d);
        });
        f++;
        requestAnimationFrame(step);
      } else {
        slice.forEach((c) => {
          c.mesh.position.set(
            Math.round(c.mesh.position.x * 1000) / 1000,
            Math.round(c.mesh.position.y * 1000) / 1000,
            Math.round(c.mesh.position.z * 1000) / 1000
          );
        });
        rotateFaceCoords(face, direction);
        rotateFaceInCubeState(face, direction);
        repaintStickers();
        if (times > 1) applyMove(move[0] + (times - 1 === 2 ? "2" : "")); // support R2
      }
    }
    step();
  }

  // Mount: setup 3D
  useEffect(() => {
    if (!mountRef.current) return;

    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(5, 6, 7);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(8, 12, 10);
    scene.add(dir);

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
          const cubelet = new THREE.Mesh(geo, mats);
          cubelet.position.set(x * (sz + gap), y * (sz + gap), z * (sz + gap));
          scene.add(cubelet);
          cubelets.push({ mesh: cubelet, x, y, z });
        }

    cubeletsRef.current = cubelets;
    repaintStickers();

    renderer.setAnimationLoop(() => renderer.render(scene, camera));

    return () => {
      renderer.dispose?.();
      if (renderer.domElement && mountRef.current) {
        try {
          mountRef.current.removeChild(renderer.domElement);
        } catch {}
      }
    };
  }, []);

  // React to move changes
  useEffect(() => {
    if (!moves[moveIndex]) return;
    applyMove(moves[moveIndex]);
  }, [moveIndex]);

  const next = () => setMoveIndex((i) => Math.min(i + 1, moves.length - 1));
  const prev = () => {
    if (moveIndex === 0) return;
    const inv = invertMove(moves[moveIndex - 1]);
    applyMove(
      inv.face + (inv.times === 2 ? "2" : inv.direction === 1 ? "'" : "")
    );
    setMoveIndex((i) => i - 1);
  };

  const reset = () => {
    setMoveIndex(0);
    cubeStateRef.current = [
      faces.U,
      faces.R,
      faces.F,
      faces.D,
      faces.L,
      faces.B,
    ].map((face) => face.map((r) => [...r]));

    cubeletsRef.current.forEach((c) => {
      c.mesh.rotation.set(0, 0, 0);
      c.mesh.position.set(c.x * 1, c.y * 1, c.z * 1);
      c.x = c.x;
      c.y = c.y;
      c.z = c.z; // reset coords
    });
    repaintStickers();
  };

  return (
    <div className="relative w-full h-[310px] border rounded bg-black/10">
      <div ref={mountRef} className="w-full h-full" />

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-white/80 backdrop-blur rounded text-sm shadow">
        <button onClick={prev} className="px-3 border rounded">
          Prev
        </button>
        <button onClick={next} className="px-3 border rounded">
          Next
        </button>
        <button onClick={reset} className="px-3 border rounded">
          Reset
        </button>
      </div>
    </div>
  );
}
