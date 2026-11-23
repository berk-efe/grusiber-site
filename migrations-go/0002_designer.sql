-- QR design per short link (JSON), the styled SVG lives in links.qr_svg.
ALTER TABLE links ADD COLUMN design TEXT;

-- Uploaded logos (PNG data URLs, resized in the browser to <= 512 px).
CREATE TABLE IF NOT EXISTS logos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  data_url   TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Key/value settings, e.g. the default QR design.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Library of static QR codes made in the generator (Wi-Fi, vCard, text, ...).
CREATE TABLE IF NOT EXISTS qr_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL,
  fields     TEXT NOT NULL,   -- JSON of the form inputs
  content    TEXT NOT NULL,   -- exact string encoded in the QR
  design     TEXT NOT NULL,   -- JSON
  svg        TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
