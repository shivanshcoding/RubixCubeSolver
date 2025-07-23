let scene, camera, renderer, cubelets = [];

// Initialize 3D scene, camera, renderer, and create cubelets
function init3D() {
    const w = 320, h = 320;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x181818, 0.0);
    renderer.setSize(w, h);
    document.getElementById('cube-3d-preview').innerHTML = "";
    document.getElementById('cube-3d-preview').appendChild(renderer.domElement);

    camera.position.set(5, 6, 7);
    camera.lookAt(scene.position);

    // Lighting setup
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(8, 12, 10);
    scene.add(dir);

    // Create cubelets with 27 small cubes and add to scene
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
                cubelets.push({ mesh: cubelet, x, y, z });
            }
    animate();
    update3DCube();
}

// Update cubelet colors based on current cubeState
function update3DCube() {
    if (!scene || !cubelets || !COLORS || !cubeState) return;
    for (let face = 0; face < 6; face++) {
        if (!cubeState[face]) return;
        for (let row = 0; row < 3; row++) {
            if (!cubeState[face][row]) return;
            for (let col = 0; col < 3; col++) {
                if (typeof cubeState[face][row][col] === "undefined") return;
            }
        }
    }

    for (let c of cubelets) {
        let { mesh, x, y, z } = c;
        // Set default dark gray color for all 6 faces of the cubelet
        for (let i = 0; i < 6; i++)
            mesh.material[i].color.set(0x232323);

        // Assign colors to visible faces accordingly:

        // Up face (+Y), material index 2
        if (y === 1)
            mesh.material[2].color.set(COLORS[cubeState[0][z + 1][x + 1]].hex);

        // Down face (-Y), material index 3
        if (y === -1)
            mesh.material[3].color.set(COLORS[cubeState[3][2 - (z + 1)][2 - (x + 1)]].hex);

        // Right face (+X), material index 0
        if (x === 1)
            mesh.material[0].color.set(COLORS[cubeState[1][2 - (y + 1)][2 - (z + 1)]].hex);

        // Left face (-X), material index 1
        if (x === -1)
            mesh.material[1].color.set(COLORS[cubeState[4][2 - (y + 1)][z + 1]].hex);

        // Front face (+Z), material index 4
        if (z === 1)
            mesh.material[4].color.set(COLORS[cubeState[2][2 - (y + 1)][x + 1]].hex);

        // Back face (-Z), material index 5
        if (z === -1)
            mesh.material[5].color.set(COLORS[cubeState[5][2 - (y + 1)][2 - (x + 1)]].hex);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    // Optionally rotate entire cube slowly for preview
    scene.rotation.y += 0.009;
    renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init3D);

// Helper to get cubelets belonging to a given face (U,D,F,B,L,R)
function getFaceCubelets(face) {
    let res = [];
    for (let idx = 0; idx < cubelets.length; idx++) {
        let cubelet = cubelets[idx];
        let pos = cubelet.mesh.position;
        // Positions are multiples of ~1.01; use 2 * 0.505 = 1.01 to identify slice
        if (face === 'U' && Math.abs(pos.y - 1.01) < 0.1) res.push({ idx, mesh: cubelet.mesh });
        else if (face === 'D' && Math.abs(pos.y + 1.01) < 0.1) res.push({ idx, mesh: cubelet.mesh });
        else if (face === 'F' && Math.abs(pos.z - 1.01) < 0.1) res.push({ idx, mesh: cubelet.mesh });
        else if (face === 'B' && Math.abs(pos.z + 1.01) < 0.1) res.push({ idx, mesh: cubelet.mesh });
        else if (face === 'L' && Math.abs(pos.x + 1.01) < 0.1) res.push({ idx, mesh: cubelet.mesh });
        else if (face === 'R' && Math.abs(pos.x - 1.01) < 0.1) res.push({ idx, mesh: cubelet.mesh });
    }
    return res;
}

// Animate rotating a face with given direction and times (90° increments)
function animateFaceRotation(face, direction, times, callback) {
    function oneTurn(turnNum) {
        const facelets = getFaceCubelets(face);
        const axisMap = {
            U: [0, 1, 0],
            D: [0, -1, 0],
            F: [0, 0, 1],
            B: [0, 0, -1],
            L: [-1, 0, 0],
            R: [1, 0, 0]
        };
        let axis = new THREE.Vector3(...axisMap[face]);
        let angle = Math.PI / 2 * direction;
        let totalFrames = 20;
        let frame = 0;

        function rotateStep() {
            if (frame < totalFrames) {
                let delta = angle / totalFrames;
                facelets.forEach(obj => {
                    obj.mesh.rotateOnWorldAxis(axis, delta);
                });
                frame++;
                requestAnimationFrame(rotateStep);
            } else {
                rotateFaceCoords(face, direction);
                rotateFaceInCubeState(face, direction);
                update3DCube();
                if (turnNum + 1 < times) {
                    oneTurn(turnNum + 1);
                } else {
                    if (callback) callback();
                }
            }
        }
        rotateStep();
    }
    oneTurn(0);
}

// Parse a move string and returns object with face, direction, and times
function parseMove(move) {
    const face = move[0];
    let direction = 1;
    let times = 1;
    if (move.length > 1) {
        if (move[1] === "'") direction = -1;
        else if (move[1] === "2") times = 2;
    }
    return { face, direction, times };
}

// Get inverse of a move (for reverse animation)
function invertMove(move) {
    const { face, direction, times } = parseMove(move);
    const invDirection = (times === 2) ? direction : -direction; // double turns are self-inverse
    return { face, direction: invDirection, times };
}

// Apply a move animation
function applyMoveTo3DCube(move, callback) {
    const { face, direction, times } = parseMove(move);
    animateFaceRotation(face, direction, times, callback);
}

// Apply reverse move animation
function reverseMoveTo3DCube(move, callback) {
    const { face, direction, times } = invertMove(move);
    animateFaceRotation(face, direction, times, callback);
}

// Update cubelets logical coordinates after a single face turn
function rotateFaceCoords(face, direction) {
    for (let c of cubelets) {
        let { x, y, z } = c;
        let newX = x, newY = y, newZ = z;
        if (
            (face === 'U' && y === 1) ||
            (face === 'D' && y === -1) ||
            (face === 'F' && z === 1) ||
            (face === 'B' && z === -1) ||
            (face === 'L' && x === -1) ||
            (face === 'R' && x === 1)
        ) {
            if (face === 'U' || face === 'D') {
                let dir = direction;
                if (face === 'U') dir = -dir;
                [newX, newZ] = dir === 1 ? [-z, x] : [z, -x];
            } else if (face === 'F' || face === 'B') {
                let dir = direction;
                if (face === 'B') dir = -dir;
                [newX, newY] = dir === 1 ? [y, -x] : [-y, x];
            } else if (face === 'L' || face === 'R') {
                let dir = direction;
                if (face === 'R') dir = -dir;
                [newY, newZ] = dir === 1 ? [-z, y] : [z, -y];
            }
            c.x = newX;
            c.y = newY;
            c.z = newZ;
        }
    }
}

// Rotate face and adjacent edge stickers in cubeState after face turn
function rotateFaceInCubeState(face, direction) {
    function rotateFaceMatrix(fidx, dir) {
        let faceArr = cubeState[fidx];
        let temp = faceArr.map(row => row.slice());
        if (dir === 1) {
            // Clockwise
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    faceArr[j][2 - i] = temp[i][j];
        } else {
            // Counter-clockwise
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    faceArr[2 - j][i] = temp[i][j];
        }
    }

    const FACES = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

    const adjacent = {
        U: [
            [[5, 0, 2], [5, 0, 1], [5, 0, 0]], // B top
            [[1, 0, 2], [1, 0, 1], [1, 0, 0]], // R top
            [[2, 0, 2], [2, 0, 1], [2, 0, 0]], // F top
            [[4, 0, 2], [4, 0, 1], [4, 0, 0]], // L top
        ],
        D: [
            [[2, 2, 2], [2, 2, 1], [2, 2, 0]], // F bottom
            [[1, 2, 2], [1, 2, 1], [1, 2, 0]], // R bottom
            [[5, 2, 2], [5, 2, 1], [5, 2, 0]], // B bottom
            [[4, 2, 2], [4, 2, 1], [4, 2, 0]], // L bottom
        ],
        F: [
            [[0, 2, 0], [0, 2, 1], [0, 2, 2]], // U bottom
            [[1, 0, 0], [1, 1, 0], [1, 2, 0]], // R left column
            [[3, 0, 2], [3, 0, 1], [3, 0, 0]], // D top (reversed)
            [[4, 2, 2], [4, 1, 2], [4, 0, 2]], // L right column (reversed)
        ],
        B: [
            [[0, 0, 2], [0, 0, 1], [0, 0, 0]], // U top
            [[4, 2, 0], [4, 1, 0], [4, 0, 0]], // L left column
            [[3, 2, 0], [3, 2, 1], [3, 2, 2]], // D bottom (reversed)
            [[1, 0, 2], [1, 1, 2], [1, 2, 2]], // R right column (reversed)
        ],
        R: [
            [[0, 0, 2], [0, 1, 2], [0, 2, 2]], // U right column
            [[5, 2, 0], [5, 1, 0], [5, 0, 0]], // B left column (reversed)
            [[3, 0, 2], [3, 1, 2], [3, 2, 2]], // D right column
            [[2, 0, 2], [2, 1, 2], [2, 2, 2]], // F right column
        ],
        L: [
            [[0, 2, 0], [0, 1, 0], [0, 0, 0]], // U left column
            [[2, 0, 0], [2, 1, 0], [2, 2, 0]], // F left column
            [[3, 2, 0], [3, 1, 0], [3, 0, 0]], // D left column (reversed)
            [[5, 0, 2], [5, 1, 2], [5, 2, 2]], // B right column (reversed)
        ],
    };

    rotateFaceMatrix(FACES[face], direction);

    const adj = adjacent[face];
    const temp = adj.map(arr => arr.map(([f, r, c]) => cubeState[f][r][c]));
    const mapTo = direction === 1 ? [3, 0, 1, 2] : [1, 2, 3, 0];

    for (let i = 0; i < 4; i++) {
        const from = temp[mapTo[i]];
        for (let j = 0; j < 3; j++) {
            let [f, r, c] = adj[i][j];
            cubeState[f][r][c] = from[j];
        }
    }
}
