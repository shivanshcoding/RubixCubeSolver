import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:8000',
})

export async function solveCube(cubeString) {
  const res = await api.post('/api/solve', { cubeString })
  return res.data
}

export async function validateCube(cubeString) {
  try {
    const res = await api.post('/api/solve', { cubeString });

    // If the backend returned success → valid cube
    return {
      valid: true,
      error: null,
    };

  } catch (err) {
    const status = err?.response?.status;
    const msg =
      err?.response?.data?.detail?.error ||
      err?.response?.data?.detail?.message ||
      "Unknown error";

    if (status === 400) {
      // Cube is INVALID (cannot exist in real life)
      return { valid: false, error: msg };
    }

    if (status === 422) {
      // Cube is technically valid but solver failed (rare)
      return { valid: false, error: "Solver error: " + msg };
    }

    // Any other network/backend failure
    return { valid: false, error: "Server error: " + msg };
  }
}

export async function scanFaces(files) {
  const form = new FormData()
  form.append('faceU', files['U'])
  form.append('faceR', files['R'])
  form.append('faceF', files['F'])
  form.append('faceD', files['D'])
  form.append('faceL', files['L'])
  form.append('faceB', files['B'])
  const res = await api.post('/api/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

