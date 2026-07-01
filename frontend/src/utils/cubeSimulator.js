/**
 * CubeSimulator — Applies standard Rubik's Cube moves to a faces dictionary.
 * 
 * faces is a dict: { U: [[,,],...], R: [[,,],...], F: [[,,],...], D: [[,,],...], L: [[,,],...], B: [[,,],...] }
 * move is a string like "U", "U'", "U2", "R", etc.
 */

// Rotate a 3x3 face 90 degrees clockwise
function rotateFaceCW(faceGrid) {
  const newFace = [
    ["", "", ""],
    ["", "", ""],
    ["", "", ""],
  ];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      newFace[c][2 - r] = faceGrid[r][c];
    }
  }
  return newFace;
}

// Deep clone the faces object
function cloneFaces(faces) {
  const newFaces = {};
  for (const f of ["U", "R", "F", "D", "L", "B"]) {
    newFaces[f] = faces[f].map((row) => [...row]);
  }
  return newFaces;
}

// Map of how the edges cycle for each face (Clockwise turn)
// Each entry specifies the adjacent face, and the specific row/col indices to read/write in order
const ADJACENT_EDGES = {
  U: [
    { face: "B", indices: [[0,2], [0,1], [0,0]] },
    { face: "R", indices: [[0,2], [0,1], [0,0]] },
    { face: "F", indices: [[0,2], [0,1], [0,0]] },
    { face: "L", indices: [[0,2], [0,1], [0,0]] },
  ],
  D: [
    { face: "F", indices: [[2,0], [2,1], [2,2]] },
    { face: "R", indices: [[2,0], [2,1], [2,2]] },
    { face: "B", indices: [[2,0], [2,1], [2,2]] },
    { face: "L", indices: [[2,0], [2,1], [2,2]] },
  ],
  F: [
    { face: "U", indices: [[2,0], [2,1], [2,2]] },
    { face: "R", indices: [[0,0], [1,0], [2,0]] },
    { face: "D", indices: [[0,2], [0,1], [0,0]] },
    { face: "L", indices: [[2,2], [1,2], [0,2]] },
  ],
  B: [
    { face: "U", indices: [[0,2], [0,1], [0,0]] },
    { face: "L", indices: [[0,0], [1,0], [2,0]] },
    { face: "D", indices: [[2,0], [2,1], [2,2]] },
    { face: "R", indices: [[2,2], [1,2], [0,2]] },
  ],
  L: [
    { face: "U", indices: [[0,0], [1,0], [2,0]] },
    { face: "F", indices: [[0,0], [1,0], [2,0]] },
    { face: "D", indices: [[0,0], [1,0], [2,0]] },
    { face: "B", indices: [[2,2], [1,2], [0,2]] },
  ],
  R: [
    { face: "U", indices: [[2,2], [1,2], [0,2]] },
    { face: "B", indices: [[0,0], [1,0], [2,0]] },
    { face: "D", indices: [[2,2], [1,2], [0,2]] },
    { face: "F", indices: [[2,2], [1,2], [0,2]] },
  ],
};

function applySingleMove(faces, faceStr) {
  faces[faceStr] = rotateFaceCW(faces[faceStr]);

  const edges = ADJACENT_EDGES[faceStr];
  
  // Extract values from edges
  const values = edges.map(edge => 
    edge.indices.map(([r, c]) => faces[edge.face][r][c])
  );

  // Cycle values forward by 1 (Clockwise)
  const newValues = [values[3], values[0], values[1], values[2]];

  // Write values back
  for (let i = 0; i < 4; i++) {
    const edge = edges[i];
    for (let j = 0; j < 3; j++) {
      const [r, c] = edge.indices[j];
      faces[edge.face][r][c] = newValues[i][j];
    }
  }
}

export function applyMoveSequence(initialFaces, moves) {
  let currentFaces = cloneFaces(initialFaces);

  for (const move of moves) {
    const faceStr = move[0]; // U, R, F, etc.
    let count = 1;
    if (move.includes("'")) count = 3; // Counter-clockwise is 3 CW turns
    if (move.includes("2")) count = 2; // Double turn is 2 CW turns

    for (let i = 0; i < count; i++) {
      applySingleMove(currentFaces, faceStr);
    }
  }

  return currentFaces;
}
