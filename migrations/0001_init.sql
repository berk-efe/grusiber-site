-- Events for /takvim/ and announcements for /duyurular/.
-- Times are Türkiye time as 'YYYY-MM-DDTHH:MM' text, like the frontend uses.

CREATE TABLE events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,
  start       TEXT NOT NULL,
  "end"       TEXT,
  place       TEXT,
  description TEXT,
  link        TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT NOT NULL
);
CREATE INDEX events_start ON events (start);

CREATE TABLE announcements (
  id          TEXT PRIMARY KEY,
  date        TEXT NOT NULL,          -- 'YYYY-MM-DD'
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,          -- paragraphs separated by a blank line
  banner      INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT NOT NULL
);
CREATE INDEX announcements_date ON announcements (date);
