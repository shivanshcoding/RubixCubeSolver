export const DEFAULT_COLORS = ['#fff', '#ff2222', '#17d016', '#ffe900', '#ff9900', '#1177ff'];
export const FACE_LETTERS = ['U', 'R', 'F', 'D', 'L', 'B'];

export function getUserColors() {
    const stored = localStorage.getItem('cube_user_colors');
    return stored ? JSON.parse(stored) : DEFAULT_COLORS;
}

export function getColorDefs() {
    const userColors = getUserColors();
    return FACE_LETTERS.map((k, i) => ({
        name: k.toLowerCase(),
        hex: userColors[i],
        k
    }));
}

export function parseMove(move) {
    const face = move[0];
    let direction = 1, times = 1;
    if (move.length > 1) {
        if (move[1] === "'") direction = -1;
        else if (move[1] === "2") times = 2;
    }
    return { face, direction, times };
} 