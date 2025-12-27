"use client";
import * as THREE from "three";
import { useEffect, useRef, useMemo } from "react";

export default function Cube3D({ moves, faces, palette, state = "preview" }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const cubeletsRef = useRef(null);

  const colors = useMemo(() => {
    const out = {};
    palette.forEach(p => (out[p.face] = p.color));
    return out;
  }, [palette]);

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

    const cubelets = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          const mats = Array.from({ length: 6 }, () =>
            new THREE.MeshBasicMaterial({ color: "#232323" })
          );
          const cubelet = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.9, 0.9),
            mats
          );
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
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // update colors on live input
  useEffect(() => {
    if (!faces || !palette) return;
    const cubelets = cubeletsRef.current;
    if (!cubelets) return;

    for (const c of cubelets) {
      const { mesh, x, y, z } = c;
      const m = mesh.material;

      for (let i = 0; i < 6; i++) m[i].color.set("#232323");

      if (y === 1) m[2].color.set(colors[faces.U[z + 1][x + 1]]);
      if (y === -1) m[3].color.set(colors[faces.D[2 - (z + 1)][x + 1]]);
      if (x === 1) m[0].color.set(colors[faces.R[2 - (y + 1)][2 - (z + 1)]]);
      if (x === -1) m[1].color.set(colors[faces.L[2 - (y + 1)][z + 1]]);
      if (z === 1) m[4].color.set(colors[faces.F[2 - (y + 1)][x + 1]]);
      if (z === -1) m[5].color.set(colors[faces.B[2 - (y + 1)][2 - (x + 1)]]);
    }
  }, [faces, colors]);

  return (
    <div
      ref={mountRef}
      style={{ width: "250px", height: "250px", border: "1px solid #333" }}
    />
  );
}