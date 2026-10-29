import { useEffect, useRef, useState } from 'react'
import BOOTLOG from './bootlog.json'
import './boot.css'

// The efifb console of the source machine: 1024x768 with an 8x16 font.
const ROWS = 48

const FIRMWARE_MS = 600
const INITRD_AFTER_MS = 150 // "Loading initial ramdisk ..." follows the kernel image
const KERNEL_AFTER_MS = 300
// The screen shows nothing new until fbcon takes over, so skip ahead to just
// before that instead of sitting on GRUB's last words.
const KERNEL_SKIP_TO = BOOTLOG.find((e) => e.screen).t - 0.1
// fbcon on efifb redraws the whole screen for every scroll ("scrolling: redraw"),
// and printk waits for the console, so output can't come faster than this.
const MS_PER_LINE = 0.45
const DM_HANDOFF_MS = 250 // last status line -> display manager grabs the VT
const BLANK_MS = 900

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

  // Kernel + userspace: play the log on its own clock.
  const raf = useRef()
  useEffect(() => {
    if (phase !== 'kernel') return
    let last = performance.now()
    let clock = KERNEL_SKIP_TO // seconds since the kernel started
    let count = 0
    let budget = 0

    const frame = (now) => {
      const dt = (now - last) / 1000
      last = now
      clock += dt
      let due = count
      while (due < BOOTLOG.length && BOOTLOG[due].t <= clock) due++

      if (count <= SCREEN_ON && due <= SCREEN_ON) {
        // still showing GRUB's last words, fbcon hasn't taken over yet
      } else {
        // fbcon draws everything printed so far in one go
        if (count <= SCREEN_ON) count = SCREEN_ON + 1
        budget += (dt * 1000) / MS_PER_LINE
        const n = Math.min(due - count, Math.floor(budget))
        budget -= n
        count += n
        // console is behind: the kernel is stuck in printk, time stands still
        if (count < due) clock = BOOTLOG[count].t
        else budget = 0
        if (n) setShown(count)
      }

      if (count >= BOOTLOG.length) {
        setTimeout(() => setPhase('blank'), DM_HANDOFF_MS)
        return
      }
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
