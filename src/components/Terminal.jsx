import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { INSTAGRAM, session, VALUES } from '../session.js'

const PROMPT = 'guest@grusiber:~$'
const UNAME = 'Linux grusiber 6.0.8-arch1-1 #1 SMP PREEMPT_DYNAMIC Thu, 10 Nov 2022 21:14:24 +0000 x86_64 GNU/Linux'

const HELP = [
  'kullanılabilir komutlar:',
  '',
  '  help         bu liste',
  '  about        biz kimiz?',
  '  instagram    bizi takip et',
  '  ls           etrafa bak',
  '  cat <dosya>  dosya oku',
  '  whoami       sen kimsin',
  '  neofetch     sistem bilgisi',
  '  date         saat kaç',
  '  clear        ekranı temizle',
  '  exit         çıkış (?)',
  '',
  'bir de gizli şeyler var. bulursan söyleme OvO',
]

const LOGO = [
  '   ▄██████▄  ',
  '  ██▀    ▀█  ',
  '  ██         ',
  '  ██   ████  ',
  '  ██▄    ██  ',
  '   ▀██████▀  ',
  '             ',
]

const COMMANDS = ['help', 'about', 'instagram', 'ls', 'cat', 'cd', 'whoami', 'neofetch', 'date', 'clear', 'exit', 'logout', 'reboot', 'echo', 'pwd', 'uname', 'history', 'sudo', 'rm', 'hack']
const FILES = ['about/', 'values.txt', '.secret']

// Longest prefix every match shares, like bash does on the first tab.
const common = (xs) => xs.reduce((a, b) => {
  let i = 0
  while (i < a.length && a[i] === b[i]) i++
  return a.slice(0, i)
})

// What tab can complete: commands for the first word, file names after it.
function candidates(input) {
  const words = input.split(' ')
  const word = words.at(-1)
  if (words.length === 1) return { word, list: COMMANDS.filter((c) => c.startsWith(word)) }
  const dirsOnly = words[0] === 'cd'
  const list = FILES.filter((f) => f.startsWith(word) && (word.startsWith('.') || !f.startsWith('.')) && (!dirsOnly || f.endsWith('/')))
  return { word, list }
}

function uptime() {
  const m = Math.floor((Date.now() - session.bootedAt) / 60000)
  return m < 1 ? 'az önce' : `${m} min`
}

export default function Terminal({ onExit }) {
  const [lines, setLines] = useState([{ out: 'etrafa bakmak için `help` yaz.' }])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [hpos, setHpos] = useState(-1)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef()
  const endRef = useRef()
  const navigate = useNavigate()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [lines])

  const print = (...out) => setLines((l) => [...l, ...out.flat().map((o) => ({ out: o }))])

  // Prints lines one by one, for the commands that "do work".
  const slow = (out, ms, then) => {
    setBusy(true)
    out.forEach((o, i) => setTimeout(() => print(o), ms * (i + 1)))
    setTimeout(() => (setBusy(false), then?.()), ms * (out.length + 1))
  }

  function run(raw) {
    const [cmd, ...args] = raw.trim().split(/\s+/)
    const arg = args.join(' ')

    switch (cmd) {
      case '':
        return
      case 'help':
        return print(HELP)
      case 'about':
        return navigate('/about/')
      case 'instagram':
        window.open(INSTAGRAM, '_blank', 'noopener')
        return print('instagram.com/grusiber açılıyor...')
      case 'cd':
        if (!arg || arg === '~' || arg === '.') return
        if (arg.replace(/\/$/, '') === 'about') return navigate('/about/')
        return print(`bash: cd: ${arg}: No such file or directory`)
      case 'ls':
        return print(args.some((a) => a.startsWith('-') && a.includes('a')) ? 'about/  values.txt  .secret' : 'about/  values.txt')
      case 'cat':
        if (!arg) return print('cat: dosya adı lazım dostum')
        if (arg === 'values.txt') return print(VALUES.map(([k, v]) => `--${k.padEnd(10)}${v}`))
        if (arg === '.secret') return print('OvO', '', 'aferin, meraklısın. tam bizlik.')
        if (arg.replace(/\/$/, '') === 'about') return print(`cat: ${arg}: Is a directory`)
        return print(`cat: ${arg}: No such file or directory`)
      case 'whoami':
        return print('guest', '(şimdilik. üye olunca değişir.)')
      case 'pwd':
        return print('/home/guest')
      case 'uname':
        return print(args.includes('-a') ? UNAME : 'Linux')
      case 'date':
        return print(new Date().toString())
      case 'echo':
        return print(arg)
      case 'history':
        return print(history.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`))
      case 'neofetch': {
        const info = [
          'guest@grusiber',
          '--------------',
          'OS: grusiber 0.2',
          'Host: giresun üniversitesi',
          'Kernel: 6.0.8-arch1-1',
          `Uptime: ${uptime()}`,
          'Shell: gsh',
          'Members: seni bekliyoruz',
        ]
        return print([...info.keys()].map((i) => (LOGO[i] ?? ' '.repeat(13)) + '  ' + info[i]))
      }
      case 'clear':
        return setLines([])
      case 'sudo':
        return print('guest is not in the sudoers file.  This incident will be reported.')
      case 'rm':
        if (/-\w*r\w*f|-\w*f\w*r/.test(arg) && args.includes('/')) return print('nice try OvO')
        return print(`rm: cannot remove '${args.at(-1) ?? ''}': Permission denied`)
      case 'hack':
        return slow(
          ['[*] hedef taranıyor...', '[*] firewall bypass ediliyor...', '[*] mainframe\'e giriliyor...', '[!] şaka şaka.', '    burası hollywood değil. gerçeğini görmek istersen topluluğa gel.'],
          450,
        )
      case 'exit':
      case 'logout':
      case 'reboot':
        return slow(['logout', '', 'rebooting...'], 300, onExit)
      default:
        return print(`bash: ${cmd}: command not found`)
    }
  }

  function onKeyDown(e) {
    if (busy) return e.preventDefault()
    if (e.key === 'Enter') {
      setLines((l) => [...l, { in: input }])
      if (input.trim()) setHistory((h) => [...h, input])
      setHpos(-1)
      run(input)
      setInput('')
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (!history.length) return
      const next = e.key === 'ArrowUp' ? (hpos < 0 ? history.length - 1 : Math.max(0, hpos - 1)) : hpos < 0 ? -1 : hpos + 1
      if (next < 0 || next >= history.length) return (setHpos(-1), setInput(''))
      setHpos(next)
      setInput(history[next])
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const { word, list } = candidates(input)
      if (!list.length) return
      const base = input.slice(0, input.length - word.length)
      if (list.length === 1) return setInput(base + list[0] + (list[0].endsWith('/') ? '' : ' '))
      const prefix = common(list)
      if (prefix.length > word.length) return setInput(base + prefix)
      // nothing more to fill in: list the options under the prompt, like bash
      setLines((l) => [...l, { in: input }, { out: list.join('  ') }])
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }

  return (
    <div className="term fade-in" onClick={() => inputRef.current?.focus()}>
      <div className="term-bar">
        <span>gsh — guest@grusiber</span>
        <span className="dim">tab · ↑↓</span>
      </div>
      <div className="term-body">
        {lines.map((l, i) =>
          'in' in l ? (
            <div key={i}>
              <span className="accent">{PROMPT}</span> {l.in}
            </div>
          ) : (
            <div key={i} className="term-out">{l.out || ' '}</div>
          ),
        )}
        <label className="term-line" ref={endRef}>
          <span className="accent">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="terminal input"
          />
        </label>
      </div>
    </div>
  )
}
