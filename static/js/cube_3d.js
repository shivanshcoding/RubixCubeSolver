let scene, camera, renderer, cubelets = [];

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

    animate();
    update3DCube();
}

function update3DCube() {
    if (!scene || !cubelets || !COLORS || !cubeState) return;

    for (let c of cubelets) {
        let { mesh, x, y, z } = c;

        for (let i = 0; i < 6; i++)
            mesh.material[i].color.set(0x232323);

        if (y === 1) mesh.material[2].color.set(COLORS[cubeState[0][z + 1][x + 1]].hex);
        if (y === -1) mesh.material[3].color.set(COLORS[cubeState[3][2 - (z + 1)][x + 1]].hex);
        if (x === 1) mesh.material[0].color.set(COLORS[cubeState[1][2 - (y + 1)][2 - (z + 1)]].hex);
        if (x === -1) mesh.material[1].color.set(COLORS[cubeState[4][2 - (y + 1)][z + 1]].hex);
        if (z === 1) mesh.material[4].color.set(COLORS[cubeState[2][2 - (y + 1)][x + 1]].hex);
        if (z === -1) mesh.material[5].color.set(COLORS[cubeState[5][2 - (y + 1)][2 - (x + 1)]].hex);
    }
}

function animate() {
    requestAnimationFrame(animate);
    scene.rotation.y += 0.009;
    renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', init3D);

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

//Theek karna hai isko
// function rotateCubeletMaterials(face, direction, cubelet) {
//     const mat = cubelet.mesh.material;
//     let rotated;

//     switch (face) {
//         case 'U':
//         case 'D':
//             rotated = [mat[4], mat[0], mat[5], mat[1]]; // L, F, R, B
//             if (direction === -1) rotated = [mat[1], mat[5], mat[0], mat[4]]; // reversed manually
//             [mat[4], mat[0], mat[5], mat[1]] = rotated;
//             break;

//         case 'F':
//         case 'B':
//             rotated = [mat[2], mat[0], mat[3], mat[1]]; // U, R, D, L
//             if (direction === -1) rotated = [mat[1], mat[3], mat[0], mat[2]];
//             [mat[2], mat[0], mat[3], mat[1]] = rotated;
//             break;

//         case 'R':
//         case 'L':
//             rotated = [mat[2], mat[5], mat[3], mat[4]]; // U, B, D, F
//             if (direction === -1) rotated = [mat[4], mat[3], mat[5], mat[2]];
//             [mat[2], mat[5], mat[3], mat[4]] = rotated;
//             break;
//     }
// }

function rotateCubeletMaterials(face, direction, cubelet) {
    const mat = cubelet.mesh.material;
    let rotated;

    switch (face) {
        case 'U':
            rotated = direction === 1
                ? [mat[1], mat[4], mat[0], mat[5]]  // L, F, R, B → CW
                : [mat[1], mat[4], mat[0], mat[5]]; // CCW
            [mat[1], mat[4], mat[0], mat[5]] = rotated;
            break;

        case 'D':
            rotated = direction === 1
                ? [mat[0], mat[5], mat[1], mat[4]]  // R, B, L, F → CW
                : [mat[0], mat[5], mat[1], mat[4]]; // CCW
            [mat[0], mat[5], mat[1], mat[4]] = rotated;
            break;

        case 'F':
            rotated = direction === 1
                ? [mat[1], mat[2], mat[0], mat[3]]  // L, U, R, D → CW
                : [mat[1], mat[2], mat[0], mat[3]]; // CCW
            [mat[1], mat[2], mat[0], mat[3]] = rotated;
            break;

        case 'B':
            rotated = direction === 1
                ? [mat[0], mat[3], mat[1], mat[2]]  // R, D, L, U → CW
                : [mat[0], mat[3], mat[1], mat[2]]; // CCW
            [mat[0], mat[3], mat[1], mat[2]] = rotated;
            break;

        case 'R':
            rotated = direction == 1
                ? [mat[2], mat[4], mat[3], mat[5]]  // U, F, D, B → CW
                : [mat[2], mat[4], mat[3], mat[5]]; // CCW
            [mat[2], mat[4], mat[3], mat[5]] = rotated;
            break;

        case 'L':
            rotated = direction == 1
                ? [mat[2], mat[5], mat[3], mat[4]]  // U, B, D, F → CW
                : [mat[2], mat[5], mat[3], mat[4]]; // CCW
            [mat[2], mat[5], mat[3], mat[4]] = rotated;
            break;
    }
}


function animateFaceRotation(face, direction, times, callback) {
    function oneTurn(turnNum) {
        const facelets = getFaceCubelets(face);

        const axisMap = {
            U: [0, 1, 0],
            D: [0, -1, 0],
            F: [0, 0, 1],
            B: [0, 0, -1],
            L: [-1, 0, 0],
            R: [1, 0, 0],
        };

        const axisVec = new THREE.Vector3(...axisMap[face]);

        // ✅ Flip for these faces so visual CW matches standard notation
        const flipFaces = ['L', 'D', 'B', 'R','F', 'U'];
        const visualDirection = flipFaces.includes(face) ? -direction : direction;

        const angle = (Math.PI / 2) * visualDirection;

        const totalFrames = 20;
        let frame = 0;

        function rotateStep() {
            if (frame < totalFrames) {
                const deltaAngle = angle / totalFrames;
                facelets.forEach(c => {
                    c.mesh.rotateOnWorldAxis(axisVec, deltaAngle);
                    c.mesh.position.applyAxisAngle(axisVec, deltaAngle);
                });
                frame++;
                requestAnimationFrame(rotateStep);
            } else {
                facelets.forEach(c => {
                    c.mesh.position.set(
                        Math.round(c.mesh.position.x * 1000) / 1000,
                        Math.round(c.mesh.position.y * 1000) / 1000,
                        Math.round(c.mesh.position.z * 1000) / 1000
                    );
                    rotateCubeletMaterials(face, direction, c);
                });
                rotateFaceCoords(face, direction);
                rotateFaceInCubeState(face, direction);
                if (turnNum + 1 < times) oneTurn(turnNum + 1);
                else if (callback) callback();
            }
        }

        rotateStep();
    }

    oneTurn(0);
}


function rotateFaceCoords(face, direction) {
    for (let c of cubelets) {
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

function invertMove(move) {
    const { face, direction, times } = parseMove(move);
    const invDirection = -direction;
    return { face, direction: invDirection, times };
}

function applyMoveTo3DCube(move, callback) {
    const { face, direction, times } = parseMove(move);
    animateFaceRotation(face, direction, times, callback);
}

function reverseMoveTo3DCube(move, callback) {
    const { face, direction, times } = invertMove(move);
    animateFaceRotation(face, direction, times, callback);
}
