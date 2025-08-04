// solution_viewer.js
// --- Unified Animation & State Logic ---
let solutionMoves = [];
let currentMoveIdx = -1;
let animating = false;
let animationTimeout = null;

// 3D Cube Setup
let scene, camera, renderer, cubelets = [];
// Use unified color system if available, otherwise import from color_defs.js
let COLORS = [];
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
    if (!scene || !cubelets || !cubeState || !COLORS || COLORS.length === 0) return;

    // Get color hex values from COLORS array
    const getColorHex = (colorIdx) => {
        if (COLORS[colorIdx] && COLORS[colorIdx].hex) {
            return COLORS[colorIdx].hex;
        }
        // Fallback colors if user colors not available
        const fallbackColors = ['#ffffff', '#ff2222', '#17d016', '#ffe900', '#ff9900', '#1177ff'];
        return fallbackColors[colorIdx] || '#666666';
    };

    for (let c of cubelets) {
        let { mesh, x, y, z } = c;
        // Reset all faces to dark color first
        for (let i = 0; i < 6; i++)
            mesh.material[i].color.set(0x232323);

        // Apply colors based on cube state
        if (y === 1) mesh.material[2].color.set(getColorHex(cubeState[0][z + 1][x + 1])); // Up face
        if (y === -1) mesh.material[3].color.set(getColorHex(cubeState[3][2 - (z + 1)][x + 1])); // Down face
        if (x === 1) mesh.material[0].color.set(getColorHex(cubeState[1][2 - (y + 1)][2 - (z + 1)])); // Right face
        if (x === -1) mesh.material[1].color.set(getColorHex(cubeState[4][2 - (y + 1)][z + 1])); // Left face
        if (z === 1) mesh.material[4].color.set(getColorHex(cubeState[2][2 - (y + 1)][x + 1])); // Front face
        if (z === -1) mesh.material[5].color.set(getColorHex(cubeState[5][2 - (y + 1)][2 - (x + 1)])); // Back face
    }
}

function reset3DSolutionCube() {
    cubeState = parseCubeString(cubeStr);
    update3DSolutionCube();
}

function animateFaceRotation(face, direction, times, callback) {
    const axisMap = {
        U: [0, 1, 0],  D: [0, -1, 0],
        F: [0, 0, 1],  B: [0, 0, -1],
        L: [-1, 0, 0], R: [1, 0, 0]
    };
    const axisVec = new THREE.Vector3(...axisMap[face]);
    const totalAngle = (Math.PI / 2) * direction * times * -1;

    const affected = getFaceCubelets(face);
    const frames = 20;
    let frame = 0;

    function step() {
        if (frame < frames) {
            const delta = totalAngle / frames;
            affected.forEach(c => {
                c.mesh.rotateOnWorldAxis(axisVec, delta);
                c.mesh.position.applyAxisAngle(axisVec, delta);
            });
            frame++;
            requestAnimationFrame(step);
        } else {
            // Snap positions to grid to avoid floating-point drift
            affected.forEach(c => {
                c.mesh.position.set(
                    Math.round(c.mesh.position.x * 1000) / 1000,
                    Math.round(c.mesh.position.y * 1000) / 1000,
                    Math.round(c.mesh.position.z * 1000) / 1000
                );
            });
            // Update logical cube state for each quarter turn
            for (let i = 0; i < times; i++) rotateFaceInCubeState(face, direction);
            if (callback) callback();
        }
    }

    step();
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

    if (idx < 0 || idx >= solutionMoves.length) {
        indicator.textContent = '';

        reset3DSolutionCube();
        return;
    }
    let move = solutionMoves[idx];
    indicator.textContent = `Step ${idx + 1}/${solutionMoves.length}: ${move}`;
    // Descriptive instruction text
    const descEl = document.getElementById('move-description-text');
    if (descEl) {
        const faceNames = { U: 'Up', D: 'Down', F: 'Front', B: 'Back', L: 'Left', R: 'Right' };
        const face = move[0];
        let dirText = 'clockwise';
        if (move.includes("'")) dirText = 'counter-clockwise';
        else if (move.includes('2')) dirText = '180° turn';
        descEl.textContent = `Rotate the ${faceNames[face] || face} face ${dirText}.`;
    }
    // update progress bar
    updateProgressBar(idx + 1, solutionMoves.length);

    // No cube animation here — caller handles 3D updates to avoid double turns
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

function pauseMoves() {
    animating = false;
    if (animationTimeout) {
        clearTimeout(animationTimeout);
        animationTimeout = null;
    }
}

// Navigate to previous move (single step)
function prevMove() {
    pauseMoves();
    // Already at initial state
    if (currentMoveIdx <= -1) return;

    const targetIdx = currentMoveIdx - 1; // can be -1 (initial)

    // Reverse the current move
    reverseMoveTo3DCube(solutionMoves[currentMoveIdx], () => {
        currentMoveIdx = targetIdx;
        showMove(currentMoveIdx);
    });
}

// Navigate to next move (single step)
function nextMove() {
    pauseMoves();
    if (currentMoveIdx >= solutionMoves.length - 1) return; // Already at last

    const targetIdx = currentMoveIdx + 1;
    applyMoveTo3DCube(solutionMoves[targetIdx], () => {
        currentMoveIdx = targetIdx;
        showMove(currentMoveIdx);
    });
}

function loadSolutionAnimation(solutionStr) {
    solutionMoves = parseSolution(solutionStr);
    currentMoveIdx = -1;
    animating = false;
    clearTimeout(animationTimeout);
    showMove(-1);
}

function updateProgressBar(done, total) {
    const fill = document.getElementById('progress-bar-fill');
    const label = document.getElementById('progress-bar-label');
    if (!fill || !label) return;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    fill.style.width = pct + '%';
    label.textContent = `Step ${done}/${total}`;
}

// Button event listeners

const prevBtn = document.getElementById('prev-move-btn');
if (prevBtn) prevBtn.onclick = prevMove;
const nextBtn = document.getElementById('next-move-btn');
if (nextBtn) nextBtn.onclick = nextMove;
const reloadBtn = document.getElementById('reload-move-btn');
if (reloadBtn) reloadBtn.onclick = () => {
    window.location.reload();
};

// On page load, parse query params and initialize everything
window.addEventListener('DOMContentLoaded', () => {
    // Get solution and cube string from query params
    const url = new URL(window.location.href);
    const solutionStr = url.searchParams.get('solution') || '';
    cubeStr = url.searchParams.get('cube_str') || '';

    // Initialize colors from unified color system if available
    if (window.CUBE_COLORS && window.CUBE_COLORS.getColorDefs) {
        COLORS = window.CUBE_COLORS.getColorDefs();
    } else {
        // Fallback to defaults if unified system not available
        console.warn('Could not load unified colors, using defaults');
        const fallbackColors = ['#ffffff', '#ff2222', '#17d016', '#ffe900', '#ff9900', '#1177ff'];
        COLORS = [
            { name: 'white', hex: fallbackColors[0] },
            { name: 'red', hex: fallbackColors[1] },
            { name: 'green', hex: fallbackColors[2] },
            { name: 'yellow', hex: fallbackColors[3] },
            { name: 'orange', hex: fallbackColors[4] },
            { name: 'blue', hex: fallbackColors[5] }
        ];
    }

    // Log for debugging
    console.log('Solution viewer initialized:');
    console.log('Cube string:', cubeStr);
    console.log('Solution:', solutionStr);
    console.log('Colors:', COLORS);

    solutionMoves = parseSolution(solutionStr);
    currentMoveIdx = -1;
    init3DSolutionCube();

    // Show initial state or first move
    updateProgressBar(0, solutionMoves.length);
    if (solutionMoves.length > 0) {
        showMove(0);
    } else {
        // If no solution, just show the cube state
        reset3DSolutionCube();
    }
});