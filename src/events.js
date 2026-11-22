// Club events for /takvim/. Later these come from the admin panel; until then
// they live here. Times are Türkiye time (UTC+3, no DST), written as
// 'YYYY-MM-DDTHH:MM'. `end` is optional.
//
// type: one of the keys in EVENT_TYPES below.

export const EVENT_TYPES = {
  atolye: { label: 'atölye', color: '#00ff9c' },
  ctf: { label: 'ctf', color: '#ff2bd6' },
  sunum: { label: 'sunum', color: '#00e5ff' },
  toplanti: { label: 'toplantı', color: '#ffb000' },
}

// ÖRNEK VERİ: takvimin nasıl göründüğünü görmek için. Gerçek etkinlikler
// girilince silinecek, prod'a bu haliyle gitmemeli.
export const EVENTS = [
  {
    id: 'ornek-tanisma',
    title: 'tanışma toplantısı',
    type: 'toplanti',
    start: '2026-11-24T18:00',
    end: '2026-11-24T19:30',
    place: 'mühendislik fakültesi, z-12',
    description: 'örnek etkinlik. yeni üyelerle tanışıyoruz, dönem planını konuşuyoruz.',
  },
  {
    id: 'ornek-linux-atolye',
    title: 'linux komut satırı atölyesi',
    type: 'atolye',
    start: '2026-11-27T17:00',
    end: '2026-11-27T19:00',
    place: 'bilgisayar lab 2',
    description: 'örnek etkinlik. bilgisayarını getir.',
  },
  {
    id: 'ornek-ctf',
    title: 'hafta sonu ctf',
    type: 'ctf',
    start: '2026-12-05T10:00',
    end: '2026-12-06T22:00',
    place: 'online',
    description: 'örnek etkinlik. takım halinde katılıyoruz.',
    link: 'https://ctftime.org/',
  },
  {
    id: 'ornek-web-sunum',
    title: 'web güvenliğine giriş',
    type: 'sunum',
    start: '2026-12-10T18:30',
    end: '2026-12-10T20:00',
    place: 'konferans salonu',
    description: 'örnek etkinlik. owasp top 10 üzerinden örneklerle.',
  },
  {
    id: 'ornek-aralik-toplanti',
    title: 'aylık toplantı',
    type: 'toplanti',
    start: '2026-12-10T17:00',
    place: 'z-12',
    description: 'örnek etkinlik.',
  },
]
