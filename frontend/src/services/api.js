import axios from "axios";

/**
 * CubeVision API client — Axios instance with interceptors.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor: attach JWT token ───────────────────
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("cubevision_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: handle 401 + refresh ──────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("cubevision_refresh_token");
        if (refreshToken) {
          const res = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token } = res.data.tokens;
          localStorage.setItem("cubevision_token", access_token);
          localStorage.setItem("cubevision_refresh_token", refresh_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed — clear tokens
        localStorage.removeItem("cubevision_token");
        localStorage.removeItem("cubevision_refresh_token");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────────────

export async function signup(data) {
  const res = await api.post("/api/auth/signup", data);
  return res.data;
}

export async function login(data) {
  const res = await api.post("/api/auth/login", data);
  return res.data;
}

export async function refreshToken(token) {
  const res = await api.post("/api/auth/refresh", { refresh_token: token });
  return res.data;
}

export async function getMe() {
  const res = await api.get("/api/auth/me");
  return res.data;
}

export async function updateProfile(data) {
  const res = await api.put("/api/auth/me", data);
  return res.data;
}

export async function setupProfile(data) {
  const res = await api.post("/api/auth/setup-profile", data);
  return res.data;
}

export async function googleAuth() {
  const res = await api.get("/api/auth/google");
  return res.data;
}

export async function googleCallback(code) {
  const res = await api.post("/api/auth/google/callback", { code });
  return res.data;
}

export async function checkUsername(username) {
  const res = await api.get(`/api/auth/check-username/${encodeURIComponent(username)}`);
  return res.data;
}

export async function checkEmail(email) {
  const res = await api.get(`/api/auth/check-email/${encodeURIComponent(email)}`);
  return res.data;
}

// ─── Cube API ────────────────────────────────────────────────

export async function validateCube(faces, colorMapping) {
  const res = await api.post("/api/cube/validate", {
    faces,
    color_mapping: colorMapping,
  });
  return res.data;
}

export async function validateCubeString(cubeString) {
  const res = await api.post("/api/cube/validate-string", {
    cube_string: cubeString,
  });
  return res.data;
}

export async function solveCube(cubeString, solver = "kociemba") {
  const res = await api.post("/api/cube/solve", {
    cube_string: cubeString,
    solver,
  });
  return res.data;
}

export async function solveCubeFaces(faces) {
  const res = await api.post("/api/cube/solve-faces", { faces });
  return res.data;
}

export async function listSolvers() {
  const res = await api.get("/api/cube/solvers");
  return res.data;
}

export async function scanFaces(files) {
  const form = new FormData();
  form.append("faceU", files.U);
  form.append("faceR", files.R);
  form.append("faceF", files.F);
  form.append("faceD", files.D);
  form.append("faceL", files.L);
  form.append("faceB", files.B);

  const res = await api.post("/api/cube/scan", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function saveCubeState(faces, colorMapping) {
  const res = await api.post("/api/cube/save", {
    faces,
    color_mapping: colorMapping,
  });
  return res.data;
}

export async function saveSolution(payload) {
  const res = await api.post("/api/cube/save-solution", payload);
  return res.data;
}

export async function getCubeHistory(limit = 20, skip = 0) {
  const res = await api.get(`/api/cube/history?limit=${limit}&skip=${skip}`);
  return res.data;
}

export async function getRecentSolutions(limit = 10) {
  const res = await api.get(`/api/cube/recent-solutions?limit=${limit}`);
  return res.data;
}

// ─── Contest API ─────────────────────────────────────────────

export async function getDailyScramble() {
  const res = await api.get("/api/contest/daily");
  return res.data;
}

export async function submitDaily(data) {
  const res = await api.post("/api/contest/daily/submit", data);
  return res.data;
}

export async function getWeekendContest() {
  const res = await api.get("/api/contest/weekend");
  return res.data;
}

export async function getLeaderboard(contestType, contestId, limit = 50) {
  const res = await api.get(
    `/api/contest/leaderboard/${contestType}/${contestId}?limit=${limit}`
  );
  return res.data;
}

export async function getGlobalLeaderboard(limit = 50) {
  const res = await api.get(`/api/contest/leaderboard/global?limit=${limit}`);
  return res.data;
}

// ─── System API ──────────────────────────────────────────────

export async function getApiInfo() {
  const res = await api.get("/api/info");
  return res.data;
}

export async function healthCheck() {
  const res = await api.get("/health");
  return res.data;
}
