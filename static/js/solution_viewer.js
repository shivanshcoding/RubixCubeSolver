// solution_viewer.js
(function() {
    // --- Move Descriptions ---
    const MOVE_DESCRIPTIONS = {
        U: "Turn the Up (top) face clockwise",
        "U'": "Turn the Up (top) face counterclockwise",
        U2: "Turn the Up (top) face 180°",
        D: "Turn the Down (bottom) face clockwise",
        "D'": "Turn the Down (bottom) face counterclockwise",
        D2: "Turn the Down (bottom) face 180°",
        F: "Turn the Front face clockwise",
        "F'": "Turn the Front face counterclockwise",
        F2: "Turn the Front face 180°",
        B: "Turn the Back face clockwise",
        "B'": "Turn the Back face counterclockwise",
        B2: "Turn the Back face 180°",
        L: "Turn the Left face clockwise",
        "L'": "Turn the Left face counterclockwise",
        L2: "Turn the Left face 180°",
        R: "Turn the Right face clockwise",
        "R'": "Turn the Right face counterclockwise",
        R2: "Turn the Right face 180°"
    };

    // --- Query Params ---
    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }
    const solutionStr = getQueryParam('solution') || '';
    const cubeStr = getQueryParam('cube_str') || '';
    const moves = solutionStr.trim().split(/\s+/).filter(Boolean);
    let currentMoveIdx = -1;

    // --- DOM Elements ---
    document.getElementById('solution-cube-string').textContent = cubeStr ? `Cube: ${cubeStr}` : '';
    const moveIndicator = document.getElementById('move-indicator');
    const moveImage = document.getElementById('move-image');
    const prevBtn = document.getElementById('prev-move-btn');
    const nextBtn = document.getElementById('next-move-btn');
    const moveDesc = document.getElementById('move-description');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarLabel = document.getElementById('progress-bar-label');

    // --- 3D Cube Setup ---
    let scene, camera, renderer, cubelets = [];
    const COLORS = [0xffffff, 0xff2222, 0x17d016, 0xffe900, 0xff9900, 0x1177ff];
    // U, R, F, D, L, B
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
    // Parse cubeStr into 6x3x3 array
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
    let cubeState = parseCubeString(cubeStr);
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
    // Animate a face turn
    function animateFaceRotation(face, direction, times, callback) {
        function oneTurn(turnNum) {
            const facelets = getFaceCubelets(face);
            const axisMap = {
                U: [0, 1, 0], D: [0, -1, 0], F: [0, 0, 1], B: [0, 0, -1], L: [-1, 0, 0], R: [1, 0, 0],
            };
            const axisVec = new THREE.Vector3(...axisMap[face]);
            const angle = (Math.PI / 2) * direction;
            const totalFrames = 20;
            let frame = 0;
            function rotateStep() {
                if (frame < totalFrames) {
                    const deltaAngle = angle / totalFrames;
                    facelets.forEach(c => {
                        c.mesh.rotateOnWorldAxis(axisVec, deltaAngle);
                        c.mesh.position.applyAxisAngle(axisVec, deltaAngle);
                        // Highlight
                        c.mesh.material.forEach(m => m.emissive && m.emissive.setHex(0x00ffe7));
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
                        c.mesh.material.forEach(m => m.emissive && m.emissive.setHex(0x000000));
                    });
                    rotateCubeletMaterials(face, direction, facelets);
                    rotateFaceInCubeState(face, direction);
                    if (turnNum + 1 < times) oneTurn(turnNum + 1);
                    else if (callback) callback();
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
    function rotateCubeletMaterials(face, direction, facelets) {
        // No-op for now (visual only)
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
    function reset3DSolutionCube() {
        cubeState = parseCubeString(cubeStr);
        update3DSolutionCube();
    }
    // --- Move Logic ---
    function showMove(idx) {
        if (idx < 0 || idx >= moves.length) {
            moveIndicator.textContent = 'Start viewing your solution!';
            moveImage.src = '';
            moveDesc.textContent = '';
            progressBarFill.style.width = '0%';
            progressBarLabel.textContent = '';
            reset3DSolutionCube();
            return;
        }
        const move = moves[idx];
        moveIndicator.textContent = `Step ${idx + 1} / ${moves.length}: ${move}`;
        let imgFile = move.replace("'", "prime");
        moveImage.src = `/static/img/${imgFile}.png`;
        moveDesc.textContent = MOVE_DESCRIPTIONS[move] || '';
        progressBarFill.style.width = `${((idx + 1) / moves.length) * 100}%`;
        progressBarLabel.textContent = `Step ${idx + 1} of ${moves.length}`;
        // Animate 3D cube
        if (idx === 0) {
            reset3DSolutionCube();
        } else {
            // Animate from previous move
            const prevMove = moves[idx - 1];
            // For simplicity, just apply the current move
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
    prevBtn.onclick = function() {
        if (currentMoveIdx > 0) {
            currentMoveIdx--;
            showMove(currentMoveIdx);
        }
    };
    nextBtn.onclick = function() {
        if (currentMoveIdx < moves.length - 1) {
            currentMoveIdx++;
            showMove(currentMoveIdx);
        }
    };
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') prevBtn.click();
        if (e.key === 'ArrowRight') nextBtn.click();
    });
    // Start at first move
    if (moves.length > 0) {
        currentMoveIdx = 0;
        init3DSolutionCube();
        showMove(currentMoveIdx);
    } else {
        moveIndicator.textContent = 'No solution found.';
        moveDesc.textContent = '';
        progressBarFill.style.width = '0%';
        progressBarLabel.textContent = '';
    }
})(); 