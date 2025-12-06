import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-2">Manual input</h2>
        <p className="text-sm text-gray-600 mb-4">Paint the cube net with 6 colors to define the state, then compute the solution.</p>
        <Link to="/manual" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go to Manual Input</Link>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-2">AI (photo) input</h2>
        <p className="text-sm text-gray-600 mb-4">Upload 6 face photos and let AI detect colors and generate the cube string.</p>
        <Link to="/scan" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go to AI Scan</Link>
      </div>
    </div>
  )
}

