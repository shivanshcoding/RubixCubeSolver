// Colors (can customize)
const COLORS = [
    { name: 'white', hex: '#fff', k: 'U' },    // Up
    { name: 'red', hex: '#ff2222', k: 'R' },   // Right
    { name: 'green', hex: '#17d016', k: 'F' }, // Front
    { name: 'yellow', hex: '#ffe900', k: 'D' },// Down
    { name: 'orange', hex: '#ff9900', k: 'L' },// Left
    { name: 'blue', hex: '#1177ff', k: 'B' }   // Back
];
let selectedColor = 0;


// 0-based [face][row][col]
let cubeState = Array(6).fill().map(() => Array(3).fill().map(() => Array(3).fill(0)));


// Face order: U, R, F, D, L, B
const FACE_ORDER = ['up', 'right', 'front', 'down', 'left', 'back'];
const FACE_MAP = { up: 0, right: 1, front: 2, down: 3, left: 4, back: 5 };

// Fixed mapping from color index to Kociemba face letter
const COLOR_IDX_TO_FACE_LETTER = {
    0: 'U', // white
    1: 'R', // red
    2: 'F', // green
    3: 'D', // yellow
    4: 'L', // orange
    5: 'B'  // blue
};

function drawColorBtns() {
    const row = document.getElementById('color-row');
    row.innerHTML = '';
    COLORS.forEach((c, i) => {
        let btn = document.createElement('div');
        btn.className = 'color-btn' + (i === selectedColor ? ' selected' : '');
        btn.style.background = c.hex;
        btn.onclick = () => {
            selectedColor = i;
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        };
        row.appendChild(btn);
    });
}

function drawCube() {
    FACE_ORDER.forEach(face => {
        let grid = document.getElementById(`face-${face}`);
        grid.innerHTML = '';
        let f = FACE_MAP[face];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
            let cell = document.createElement('div');
            cell.className = 'cube-cell';
            cell.style.background = COLORS[cubeState[f][r][c]].hex;
            cell.onclick = () => {
                cubeState[f][r][c] = selectedColor;
                cell.style.background = COLORS[selectedColor].hex;
                cell.classList.add('selected');
                setTimeout(() => cell.classList.remove('selected'), 250);
                update3DCube();
                updateCubeString();
            };
            grid.appendChild(cell);
        }
    });
}

// Returns cube string for Kociemba solver using fixed known color to face letter mapping
function getKociembaCubeString() {
    let str = "";
    for (let face = 0; face < 6; face++) {
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                let colorIdx = cubeState[face][row][col];
                str += COLOR_IDX_TO_FACE_LETTER[colorIdx] || 'U';
            }
        }
    }
    console.log("Cube string to submit:", str);
    return str;
}

function updateCubeString() {
    const cubeStr = getKociembaCubeString();
    document.getElementById('cube-string').textContent = cubeStr;
    validateCube();
}

// Check that centers match expected fixed color indexes for each face
function validateCenters() {
    for (let f = 0; f < 6; f++) {
        if (cubeState[f][1][1] !== f) return false;
    }
    return true;
}

function validateCube() {
    if (!validateCenters()) {
        document.getElementById('cube-status').textContent = '✗ Invalid: Each face center must be the correct fixed color.';
        document.getElementById('cube-status').className = 'status invalid';
        document.getElementById('submit-btn').disabled = true;
        return;
    }

    let colorCounts = Array(6).fill(0);
    for (let f = 0; f < 6; f++)
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < 3; c++)
                colorCounts[cubeState[f][r][c]]++;

    let valid = colorCounts.every(count => count === 9);

    const status = document.getElementById('cube-status');
    if (valid) {
        status.textContent = '✔ Cube state valid!';
        status.className = 'status valid';
        document.getElementById('submit-btn').disabled = false;
    } else {
        status.textContent = '✗ Invalid: Each color must appear 9 times.';
        status.className = 'status invalid';
        document.getElementById('submit-btn').disabled = true;
    }
}

function submitCube() {
    const cubeStr = getKociembaCubeString();
    fetch('/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cube_str: cubeStr })
    })
        .then(r => r.json())
        .then(data => {
            const box = document.getElementById('solution-box');
            if (data.success) {
                box.innerHTML = `<b>Solution:</b><br>${data.solution}`;
                loadSolutionAnimation(data.solution);
            } else {
                box.innerHTML = `<span style="color:#ff4a4a"><b>Error:</b> ${data.error}</span>`;
            }
        });
}

// Reset all stickers to first color (usually white) and fix centers properly
function resetCube() {
    for (let f = 0; f < 6; f++) {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                cubeState[f][r][c] = f; // Set all stickers to face color index f
            }
        }
    }
    drawCube();
    updateCubeString();
    update3DCube();
}

// Randomize stickers ensuring centers fixed and exactly 9 stickers per color
function randomizeCube() {
    // Fix centers: each face's center is color index = face index
    for (let f = 0; f < 6; f++) {
        cubeState[f][1][1] = f;
    }

    // Create array with 8 stickers per color (except centers)
    let stickers = [];
    for (let color = 0; color < 6; color++) {
        for (let count = 0; count < 8; count++) {
            stickers.push(color);
        }
    }

    // Shuffle the 48 sticker array
    for (let i = stickers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [stickers[i], stickers[j]] = [stickers[j], stickers[i]];
    }

    // Assign stickers to all positions except centers
    let index = 0;
    for (let f = 0; f < 6; f++) {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (r === 1 && c === 1) {
                    // Center already set
                    continue;
                }
                cubeState[f][r][c] = stickers[index++];
            }
        }
    }

    drawCube();
    updateCubeString();
    update3DCube();
}

document.addEventListener('DOMContentLoaded', () => {
    drawColorBtns();
    resetCube(); // Reset initializes the cube with centers fixed and uniform colors
    document.getElementById('submit-btn').onclick = submitCube;
    document.getElementById('reset-btn').onclick = resetCube;
    document.getElementById('random-btn').onclick = randomizeCube;
});


// Rotates a face and adjacent stickers in cubeState
function rotateFaceInCubeState(face, direction) {
    // face: 'U','D','F','B','L','R'
    // direction: 1 (CW), -1 (CCW)
    // Rotates the face and the adjacent edge stickers in cubeState

    // Helper to rotate a 3x3 matrix in place
    function rotateFaceMatrix(fidx, dir) {
        let faceArr = cubeState[fidx];
        // Deep copy to avoid overwrite
        let temp = faceArr.map(row => row.slice());
        if (dir === 1) {
            // CW
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    faceArr[j][2 - i] = temp[i][j];
        } else {
            // CCW
            for (let i = 0; i < 3; i++)
                for (let j = 0; j < 3; j++)
                    faceArr[2 - j][i] = temp[i][j];
        }
    }

    // Face indices in your cubeState: U=0, R=1, F=2, D=3, L=4, B=5
    // For each move, permute the adjacent edge stickers
    // See https://ruwix.com/the-rubiks-cube/notation/ for the mapping
    // We'll define the mapping for each face
    // Each entry: [faceIdx, row, col], in the order to be rotated

    // Map: face letter to index
    const FACES = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };

    // For each face, 4 arrays of 3 [row,col] pairs (for the 4 adjacent faces), in rotation order
    // Format: [ [faceIdx, row1, col1], ... x3 ] x4 adjacent faces
    const adjacent = {
        U: [
            [ [5,0,2], [5,0,1], [5,0,0] ], // B top
            [ [1,0,2], [1,0,1], [1,0,0] ], // R top
            [ [2,0,2], [2,0,1], [2,0,0] ], // F top
            [ [4,0,2], [4,0,1], [4,0,0] ], // L top
        ],
        D: [
            [ [2,2,2], [2,2,1], [2,2,0] ], // F bottom
            [ [1,2,2], [1,2,1], [1,2,0] ], // R bottom
            [ [5,2,2], [5,2,1], [5,2,0] ], // B bottom
            [ [4,2,2], [4,2,1], [4,2,0] ], // L bottom
        ],
        F: [
            [ [0,2,0], [0,2,1], [0,2,2] ], // U bottom
            [ [1,0,0], [1,1,0], [1,2,0] ], // R left col
            [ [3,0,2], [3,0,1], [3,0,0] ], // D top (reversed)
            [ [4,2,2], [4,1,2], [4,0,2] ], // L right col (reversed)
        ],
        B: [
            [ [0,0,2], [0,0,1], [0,0,0] ], // U top
            [ [4,2,0], [4,1,0], [4,0,0] ], // L left col
            [ [3,2,0], [3,2,1], [3,2,2] ], // D bottom (reversed)
            [ [1,0,2], [1,1,2], [1,2,2] ], // R right col (reversed)
        ],
        R: [
            [ [0,0,2], [0,1,2], [0,2,2] ], // U right col
            [ [5,2,0], [5,1,0], [5,0,0] ], // B left col (reversed)
            [ [3,0,2], [3,1,2], [3,2,2] ], // D right col
            [ [2,0,2], [2,1,2], [2,2,2] ], // F right col
        ],
        L: [
            [ [0,2,0], [0,1,0], [0,0,0] ], // U left col
            [ [2,0,0], [2,1,0], [2,2,0] ], // F left col
            [ [3,2,0], [3,1,0], [3,0,0] ], // D left col (reversed)
            [ [5,0,2], [5,1,2], [5,2,2] ], // B right col (reversed)
        ],
    };

    // Rotate face stickers
    rotateFaceMatrix(FACES[face], direction);

    // Rotate adjacent edge stickers
    let adj = adjacent[face];
    // Deep copy edge stickers in rotation order
    let temp = adj.map(arr => arr.map(([f, r, c]) => cubeState[f][r][c]));
    // For CW: i -> (i+1)%4; For CCW: i -> (i+3)%4
    let mapTo = direction === 1 ? [3,0,1,2] : [1,2,3,0];
    for (let i = 0; i < 4; i++) {
        let from = temp[mapTo[i]];
        for (let j = 0; j < 3; j++) {
            let [f, r, c] = adj[i][j];
            cubeState[f][r][c] = from[j];
        }
    }
}