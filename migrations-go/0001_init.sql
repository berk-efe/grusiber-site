-- Link records (KV stays the source of truth for redirects; this holds metadata + stored QR).
CREATE TABLE IF NOT EXISTS links (
  slug       TEXT PRIMARY KEY,
  url        TEXT NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  qr_text    TEXT NOT NULL,
  qr_svg     TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- One row per redirect served.
CREATE TABLE IF NOT EXISTS scans (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT NOT NULL,             -- ISO 8601 UTC
  slug     TEXT NOT NULL,
  target   TEXT,                      -- destination at the time of the scan
  source   TEXT NOT NULL,             -- 'qr' (URL had ?qr) or 'link'
  ip       TEXT,
  visitor  TEXT,                      -- hash(ip + user agent), for unique counts
  country  TEXT,
  region   TEXT,
  city     TEXT,
  timezone TEXT,
  asn_org  TEXT,                      -- ISP / network
  device   TEXT,                      -- Mobile / Tablet / Desktop / Bot
  os       TEXT,
  browser  TEXT,
  is_bot   INTEGER NOT NULL DEFAULT 0,
  referer  TEXT,
  lang     TEXT,
  ua       TEXT
);
CREATE INDEX IF NOT EXISTS scans_slug_ts ON scans (slug, ts);
CREATE INDEX IF NOT EXISTS scans_ts ON scans (ts);
