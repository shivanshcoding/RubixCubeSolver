"use client";
import * as THREE from "three";
import { useEffect, useRef, useState } from "react";

export default function CubeSolutionViewer({ faces, palette, moves }) {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const cubeletsRef = useRef([]);
  const [idx, setIdx] = useState(-1);

  const getColor = (f) => palette.find(p => p.face === f)?.color ?? "#222";

  const initScene = () => {
    const w = 350, h = 350;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    renderer.setSize(w, h);
    renderer.setClearColor(0x181818, 0);
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    camera.position.set(5, 6, 7);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const d = new THREE.DirectionalLight(0xffffff, 0.5);
    d.position.set(6, 8, 7);
    scene.add(d);

    cubeletsRef.current = [];
    const size = 0.95, gap = 0.06;

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const geo = new THREE.BoxGeometry(size, size, size);
          const mats = Array(6).fill(0).map(() => new THREE.MeshLambertMaterial({ color: "#222" }));
          const mesh = new THREE.Mesh(geo, mats);
          mesh.position.set(x*(size+gap), y*(size+gap), z*(size+gap));
          scene.add(mesh);

          cubeletsRef.current.push({ mesh, x, y, z, mats });
        }
      }
    }

    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    applyFaceColors();
    renderLoop();
  };

  const renderLoop = () => {
    if (!rendererRef.current) return;
    sceneRef.current.rotation.y += 0.008;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    requestAnimationFrame(renderLoop);
  };

  const applyFaceColors = () => {
    cubeletsRef.current.forEach(({ mesh, x, y, z }) => {
      const M = mesh.material;
      M.forEach(m => m.color.set("#222"));

      if (y === 1) M[2].color.set(getColor(faces.U[z+1][x+1]));
      if (y === -1) M[3].color.set(getColor(faces.D[2-(z+1)][x+1]));
      if (x === 1) M[0].color.set(getColor(faces.R[2-(y+1)][2-(z+1)]));
      if (x === -1) M[1].color.set(getColor(faces.L[2-(y+1)][z+1]));
      if (z === 1) M[4].color.set(getColor(faces.F[2-(y+1)][x+1]));
      if (z === -1) M[5].color.set(getColor(faces.B[2-(y+1)][2-(x+1)]));
    });
  };

  const layerFor = (face) =>
    cubeletsRef.current.filter(({mesh}) => {
      const p = mesh.position;
      if (face==="U") return Math.abs(p.y-1.01)<0.1;
      if (face==="D") return Math.abs(p.y+1.01)<0.1;
      if (face==="F") return Math.abs(p.z-1.01)<0.1;
      if (face==="B") return Math.abs(p.z+1.01)<0.1;
      if (face==="R") return Math.abs(p.x-1.01)<0.1;
      if (face==="L") return Math.abs(p.x+1.01)<0.1;
      return false;
    });

  const animateTurn = (face, dir, times, done) => {
    const axisMap = {U:[0,1,0],D:[0,-1,0],F:[0,0,1],B:[0,0,-1],L:[-1,0,0],R:[1,0,0]};
    const axis = new THREE.Vector3(...axisMap[face]);
    const angle = (Math.PI/2)*dir*times*-1;
    const layer = layerFor(face);

    let f = 0, frames = 18;
    const step = () => {
      if (f < frames) {
        const delta = angle/frames;
        layer.forEach(c => {
          c.mesh.rotateOnWorldAxis(axis, delta);
          c.mesh.position.applyAxisAngle(axis, delta);
        });
        f++;
        requestAnimationFrame(step);
      } else {
        if (done) done();
      }
    };
    step();
  };

  const next = () => {
    if (idx >= moves.length-1) return;
    const m = moves[idx+1];
    const f = m[0];
    let d = 1, t = 1;
    if (m.includes("'")) d = -1;
    if (m.includes("2")) t = 2;
    animateTurn(f, d, t, () => setIdx(i => i+1));
  };

  const prev = () => {
    if (idx < 0) return;
    const m = moves[idx];
    const f = m[0];
    let d = -1, t = 1;
    if (m.includes("'")) d = 1;
    if (m.includes("2")) t = 2;
    animateTurn(f, d, t, () => setIdx(i => i-1));
  };

  const reset = () => {
    setIdx(-1);
    sceneRef.current = null;
    initScene();
  };

  useEffect(initScene, []);

  return (
    <div style={{ textAlign: "center" }}>
      <div ref={mountRef} style={{width:"100%",height:"310px", backgroundColor:"#181818"}} />
      <div style={{ marginTop:10 }}>
        <button onClick={prev}>Prev</button>
        <button onClick={reset} style={{margin:"0 10px"}}>Reset</button>
        <button onClick={next}>Next</button>
      </div>

      <div style={{marginTop:10,width:"80%",margin:"10px auto"}}>
        <progress
          max={moves.length}
          value={idx+1}
          style={{width:"100%"}}
        />
        <div>{idx+1}/{moves.length}</div>
      </div>
    </div>
  );
}
