// Turns a real Arch Linux boot journal into what the console actually showed,
// with kernel timestamps, and writes src/boot/bootlog.json.
//
//   node scripts/build-bootlog.mjs
//
// The journal only has whole-second timestamps, so each line's time is set
// from anchor points (see ANCHORS) and interpolated in between.
// What appears on a real tty and what doesn't:
//   - kernel lines go to the console with a "[    t.tttttt] " prefix (loglevel=7)
//   - before journald starts, systemd logs to kmsg, so its messages also show
//     up as "systemd[1]: ..." kernel lines, next to the [  OK  ] status lines
//   - PID 1 prints "[  OK  ] ..." and "         Starting ..." status lines itself
//   - other daemons (journald, udevd, logind, fsck, ...) only write to the
//     journal and never reach the screen
//   - the busybox initramfs (mkinitcpio "base udev" hooks, the 2022 default)
//     prints its ":: running hook" lines, which the journal never sees

import { readFileSync, writeFileSync } from 'node:fs'

const HOSTNAME = 'grusiber'

const SRC = new URL('./arch-boot-journal.txt', import.meta.url)
const OUT = new URL('../src/boot/bootlog.json', import.meta.url)

const lines = readFileSync(SRC, 'utf8')
  .split('\n')
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const m = l.match(/^\w{3} \d+ [\d:]+ \S+ ([^:\[]+)(?:\[(\d+)\])?: (.*)$/)
    return m ? { ident: m[1], pid: m[2], msg: m[3] } : null
  })

// Line number (1-based, in the journal) -> kernel time in seconds.
//
// Taken directly from the log:
//   722  sched_clock: Marking stable (2525601819, ...)  -> 2.5256 s
//   696  rtc_cmos: setting system clock to ...642        -> must be in 1.79..2.79 s
//   824  systemd starts: "4.777s (kernel)"               -> 4.78 s
//   881+ kernel audit(epoch.ms) stamps, offset by systemd start
//   1184 Reached target Graphical Interface: + "1.619s (userspace)" -> 6.39 s
// Pauses placed where boots are known to block:
//   initramfs unpack, ACPI thermal zone evaluation, SATA link training
//   (ports are probed one at a time, "SSS flag set"), udev settle in the
//   initramfs, fsck and mounting of the spinning 3 TB disk.
const AUDIT_EPOCH_OFFSET = 1668645640.21
const audit = (epoch) => +(epoch - AUDIT_EPOCH_OFFSET).toFixed(6)

const ANCHORS = [
  [1, 0], [235, 0], // everything before timekeeping prints as 0.000000
  [236, 0.004012], [238, 0.006104], [277, 0.104718], [280, 0.148223],
  [283, 0.151987], [331, 0.205116], [456, 0.262340], [489, 0.285117],
  [528, 0.301204], [579, 0.330553], [631, 0.352981],
  [632, 0.921870], // Freeing initrd memory: 15756K (async unpack done)
  [663, 0.951302],
  [664, 2.101455], // ACPI: thermal: Thermal Zone [TZ10] (17 C)
  [696, 2.170331], [704, 2.198804], [720, 2.231870], [721, 2.519906],
  [722, 2.525601], [734, 2.536417],
  [735, 2.841052], [747, 2.883790], // ata1 link up, sda attached
  [748, 3.184207], [749, 3.191555], [762, 3.214660], // ata2 down, ata5 up
  [763, 3.521089], [771, 3.533817], [778, 3.533904], // ata6 down, Run /init
  [779, 3.592114], [820, 3.701448], // xhci after udev triggers
  [821, 4.471932], [823, 4.536005], // root mounted, usb enumeration
  [824, 4.781120], [833, 4.842660],
  [881, audit(1668645645.130)], [897, audit(1668645645.180)],
  [926, audit(1668645645.263)], [943, audit(1668645645.330)],
  [951, audit(1668645645.466)], [970, audit(1668645645.506)],
  [979, audit(1668645645.546)],
  [986, 5.402316], [1017, 5.718842], // fsck on the 3 TB HDD
  [1073, 5.951270], [1119, 6.052118], [1127, 6.093557],
  [1156, 6.251906], [1181, 6.372455], [1184, 6.392015], [1186, 6.396230],
]

function timeAt(n) {
  for (let i = 1; i < ANCHORS.length; i++) {
    const [n1, t1] = ANCHORS[i]
    if (n <= n1) {
      const [n0, t0] = ANCHORS[i - 1]
      return n1 === n0 ? t1 : t0 + ((t1 - t0) * (n - n0)) / (n1 - n0)
    }
  }
  return ANCHORS.at(-1)[1]
}

const stamp = (t) => `[${t.toFixed(6).padStart(12)}] `

// Journal wording of PID 1 messages -> console status line.
const OK_VERBS = [
  'Created slice', 'Started', 'Reached target', 'Listening on', 'Mounted',
  'Finished', 'Set up automount', 'Found device',
]
const JOB_VERBS = ['Starting', 'Mounting']

function statusLine(msg) {
  if (/ was skipped because /.test(msg)) return null
  for (const verb of OK_VERBS) {
    const m = msg.match(new RegExp(`^${verb} (.*)\\.$`))
    if (m) return { k: 'ok', verb, desc: m[1] }
  }
  for (const verb of JOB_VERBS) {
    const m = msg.match(new RegExp(`^${verb} (.*)\\.\\.\\.$`))
    if (m) return { k: 'job', verb, desc: m[1] }
  }
  return null
}

const events = []
const push = (t, e) => events.push({ t: +t.toFixed(6), ...e })
const raw = (t, text, extra) => push(t, { k: 'raw', text, ...extra })

// Busybox initramfs output, lines from mkinitcpio's init / udev hook.
// The fsck counts are not in the journal; they are worked out from the
// 120 GB disk's partition size (sdb2 ~ 111 GiB, ext4 defaults).
const INITRAMFS = {
  778: [
    [3.535201, ':: running early hook [udev]'],
    [3.548930, 'Starting systemd-udevd version 252.1-1-arch'],
    [3.563412, ':: running hook [udev]'],
    [3.570087, ':: Triggering uevents...'],
  ],
  820: [
    [4.213660, ":: performing fsck on '/dev/sdb2'"],
    [4.402871, '/dev/sdb2: clean, 452376/7299072 files, 9831245/29173878 blocks'],
    [4.419035, ":: mounting '/dev/sdb2' on real root"],
  ],
  821: [[4.498102, ':: running cleanup hook [udev]']],
}

let journaldUp = false

lines.forEach((line, i) => {
  const n = i + 1
  if (!line) return
  const t = timeAt(n)
  const msg = line.msg.replaceAll('<zett>', `<${HOSTNAME}>`)

  if (line.ident === 'kernel') {
    // fbcon takes over here; everything printed so far shows up at once
    raw(t, stamp(t) + msg, n === 704 ? { screen: 1 } : undefined)
  } else if (line.ident === 'systemd' && line.pid === '1') {
    if (!journaldUp) raw(t, `${stamp(t)}systemd[1]: ${msg}`)
    if (msg === 'Detected architecture x86-64.') {
      push(t + 0.000412, { k: 'welcome' })
    }
    const s = statusLine(msg)
    if (s) push(t + 0.000051, s)
    if (msg === 'Started Journal Service.') journaldUp = true
  }

  for (const [it, text] of INITRAMFS[n] ?? []) raw(it, text)
})

events.sort((a, b) => a.t - b.t)

writeFileSync(OUT, JSON.stringify(events))
console.log(`wrote ${events.length} console lines, ends at ${events.at(-1).t}s`)
