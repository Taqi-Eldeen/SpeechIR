CREATE TABLE IF NOT EXISTS audio_files (
  id INTEGER PRIMARY KEY,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  duration_s REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS segments (
  id INTEGER PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES audio_files(id),
  start_s REAL NOT NULL,
  end_s REAL NOT NULL,
  text TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts5(
  text,
  content='segments',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS seg_ai AFTER INSERT ON segments BEGIN
  INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS seg_ad AFTER DELETE ON segments BEGIN
  INSERT INTO segments_fts(segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;

CREATE TRIGGER IF NOT EXISTS seg_au AFTER UPDATE ON segments BEGIN
  INSERT INTO segments_fts(segments_fts, rowid, text) VALUES ('delete', old.id, old.text);
  INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text);
END;

CREATE TABLE IF NOT EXISTS inverted_index (
  term TEXT NOT NULL,
  seg_id INTEGER NOT NULL,
  file_id INTEGER NOT NULL,
  start_s REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inverted_index_term ON inverted_index(term);
CREATE INDEX IF NOT EXISTS idx_inverted_index_file ON inverted_index(file_id);
