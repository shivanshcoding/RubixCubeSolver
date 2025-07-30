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

// Map face letter to color index
const FACE_LETTER_TO_COLOR_IDX = {
    'U': 0,
    'R': 1,
    'F': 2,
    'D': 3,
    'L': 4,
    'B': 5
};

// Load cube state from a 54-character kociemba string
function loadCubeString(str) {
    if (!str || str.length !== 54) return false;
    let idx = 0;
    for (let f = 0; f < 6; f++) {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const ch = str[idx++];
                const ci = FACE_LETTER_TO_COLOR_IDX[ch] ?? 0;
                cubeState[f][r][c] = ci;
            }
        }
    }
    drawCube();
    update3DCube?.();
    updateCubeString();
    return true;
}
window.loadCubeString = loadCubeString;

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
    
    // Validate cube before submission
    if (!cubeStr || cubeStr.length !== 54) {
        alert('Please complete the cube input first.');
        return;
    }
    
    // Show loading screen if available (for manual input page)
    if (typeof showLoadingScreen === 'function') {
        showLoadingScreen();
    } else {
        // Fallback: show loading screen directly
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            animateManualLoading();
        }
    }
    
    // Track when loading started
    const loadingStartTime = Date.now();
    const minimumLoadingTime = 5000; // 5 seconds minimum
    
    fetch('/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cube_str: cubeStr })
    })
        .then(r => r.json())
        .then(data => {
            // Calculate how long to wait before hiding loading screen
            const loadingDuration = Date.now() - loadingStartTime;
            const remainingTime = Math.max(0, minimumLoadingTime - loadingDuration);
            
            setTimeout(() => {
                // Hide loading screen
                if (typeof hideLoadingScreen === 'function') {
                    hideLoadingScreen();
                } else {
                    const loadingScreen = document.getElementById('loading-screen');
                    if (loadingScreen) loadingScreen.style.display = 'none';
                }
                
                if (data.success) {
                    // Show solution card if available, otherwise redirect
                    if (typeof showSolutionCard === 'function') {
                        showSolutionCard(data.solution, cubeStr);
                    } else {
                        // Fallback: redirect to solution page
                        const params = new URLSearchParams({ cube_str: cubeStr, solution: data.solution, from: 'manual' });
                        window.location.href = `/solution?${params.toString()}`;
                    }
                } else {
                    alert('Error: ' + data.error);
                }
            }, remainingTime);
        })
        .catch(error => {
            // Calculate how long to wait before hiding loading screen
            const loadingDuration = Date.now() - loadingStartTime;
            const remainingTime = Math.max(0, minimumLoadingTime - loadingDuration);
            
            setTimeout(() => {
                // Hide loading screen on error
                if (typeof hideLoadingScreen === 'function') {
                    hideLoadingScreen();
                } else {
                    const loadingScreen = document.getElementById('loading-screen');
                    if (loadingScreen) loadingScreen.style.display = 'none';
                }
                console.error('Error:', error);
                alert('Error solving cube. Please try again.');
            }, remainingTime);
        });
}

// Fallback loading animation for manual input with strategic pauses
function animateManualLoading() {
    const messages = [
        'Initializing AI algorithms...',
        'Analyzing your cube configuration...',
        'Processing color patterns and positions...',
        'Finding the optimal solution path...',
        'Calculating the most efficient moves...',
        'Optimizing solution sequence...',
        'Finalizing your personalized solution...',
        'Almost there...'
    ];
    
    // Define pause points for realistic loading behavior
    const pausePoints = [20, 45, 65, 80, 95]; // Better distributed pauses
    const pauseDurations = [600, 800, 700, 900, 1200]; // Optimized pause durations
    
    let progress = 0;
    let messageIndex = 0;
    let isPaused = false;
    let currentPauseIndex = 0;
    
    // Reset progress bar to 0 at start
    const loadingFill = document.getElementById('loading-fill');
    const loadingPercentage = document.getElementById('loading-percentage');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loadingFill) loadingFill.style.width = '0%';
    if (loadingPercentage) loadingPercentage.textContent = '0%';
    if (loadingMessage) loadingMessage.textContent = messages[0];
    
    const interval = setInterval(() => {
        // Check if we should pause at this progress point
        if (!isPaused && currentPauseIndex < pausePoints.length && 
            progress >= pausePoints[currentPauseIndex]) {
            isPaused = true;
            
            // Add a subtle visual indication during pause
            if (loadingMessage) {
                loadingMessage.style.opacity = '0.7';
                loadingMessage.textContent += ' (processing...)';
            }
            
            setTimeout(() => {
                isPaused = false;
                currentPauseIndex++;
                
                // Restore message appearance after pause
                if (loadingMessage) {
                    loadingMessage.style.opacity = '0.9';
                    loadingMessage.textContent = messages[messageIndex];
                }
            }, pauseDurations[currentPauseIndex] || 800);
            
            return; // Skip progress increment during pause
        }
        
        // Skip progress increment if we're currently paused
        if (isPaused) return;
        
        // Variable progress increments for more realistic feel
        let increment;
        if (progress < 20) increment = Math.random() * 3 + 2; // Fast start: 2-5%
        else if (progress < 60) increment = Math.random() * 2 + 1; // Medium: 1-3%
        else if (progress < 85) increment = Math.random() * 1.5 + 0.5; // Slow: 0.5-2%
        else increment = Math.random() * 0.8 + 0.2; // Very slow finish: 0.2-1%
        
        progress += increment;
        if (progress > 100) progress = 100;
        
        if (loadingFill) loadingFill.style.width = progress + '%';
        if (loadingPercentage) loadingPercentage.textContent = Math.round(progress) + '%';
        
        // Change message based on progress with smoother transitions
        const messageThreshold = (messageIndex + 1) * (100 / messages.length);
        if (loadingMessage && messageIndex < messages.length - 1 && progress > messageThreshold) {
            messageIndex++;
            loadingMessage.style.opacity = '0.5';
            setTimeout(() => {
                loadingMessage.textContent = messages[messageIndex];
                loadingMessage.style.opacity = '0.9';
            }, 200);
        }
        
        if (progress >= 100) {
            clearInterval(interval);
        }
    }, 400); // Slightly faster base interval (400ms) to compensate for pauses
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
    // Always initialize color buttons
    drawColorBtns();
    resetCube();

    // Continue button shows manual cube input section
    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('color-palette-section').style.display = 'none';
            const manualSection = document.getElementById('manual-cube-section');
            manualSection.style.display = '';
            drawColorBtns();
            resetCube();
        };
    }
    const submitBtn = document.getElementById('submit-cube');
    if (submitBtn) submitBtn.onclick = submitCube;
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.onclick = resetCube;
});
