// Global vars for solution animation
let solutionMoves = [];
let currentMoveIdx = -1;
let animating = false;
let animationTimeout = null;

// Move order toggle logic
let moveOrderAscending = true;
const moveOrderToggle = document.getElementById('move-order-toggle');
const moveOrderLabel = document.getElementById('move-order-label');

// Helper: Parse solution string to array of moves
function parseSolution(solutionStr) {
    return solutionStr.trim().split(/\s+/).filter(Boolean);
}

// Helper: Get move at index in current order
function getMoveAt(idx) {
    if (moveOrderAscending) {
        return solutionMoves[idx];
    } else {
        return solutionMoves[solutionMoves.length - 1 - idx];
    }
}

// Update UI with current move and image hint
function showMove(idx) {
    let indicator = document.getElementById('move-indicator');
    let img = document.getElementById('move-image');

    if (idx < 0 || idx >= solutionMoves.length) {
        indicator.textContent = '';
        img.src = '';
        return;
    }
    let move = getMoveAt(idx);
    indicator.textContent = `Step ${moveOrderAscending ? idx + 1 : solutionMoves.length - idx}/${solutionMoves.length}: ${move}`;

    // Map move name to image filename, e.g. "R'" to "Rprime.png"
    let imgFile = move.replace("'", "prime");
    img.src = `/static/img/${imgFile}.png`;
}

// Animate a single move on the 3D cube, then callback
function applyMoveTo3DCube(move, callback) {
    // Parse move, e.g. "R", "R'", "R2"
    let face = move[0];
    let direction = 1;
    let times = 1;
    if (move.length > 1) {
        if (move[1] === "'") direction = -1;
        else if (move[1] === "2") times = 2;
    }
    animateFaceRotation(face, direction, times, callback);
}

// Animate a reverse move for stepping back
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

// Animate move at index idx, advance animation if playing
function animateMove(idx) {
    if (idx < 0 || idx >= solutionMoves.length) {
        animating = false;
        return;
    }
    applyMoveTo3DCube(getMoveAt(idx), () => {
        currentMoveIdx = idx;
        showMove(currentMoveIdx);

        if (animating && currentMoveIdx < solutionMoves.length - 1) {
            // Wait before next move for smooth pace
            animationTimeout = setTimeout(() => animateMove(currentMoveIdx + 1), 700);
        } else {
            animating = false; // Stop at end
        }
    });
}


// UI controls

function playMoves() {
    if (animating) return; // Already playing
    animating = true;

    // If at end, reset to before first move to restart
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
        // Reverse the last move applied
        reverseMoveTo3DCube(getMoveAt(currentMoveIdx), () => {
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

// Hook up buttons (make sure buttons exist in DOM)
const playBtn = document.getElementById('play-move-btn');
if (playBtn) playBtn.onclick = playMoves;
const pauseBtn = document.getElementById('pause-move-btn');
if (pauseBtn) pauseBtn.onclick = pauseMoves;
const prevBtn = document.getElementById('prev-move-btn');
if (prevBtn) prevBtn.onclick = prevMove;
const nextBtn = document.getElementById('next-move-btn');
if (nextBtn) nextBtn.onclick = nextMove;

// Entry point to load solution from solver's string and reset animation state
function loadSolutionAnimation(solutionStr) {
    solutionMoves = parseSolution(solutionStr);
    currentMoveIdx = -1;
    animating = false;
    clearTimeout(animationTimeout);
    showMove(-1);
}
