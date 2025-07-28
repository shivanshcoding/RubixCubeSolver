// solution_viewer.js
// --- Unified Animation & State Logic ---
let solutionMoves = [];
let currentMoveIdx = -1;
let animating = false;
let animationTimeout = null;

// 3D Cube Setup
let scene, camera, renderer, cubelets = [];
import { getColorDefs, parseMove } from './color_defs.js';
let COLORS = getColorDefs();
let cubeState;
let cubeStr = '';

function parseSolution(solutionStr) {
    return solutionStr.trim().split(/\s+/).filter(Boolean);
}

function parseCubeString(str) {
    let arr = [];
    let idx = 0;
    for (let f = 0; f < 6; f++) {
        let face = [];
        for (let r = 0; r < 3; r++) {
            let row = [];
            for (let c = 0; c < 3; c++) {
                let k = str[idx++];
                let colorIdx = 'URFDLB'.indexOf(k);
                row.push(colorIdx >= 0 ? colorIdx : 0);
            }
            face.push(row);
        }
        arr.push(face);
    }
    return arr;
}

function init3DSolutionCube() {
    const w = 320, h = 320;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x181818, 0.0);
    renderer.setSize(w, h);
    document.getElementById('cube-3d-solution').innerHTML = "";
    document.getElementById('cube-3d-solution').appendChild(renderer.domElement);
    camera.position.set(5, 6, 7);
    camera.lookAt(scene.position);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(8, 12, 10);
    scene.add(dir);
    cubelets = [];
    let sz = 0.95, gap = 0.06;
    for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
            for (let z = -1; z <= 1; z++) {
                let geo = new THREE.BoxGeometry(sz, sz, sz);
                let mats = [];
                for (let i = 0; i < 6; i++)
                    mats.push(new THREE.MeshLambertMaterial({ color: 0x232323 }));
                let cubelet = new THREE.Mesh(geo, mats);
                cubelet.position.set(x * (sz + gap), y * (sz + gap), z * (sz + gap));
                scene.add(cubelet);
                cubelets.push({ mesh: cubelet, x, y, z, materials: mats.slice() });
            }
    animate3DSolutionCube();
    reset3DSolutionCube();
}
function animate3DSolutionCube() {
    requestAnimationFrame(animate3DSolutionCube);
    scene.rotation.y += 0.009;
    renderer.render(scene, camera);
}
function update3DSolutionCube() {
    if (!scene || !cubelets || !cubeState) return;
    for (let c of cubelets) {
        let { mesh, x, y, z } = c;
        for (let i = 0; i < 6; i++)
            mesh.material[i].color.set(0x232323);
        if (y === 1) mesh.material[2].color.set(COLORS[cubeState[0][z + 1][x + 1]]);
        if (y === -1) mesh.material[3].color.set(COLORS[cubeState[3][2 - (z + 1)][x + 1]]);
        if (x === 1) mesh.material[0].color.set(COLORS[cubeState[1][2 - (y + 1)][2 - (z + 1)]]);
        if (x === -1) mesh.material[1].color.set(COLORS[cubeState[4][2 - (y + 1)][z + 1]]);
        if (z === 1) mesh.material[4].color.set(COLORS[cubeState[2][2 - (y + 1)][x + 1]]);
        if (z === -1) mesh.material[5].color.set(COLORS[cubeState[5][2 - (y + 1)][2 - (x + 1)]]);
    }
}
function reset3DSolutionCube() {
    cubeState = parseCubeString(cubeStr);
    update3DSolutionCube();
}
function animateFaceRotation(face, direction, times, callback) {
    function oneTurn(turnNum) {
        const facelets = getFaceCubelets(face);

        // Axis for each face (from center outward)
        const axisMap = {
            U: [0, 1, 0],   // +Y (upward)
            D: [0, -1, 0],  // -Y (downward)
            F: [0, 0, 1],   // +Z (towards you)
            B: [0, 0, -1],  // -Z (away from you)
            L: [-1, 0, 0],  // -X (leftward)
            R: [1, 0, 0],   // +X (rightward)
        };

        const axisVec = new THREE.Vector3(...axisMap[face]);

        // Flip angle for faces where camera looks opposite to axis direction
        const flipAngleFaces = ['R', 'B', 'D','L','U','F'];
        const flip = flipAngleFaces.includes(face) ? -1 : 1;

        const angle = (Math.PI / 2) * direction * flip;
        const totalFrames = 20;
        let frame = 0;

        function rotateStep() {
            if (frame < totalFrames) {
                const deltaAngle = angle / totalFrames;
                facelets.forEach(c => {
                    c.mesh.rotateOnWorldAxis(axisVec, deltaAngle);
                    c.mesh.position.applyAxisAngle(axisVec, deltaAngle);
                    c.mesh.material.forEach(m => m.emissive?.setHex(0x00ffe7));
                });
                frame++;
                requestAnimationFrame(rotateStep);
            } else {
                // Snap to grid to avoid floating point drift
                facelets.forEach(c => {
                    c.mesh.position.set(
                        Math.round(c.mesh.position.x * 1000) / 1000,
                        Math.round(c.mesh.position.y * 1000) / 1000,
                        Math.round(c.mesh.position.z * 1000) / 1000
                    );
                    c.mesh.material.forEach(m => m.emissive?.setHex(0x000000));
                });

                // Update internal cube state
                rotateFaceInCubeState(face, direction);

                // Continue if more turns needed
                if (turnNum + 1 < times) {
                    oneTurn(turnNum + 1);
                } else if (callback) {
                    callback();
                }
            }
        }

        rotateStep();
    }

    oneTurn(0);
}

function getFaceCubelets(face) {
    let res = [];
    for (let cubelet of cubelets) {
        let pos = cubelet.mesh.position;
        if (face === 'U' && Math.abs(pos.y - 1.01) < 0.1) res.push(cubelet);
        else if (face === 'D' && Math.abs(pos.y + 1.01) < 0.1) res.push(cubelet);
        else if (face === 'F' && Math.abs(pos.z - 1.01) < 0.1) res.push(cubelet);
        else if (face === 'B' && Math.abs(pos.z + 1.01) < 0.1) res.push(cubelet);
        else if (face === 'L' && Math.abs(pos.x + 1.01) < 0.1) res.push(cubelet);
        else if (face === 'R' && Math.abs(pos.x - 1.01) < 0.1) res.push(cubelet);
    }
    return res;
}
function rotateFaceInCubeState(face, direction) {
    function rotateFaceMatrix(fidx, dir) {
        let faceArr = cubeState[fidx];
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
    rotateFaceMatrix(FACES[face], direction);
    // Not updating adjacent stickers for simplicity (visual only)
}

function showMove(idx) {
    let indicator = document.getElementById('move-indicator');
    let img = document.getElementById('move-image');
    if (idx < 0 || idx >= solutionMoves.length) {
        indicator.textContent = '';
        img.src = '';
        reset3DSolutionCube();
        return;
    }
    let move = solutionMoves[idx];
    indicator.textContent = `Step ${idx + 1}/${solutionMoves.length}: ${move}`;
    let imgFile = move.replace("'", "prime");
    img.src = `/static/img/${imgFile}.png`;
    // Animate the move on the 3D cube
    if (idx === 0) {
        reset3DSolutionCube();
    } else {
        // Animate from previous move
        const prevMove = solutionMoves[idx - 1];
        const face = move[0];
        let direction = 1;
        let times = 1;
        if (move.length > 1) {
            if (move[1] === "'") direction = -1;
            else if (move[1] === "2") times = 2;
        }
        animateFaceRotation(face, direction, times);
    }
}

function applyMoveTo3DCube(move, callback) {
    let face = move[0];
    let direction = 1;
    let times = 1;
    if (move.length > 1) {
        if (move[1] === "'") direction = -1;
        else if (move[1] === "2") times = 2;
    }
    animateFaceRotation(face, direction, times, callback);
}

function reverseMoveTo3DCube(move, callback) {
    let face = move[0];
    let direction = -1;
    let times = 1;
    if (move.length > 1) {
        if (move[1] === "'") direction = 1;
        else if (move[1] === "2") times = 2;
    }
    animateFaceRotation(face, direction, times, callback);
}

function animateMove(idx) {
    if (idx < 0 || idx >= solutionMoves.length) {
        animating = false;
        return;
    }
    applyMoveTo3DCube(solutionMoves[idx], () => {
        currentMoveIdx = idx;
        showMove(currentMoveIdx);
        if (animating && currentMoveIdx < solutionMoves.length - 1) {
            animationTimeout = setTimeout(() => animateMove(currentMoveIdx + 1), 700);
        } else {
            animating = false;
        }
    });
}

function playMoves() {
    if (animating) return;
    animating = true;
    if (currentMoveIdx >= solutionMoves.length - 1) {
        currentMoveIdx = -1;
    }
    animateMove(currentMoveIdx + 1);
}

function pauseMoves() {
    animating = false;
    if (animationTimeout) {
        clearTimeout(animationTimeout);
        animationTimeout = null;
    }
}

function prevMove() {
    pauseMoves();
    if (currentMoveIdx >= 0) {
        reverseMoveTo3DCube(solutionMoves[currentMoveIdx], () => {
            currentMoveIdx--;
            showMove(currentMoveIdx);
        });
    }
}

function nextMove() {
    pauseMoves();
    if (currentMoveIdx < solutionMoves.length - 1) {
        animateMove(currentMoveIdx + 1);
    }
}

function loadSolutionAnimation(solutionStr) {
    solutionMoves = parseSolution(solutionStr);
    currentMoveIdx = -1;
    animating = false;
    clearTimeout(animationTimeout);
    showMove(-1);
}

// Button event listeners
const playBtn = document.getElementById('play-move-btn');
if (playBtn) playBtn.onclick = playMoves;
const pauseBtn = document.getElementById('pause-move-btn');
if (pauseBtn) pauseBtn.onclick = pauseMoves;
const prevBtn = document.getElementById('prev-move-btn');
if (prevBtn) prevBtn.onclick = prevMove;
const nextBtn = document.getElementById('next-move-btn');
if (nextBtn) nextBtn.onclick = nextMove;

// On page load, parse query params and initialize everything
window.addEventListener('DOMContentLoaded', () => {
    // Get solution and cube string from query params
    const url = new URL(window.location.href);
    const solutionStr = url.searchParams.get('solution') || '';
    cubeStr = url.searchParams.get('cube_str') || '';
    solutionMoves = parseSolution(solutionStr);
    currentMoveIdx = -1;
    init3DSolutionCube();
    showMove(0);
}); 