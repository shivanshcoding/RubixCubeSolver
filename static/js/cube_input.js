let COLORS = [
    { name: 'white', hex: '#fff', k: 'U' },    // Up
    { name: 'red', hex: '#ff2222', k: 'R' },   // Right
    { name: 'green', hex: '#17d016', k: 'F' }, // Front
    { name: 'yellow', hex: '#ffe900', k: 'D' },// Down
    { name: 'orange', hex: '#ff9900', k: 'L' },// Left
    { name: 'blue', hex: '#1177ff', k: 'B' }   // Back
];
let selectedColor = 0;

let cubeState = Array(6).fill().map(() => Array(3).fill().map(() => Array(3).fill(0)));


const FACE_ORDER = ['up', 'right', 'front', 'down', 'left', 'back'];
const FACE_MAP = { up: 0, right: 1, front: 2, down: 3, left: 4, back: 5 };

const COLOR_IDX_TO_FACE_LETTER = {
    0: 'U', // white
    1: 'R', // red
    2: 'F', // green
    3: 'D', // yellow
    4: 'L', // orange
    5: 'B'  // blue
};

// Use user-selected colors if available
function getUserColors() {
    let stored = localStorage.getItem('cube_user_colors');
    if (stored) {
        let arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length === 6) return arr;
    }
    // Default colors
    return ['#fff', '#ff2222', '#17d016', '#ffe900', '#ff9900', '#1177ff'];
}
function getColorDefs() {
    const userColors = getUserColors();
    return [
        { name: 'up', hex: userColors[0], k: 'U' },
        { name: 'right', hex: userColors[1], k: 'R' },
        { name: 'front', hex: userColors[2], k: 'F' },
        { name: 'down', hex: userColors[3], k: 'D' },
        { name: 'left', hex: userColors[4], k: 'L' },
        { name: 'back', hex: userColors[5], k: 'B' }
    ];
}
window.initManualCubeWithUserColors = function(userColors) {
    COLORS = [
        { name: 'up', hex: userColors[0], k: 'U' },
        { name: 'right', hex: userColors[1], k: 'R' },
        { name: 'front', hex: userColors[2], k: 'F' },
        { name: 'down', hex: userColors[3], k: 'D' },
        { name: 'left', hex: userColors[4], k: 'L' },
        { name: 'back', hex: userColors[5], k: 'B' }
    ];
    resetCube();
    drawColorBtns();
};
COLORS = getColorDefs();

function drawColorBtns() {
    const row = document.getElementById('color-row');
    if (!row) return;
    row.innerHTML = '';
    COLORS.forEach((c, i) => {
        let btn = document.createElement('div');
        btn.className = 'color-btn' + (i === selectedColor ? ' selected' : '');
        btn.style.background = c.hex;
        btn.tabIndex = 0;
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
        if (!grid) return;
        grid.innerHTML = '';
        let f = FACE_MAP[face];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
            let cell = document.createElement('div');
            cell.className = 'cube-cell';
            cell.style.background = COLORS[cubeState[f][r][c]].hex;
            // Make center stickers fixed and visually distinct
            if (r === 1 && c === 1) {
                cell.style.border = '2px solid var(--text-accent)';
                cell.style.boxShadow = '0 0 8px var(--text-accent-2)';
                cell.style.cursor = 'not-allowed';
            } else {
                cell.onclick = () => {
                    cubeState[f][r][c] = selectedColor;
                    cell.style.background = COLORS[selectedColor].hex;
                    cell.classList.add('selected');
                    setTimeout(() => cell.classList.remove('selected'), 250);
                    update3DCube();
                    updateCubeString();
                };
            }
            grid.appendChild(cell);
        }
    });
}

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
    const el = document.getElementById('cube-string');
    if (el) el.textContent = cubeStr;
    validateCube();
}

function validateCenters() {
    for (let f = 0; f < 6; f++) {
        if (cubeState[f][1][1] !== f) return false;
    }
    return true;
}

function validateCube() {
    if (!validateCenters()) {
        const status = document.getElementById('cube-status');
        if (status) {
            status.textContent = '✗ Invalid: Each face center must be the correct fixed color.';
            status.className = 'status invalid';
        }
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.disabled = true;
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
        if (status) {
            status.textContent = '✔ Cube state valid!';
            status.className = 'status valid';
        }
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.disabled = false;
    } else {
        if (status) {
            status.textContent = '✗ Invalid: Each color must appear 9 times.';
            status.className = 'status invalid';
        }
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) submitBtn.disabled = true;
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
            if (data.success) {
                // Redirect to solution page with cube string and solution as query params
                const params = new URLSearchParams({ cube_str: cubeStr, solution: data.solution });
                window.location.href = `/solution?${params.toString()}`;
            } else {
                // Show error on this page
                alert('Error: ' + data.error);
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

// Remove randomize button logic and cube string display

document.addEventListener('DOMContentLoaded', () => {
    // Only draw color buttons and grid if manual-cube-section is visible
    if (document.getElementById('manual-cube-section') && document.getElementById('manual-cube-section').style.display !== 'none') {
        drawColorBtns();
        resetCube();
    }
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.onclick = submitCube;
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.onclick = resetCube;
});
