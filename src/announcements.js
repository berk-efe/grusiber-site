// Newest first. `banner: true` puts it in the bar at the top of the home page
// (only the newest such one shows, until the visitor closes it). `id` is the
// anchor on /duyurular/ and the key for "closed", so don't reuse ids.
export const ANNOUNCEMENTS = [
  {
    id: 'duyurular-acildi',
    date: '2026-11-05',
    title: 'duyurular sayfası açıldı',
    body: [
      'topluluktan haberler, etkinlikler ve toplantılar artık burada duyurulacak.',
      'yeni bir duyuru çıktığında ana sayfanın üstünde bir bar görünecek.',
    ],
    banner: true,
  },
]
