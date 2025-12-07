import { Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import HomePage from "./pages/HomePage.jsx";
import ManualInputPage from "./pages/ManualInputPage.jsx";
import ScanPage from "./pages/ScanPage.jsx";
import SolutionPage from "./pages/SolutionPage.jsx";
import "./App.css";

export default function App() {
  return (
    <div
      className="min-h-screen bg-gray-100 text-gray-900"
      style={{ paddingTop: "40px" }}
    >
      <Navbar
        items={["RubixCubeSolver", "Home", "About", "Solve", "Quiz"]}
      />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/manual" element={<ManualInputPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/solution" element={<SolutionPage />} />
        </Routes>
      </main>
    </div>
  );
}
