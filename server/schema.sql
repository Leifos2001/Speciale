CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  image TEXT,
  todoList TEXT,
  showDescription INTEGER DEFAULT 1,
  showList INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  lastClicked TEXT
);

CREATE TABLE IF NOT EXISTS checked_notes (
  id TEXT PRIMARY KEY,
  user TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  image TEXT,
  todoList TEXT,
  showDescription INTEGER DEFAULT 1,
  showList INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  lastClicked TEXT
);