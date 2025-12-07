import { useEffect, useMemo, useState } from 'react'

export default function LoadingOverlay({ visible, messages = [] }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!visible) return
    setIndex(0)
    const interval = setInterval(() => {
      setIndex((i) => (i < messages.length ? i + 1 : i))
    }, 700)
    return () => clearInterval(interval)
  }, [visible, messages])

  const shown = useMemo(() => messages.slice(0, Math.max(1, index)), [messages, index])

  if (!visible) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background layers */}
      <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-sm" />
      <div className="absolute inset-0 pointer-events-none tech-grid" />
      <div className="absolute inset-0 pointer-events-none scanlines" />

      {/* Card */}
      <div className="relative w-[92%] sm:w-[420px] md:w-[520px] p-[2px] neon-border overlay-enter">
        <div className="relative bg-neutral-900/90 rounded-xl p-6 md:p-7 text-center shadow-xl glow-pulse">
          {/* Spinner */}
          <div className="mx-auto mb-6 w-16 h-16 md:w-20 md:h-20 neon-spinner" />

          {/* Messages */}
          <div className="space-y-2">
            {shown.map((m, i) => (
              <p key={i} className="text-sm md:text-base text-cyan-100 message-line">
                {m}
              </p>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-6 h-2 rounded-full overflow-hidden bg-neutral-800">
            <div className="h-full w-1/3 shimmer-bar" />
          </div>

          {/* Corner accents */}
          <div className="accent tl" />
          <div className="accent tr" />
          <div className="accent bl" />
          <div className="accent br" />
        </div>
      </div>
    </div>
  )
}
