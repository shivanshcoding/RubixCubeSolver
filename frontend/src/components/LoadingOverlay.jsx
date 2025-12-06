export default function LoadingOverlay({ visible, messages = [] }) {
  if (!visible) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow p-6 w-80 text-center">
        <div className="mx-auto mb-4 w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="space-y-1">
          {messages.map((m, i) => (
            <p key={i} className="text-sm text-gray-700">{m}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

