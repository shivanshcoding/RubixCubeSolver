import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:8000',
})

export async function solveCube(cubeString) {
  const res = await api.post('/api/solve', { cubeString })
  return res.data
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

