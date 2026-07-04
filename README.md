# CubeVision AI

<div align="center">
  <h3>Production-grade Rubik's Cube platform with CV, solving, and gamification</h3>
</div>

## 🚀 Overview

CubeVision AI is an advanced, full-stack application designed to scan, solve, and help users learn how to master the Rubik's Cube. It leverages Computer Vision (CV), a high-performance solving algorithm (Kociemba), and an interactive 3D frontend to deliver an unparalleled cubing experience. 

Whether you're a beginner learning to solve or a speedcuber competing in contests, CubeVision AI provides the tools you need.

## ✨ Features

- **📷 Smart Scanning**: Scan your Rubik's cube using your webcam (Live Scan or Snapshot). Powered by OpenCV.
- **🧠 Advanced Solving**: Fast and optimal solution generation using the Kociemba algorithm.
- **🎮 Interactive 3D Player**: Step-by-step 3D visualization of the solution using `Three.js`.
- **🏆 Gamification**: Participate in daily contests, climb the leaderboard, and unlock achievements.
- **🤖 Multimodal AI Vision**: Analyzes uploaded Rubik's Cube images using advanced vision models (Google Gemini 3.5 Flash or Local GPU fallback) to detect colors and extract the grid state accurately, even with tricky lighting.
- **🔐 User Accounts**: Authentication, profiles, and personal solve history.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 14+](https://nextjs.org/) (React 19)
- **Styling**: Tailwind CSS, Framer Motion
- **3D Graphics**: `three`, `@react-three/fiber`, `@react-three/drei`
- **State Management**: Zustand
- **Data Fetching**: React Query (`@tanstack/react-query`)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Database**: MongoDB (Motor)
- **Computer Vision**: OpenCV (`opencv-python-headless`)
- **Solver**: `kociemba`
- **Multimodal AI**: Google Generative AI (`google-generativeai`) using `gemini-1.5-flash`, with support for OpenAI-compatible local GPU models.
- **Real-time**: WebSockets

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB (Local or Atlas)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   Copy `.env.example` to `.env` and fill in your MongoDB URI, JWT Secret, and Gemini API Key.
5. Run the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
RubixCubeSolver/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI Routes (auth, cube, contest)
│   │   ├── core/         # Config and Settings
│   │   ├── cv/           # Computer Vision & LLM logic
│   │   ├── database/     # MongoDB connection & Models
│   │   ├── models/       # Pydantic schemas
│   │   ├── repositories/ # Database operations
│   │   ├── services/     # Business logic
│   │   └── solver/       # Rubik's cube solving logic
│   └── main.py           # Application Entrypoint
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js App Router (pages)
│   │   ├── components/   # React Components (Cube, UI, etc.)
│   │   ├── hooks/        # Custom React Hooks
│   │   ├── lib/          # Utilities and configurations
│   │   ├── store/        # Zustand state stores
│   │   └── services/     # API client functions
│   └── package.json
└── README.md
```

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request if you'd like to improve CubeVision AI.

## 📄 License

This project is licensed under the MIT License.
