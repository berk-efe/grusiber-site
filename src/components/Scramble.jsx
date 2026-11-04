import { useEffect, useState } from 'react'

const NOISE = '!<>-_\\/[]{}=+*^?#%&@$01'

// Text that "decrypts" left to right out of random characters.
export default function Scramble({ text, duration = 1100, delay = 0 }) {
  const [out, setOut] = useState(() => text.replace(/\S/g, ' '))

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOut(text)
      return
    }
    let raf
    const start = performance.now() + delay
    const frame = (now) => {
      const p = Math.max(0, (now - start) / duration)
      const solved = Math.floor(p * text.length)
      setOut(
        [...text]
          .map((c, i) => {
            if (i < solved || c === ' ') return c
            if (p === 0) return ' '
            return NOISE[Math.floor(Math.random() * NOISE.length)]
          })
          .join(''),
      )
      if (p < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [text, duration, delay])

  return out
}
