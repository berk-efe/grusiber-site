import { useEffect, useRef, useState } from 'react'
import BOOTLOG from './bootlog.json'
import './boot.css'

// The efifb console of the source machine: 1024x768 with an 8x16 font.
const ROWS = 48

// The whole thing takes BOOT_MS of wall-clock time no matter how fast the
// machine is. The log is replayed on a compressed clock: its fast and slow
// stretches keep their real proportions, and a slow machine just draws fewer
// frames (skipping lines), it never takes longer.
const FIRMWARE_MS = 250
const INITRD_AFTER_MS = 80 // "Loading initial ramdisk ..." follows the kernel image
const KERNEL_AFTER_MS = 150
const KERNEL_MS = 1400
const BLANK_MS = 200 // display manager grabs the VT

// The screen shows nothing new until fbcon takes over, so start just before that.
const KERNEL_SKIP_TO = BOOTLOG.find((e) => e.screen).t - 0.1
const KERNEL_END = BOOTLOG.at(-1).t

const SCREEN_ON = BOOTLOG.findIndex((e) => e.screen)

export default function BootSequence({ onDone }) {
  const [phase, setPhase] = useState('firmware')
  const [loaderLines, setLoaderLines] = useState(0)
  const [shown, setShown] = useState(0)

  // Esc or double click skips the whole thing.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onDone()
    window.addEventListener('keydown', onKey)
    window.addEventListener('dblclick', onDone)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('dblclick', onDone)
    }
  }, [onDone])

  // GRUB boots the default entry straight away (no menu).
  useEffect(() => {
    if (phase !== 'firmware') return
    const t = setTimeout(() => setPhase('loader'), FIRMWARE_MS)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 'loader') return
    setLoaderLines(1)
    const a = setTimeout(() => setLoaderLines(2), INITRD_AFTER_MS)
    const b = setTimeout(() => setPhase('kernel'), KERNEL_AFTER_MS)
    return () => (clearTimeout(a), clearTimeout(b))
  }, [phase])

  // Kernel + userspace: play the log on a compressed clock.
  const raf = useRef()
  useEffect(() => {
    if (phase !== 'kernel') return
    const start = performance.now()
    let count = 0

    const frame = (now) => {
      const p = Math.min(1, (now - start) / KERNEL_MS)
      const clock = KERNEL_SKIP_TO + p * (KERNEL_END - KERNEL_SKIP_TO)
      let due = count
      while (due < BOOTLOG.length && BOOTLOG[due].t <= clock) due++
      if (p >= 1) due = BOOTLOG.length
      // fbcon draws everything printed so far in one go
      if (due > SCREEN_ON && count <= SCREEN_ON) due = Math.max(due, SCREEN_ON + 1)
      if (due !== count) setShown((count = due))

      if (p >= 1) return setPhase('blank')
      raf.current = requestAnimationFrame(frame)
    }
    raf.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf.current)
  }, [phase])

  useEffect(() => {
    if (phase !== 'blank') return
    const t = setTimeout(onDone, BLANK_MS)
    return () => clearTimeout(t)
  }, [phase, onDone])

  let body = null
  if (phase === 'loader' || (phase === 'kernel' && shown <= SCREEN_ON)) {
    body = (
      <>
        <div>Loading Linux linux ...</div>
        {loaderLines > 1 && <div>Loading initial ramdisk ...</div>}
      </>
    )
  } else if (phase === 'kernel') {
    body = BOOTLOG.slice(Math.max(0, shown - ROWS), shown).map((e, i) => <Line key={shown - ROWS + i} e={e} />)
  }

  return (
    <div className="tty" aria-label="Arch Linux booting">
      <div className={`tty-screen ${phase === 'kernel' && shown > SCREEN_ON ? 'bottom' : ''}`}>{body}</div>
    </div>
  )
}

function Line({ e }) {
  switch (e.k) {
    case 'ok':
      return (
        <div>
          [<span className="green">  OK  </span>] {e.verb} <span className="hi">{e.desc}</span>.
        </div>
      )
    case 'job':
      return (
        <div>
          {'         '}{e.verb} <span className="hi">{e.desc}</span>...
        </div>
      )
    case 'welcome':
      return (
        <div>
          {'\n'}Welcome to <span className="cyan">Arch Linux</span>!{'\n\n'}
        </div>
      )
    default:
      return <div>{e.text}</div>
  }
}
