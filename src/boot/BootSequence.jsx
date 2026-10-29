import { useCallback, useEffect, useRef, useState } from 'react'
import BOOTLOG from './bootlog.json'
import './boot.css'

// The efifb console of the source machine: 1024x768 with an 8x16 font.
const COLS = 128
const ROWS = 48

const FIRMWARE_MS = 900
const GRUB_TIMEOUT = 5 // GRUB_TIMEOUT in Arch's /etc/default/grub
const INITRD_AFTER_MS = 650 // "Loading initial ramdisk ..." follows the kernel image
const KERNEL_AFTER_MS = 1400
// fbcon on efifb redraws the whole screen for every scroll ("scrolling: redraw"),
// and printk waits for the console, so output can't come faster than this.
const MS_PER_LINE = 0.45
const DM_HANDOFF_MS = 250 // last status line -> display manager grabs the VT
const BLANK_MS = 900

const SCREEN_ON = BOOTLOG.findIndex((e) => e.screen)
const ENTRIES = ['Arch Linux', 'Advanced options for Arch Linux', 'UEFI Firmware Settings']

export default function BootSequence({ onDone }) {
  const [phase, setPhase] = useState('firmware')
  const [selected, setSelected] = useState(0)
  const [timeout, setTimeoutLeft] = useState(GRUB_TIMEOUT)
  const [loaderLines, setLoaderLines] = useState(0)
  const [shown, setShown] = useState(0)

  const boot = useCallback(() => setPhase('loader'), [])

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

  useEffect(() => {
    if (phase !== 'firmware') return
    const t = setTimeout(() => setPhase('grub'), FIRMWARE_MS)
    return () => clearTimeout(t)
  }, [phase])

  // GRUB: count down, arrows move the highlight and cancel the timeout.
  useEffect(() => {
    if (phase !== 'grub') return
    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        setTimeoutLeft(null)
        setSelected((s) => (s + (e.key === 'ArrowUp' ? ENTRIES.length - 1 : 1)) % ENTRIES.length)
      } else if (e.key === 'Enter') {
        boot()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, boot])

  useEffect(() => {
    if (phase !== 'grub' || timeout === null) return
    if (timeout === 0) return boot()
    const t = setTimeout(() => setTimeoutLeft((n) => n - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeout, boot])

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
    let clock = 0 // seconds since the kernel started
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
  if (phase === 'grub') {
    body = <Grub selected={selected} timeout={timeout} onPick={(i) => (setSelected(i), boot())} />
  } else if (phase === 'loader' || (phase === 'kernel' && shown <= SCREEN_ON)) {
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

// GRUB 2.06 menu on gfxterm, same 128x48 grid as the console.
function Grub({ selected, timeout, onPick }) {
  const inner = COLS - 4
  const boxRows = ROWS - 12
  const title = 'GNU GRUB  version 2.06'

  return (
    <>
      <div>{'\n' + ' '.repeat((COLS - title.length) / 2) + title + '\n\n'}</div>
      <div>{' ┌' + '─'.repeat(inner) + '┐'}</div>
      {Array.from({ length: boxRows }, (_, i) => {
        const text = ENTRIES[i]
        if (!text) return <div key={i}>{' │' + ' '.repeat(inner) + '│'}</div>
        const label = (i === selected ? '*' : ' ') + text
        return (
          <div key={i} className="grub-entry" onClick={() => onPick(i)}>
            {' │'}
            <span className={i === selected ? 'grub-hl' : ''}>{label.padEnd(inner)}</span>
            {'│'}
          </div>
        )
      })}
      <div>{' └' + '─'.repeat(inner) + '┘'}</div>
      <div>
        {'\n      Use the ↑ and ↓ keys to select which entry is highlighted.\n' +
          "      Press enter to boot the selected OS, `e' to edit the commands before booting or `c' for a command-line.\n"}
        {timeout !== null && `   The highlighted entry will be executed automatically in ${timeout}s.`}
      </div>
    </>
  )
}
