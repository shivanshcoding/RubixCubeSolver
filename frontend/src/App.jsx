import { Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import ManualInputPage from './pages/ManualInputPage.jsx'
import ScanPage from './pages/ScanPage.jsx'
import SolutionPage from './pages/SolutionPage.jsx'
import './App.css'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg">Rubik's Cube Solver</Link>
          <nav className="space-x-4 text-sm">
            <Link to="/manual" className="hover:text-blue-600">Manual input</Link>
            <Link to="/scan" className="hover:text-blue-600">AI (photo) input</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/manual" element={<ManualInputPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/solution" element={<SolutionPage />} />
        </Routes>
      </main>
    </div>
  )
}
