-- Sample rows for the LOCAL database only (npm run db:seed). Never run this
-- against the real one: these events are made up.
DELETE FROM events;
DELETE FROM announcements;

INSERT INTO events (id, title, type, start, "end", place, description, link, updated_at, updated_by) VALUES
  ('ornek-tanisma', 'tanışma toplantısı', 'toplanti', '2026-11-24T18:00', '2026-11-24T19:30', 'mühendislik fakültesi, z-12', 'örnek etkinlik. yeni üyelerle tanışıyoruz, dönem planını konuşuyoruz.', NULL, '2026-11-22T00:00:00Z', 'seed'),
  ('ornek-linux-atolye', 'linux komut satırı atölyesi', 'atolye', '2026-11-27T17:00', '2026-11-27T19:00', 'bilgisayar lab 2', 'örnek etkinlik. bilgisayarını getir.', NULL, '2026-11-22T00:00:00Z', 'seed'),
  ('ornek-ctf', 'hafta sonu ctf', 'ctf', '2026-12-05T10:00', '2026-12-06T22:00', 'online', 'örnek etkinlik. takım halinde katılıyoruz.', 'https://ctftime.org/', '2026-11-22T00:00:00Z', 'seed'),
  ('ornek-web-sunum', 'web güvenliğine giriş', 'sunum', '2026-12-10T18:30', '2026-12-10T20:00', 'konferans salonu', 'örnek etkinlik. owasp top 10 üzerinden örneklerle.', NULL, '2026-11-22T00:00:00Z', 'seed'),
  ('ornek-aralik-toplanti', 'aylık toplantı', 'toplanti', '2026-12-10T17:00', NULL, 'z-12', 'örnek etkinlik.', NULL, '2026-11-22T00:00:00Z', 'seed');

INSERT INTO announcements (id, date, title, body, banner, updated_at, updated_by) VALUES
  ('duyurular-acildi', '2026-11-05', 'duyurular sayfası açıldı', 'topluluktan haberler, etkinlikler ve toplantılar artık burada duyurulacak.

yeni bir duyuru çıktığında ana sayfanın üstünde bir bar görünecek.', 1, '2026-11-22T00:00:00Z', 'seed');
