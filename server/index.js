const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

// Configure paths basseret op milijøvariabler
let DB_PATH = process.env.DB_PATH || path.join(__dirname, 'notes.db');
let UPLOAD_PATH = process.env.UPLOAD_PATH || path.join(__dirname, 'uploads');

// Ift render.com kører denne kode
if (DB_PATH.startsWith('/data')) {
  DB_PATH = path.join('/tmp', path.basename(DB_PATH));
  console.log(`Using temporary database path: ${DB_PATH}`);
  fs.mkdirSync('/tmp', { recursive: true });
}

if (UPLOAD_PATH.startsWith('/data')) {
  UPLOAD_PATH = path.join('/tmp', 'uploads');
  console.log(`Using temporary upload path: ${UPLOAD_PATH}`);
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const defaultUploadPath = path.join(__dirname, 'uploads');
if (UPLOAD_PATH === defaultUploadPath && !fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  try {
    // Ift render.com kører denne kode
    if (dbDir.startsWith('/data')) {
      const tmpDbPath = path.join('/tmp', path.basename(DB_PATH));
      console.log(`Using temporary database path: ${tmpDbPath}`);
      process.env.DB_PATH = tmpDbPath;
      fs.mkdirSync('/tmp', { recursive: true });
    } else {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    console.log(`Created database directory: ${dbDir}`);
  } catch (err) {
    console.error(`Error creating database directory: ${err.message}`);
  }
}

// kopier database, hvis den ikke findes på målstedet - kun til lokal udvikling
const defaultDbPath = path.join(__dirname, 'notes.db');
if (DB_PATH === defaultDbPath && !fs.existsSync(DB_PATH)) {
  const sourceDb = path.join(__dirname, 'notes.db');
  if (fs.existsSync(sourceDb)) {
    fs.copyFileSync(sourceDb, DB_PATH);
    console.log(`Copied database from ${sourceDb} to ${DB_PATH}`);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_PATH);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// simpel ID generator funktion
function generateId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
}

const app = express();
const port = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://planet-noter.onrender.com', 'https://planet-noter-frontend.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_PATH));

// Database setup
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at:', DB_PATH);
    // Initialize database with schema
    db.serialize(() => {
      // Create notes table
      db.run(`CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user TEXT,
        title TEXT,
        description TEXT,
        color TEXT,
        image TEXT,
        todoList TEXT,
        showDescription INTEGER DEFAULT 0,
        showList INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastClicked TEXT
      )`, (err) => {
        if (err) {
          console.error('Error creating notes table:', err);
        } else {
          console.log('Notes table initialized successfully');
        }
      });

      // Create checked_notes table
      db.run(`CREATE TABLE IF NOT EXISTS checked_notes (
        id TEXT PRIMARY KEY,
        user TEXT,
        title TEXT,
        description TEXT,
        color TEXT,
        image TEXT,
        todoList TEXT,
        showDescription INTEGER DEFAULT 0,
        showList INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastClicked TEXT
      )`, (err) => {
        if (err) {
          console.error('Error creating checked_notes table:', err);
        } else {
          console.log('Checked notes table initialized successfully');
        }
      });
    });
  }
});

// Valid users (using IDs)
const VALID_USERS = ['1', '2', '3'];
const DEFAULT_USER = '1';

// middleware til at validere bruger
const validateUser = (req, res, next) => {
  const user = req.params.user || req.body.user ; //fjernet || DEFAULT_USER
  console.log('Validating user:', user);

  if (!VALID_USERS.includes(user)) {
    console.error('Invalid user:', user);
    return res.status(400).json({ error: 'Invalid user' });
  }

  req.user = user;
  next();
};

// hjælpefunktion til at parse og validere todo liste
const parseTodoList = (todoList) => {
  if (!todoList) return [];

  try {
    // hvis det allerede er et array, validere og returner det
    if (Array.isArray(todoList)) {
      return todoList.map(item => ({
        text: String(item.text || ''),
        checked: Boolean(item.checked),
        completedAt: item.completedAt || null
      }));
    }

    // hvis det er en streng, prøv at parse det
    if (typeof todoList === 'string') {
      // hvis det er "0", returner en tom array
      if (todoList === "0") return [];

      const parsed = JSON.parse(todoList);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          text: String(item.text || ''),
          checked: Boolean(item.checked),
          completedAt: item.completedAt || null
        }));
      }
    }
  } catch (e) {
    console.error('Failed to parse todoList:', e);
  }
  return [];
};

// hjælpefunktion til at stringify todo liste
const stringifyTodoList = (todoList) => {
  if (!todoList || !Array.isArray(todoList)) return '[]';
  try {
    const validTodoList = todoList.map(item => ({
      text: String(item.text || ''),
      checked: Boolean(item.checked),
      completedAt: item.completedAt || null
    }));
    return JSON.stringify(validTodoList);
  } catch (e) {
    console.error('Failed to stringify todoList:', e);
    return '[]';
  }
};

// hent alle noter for en bestemt bruger
app.get('/notes/:user', validateUser, (req, res) => {
  const user = req.user;
  console.log('Fetching notes for user:', user);

  db.all('SELECT * FROM notes WHERE user = ?', [user], (err, rows) => {
    if (err) {
      console.error('Error fetching notes:', err);
      return res.status(500).json({ error: 'Failed to fetch notes' });
    }

    const notes = rows.map(note => {
      const todoList = parseTodoList(note.todoList);
      return {
        ...note,
        todoList,
        showList: todoList.length > 0
      };
    });

    // sorter noter: "Ny" først, derefter efter lastClicked i faldende rækkefølge
    notes.sort((a, b) => {
      if (!a.lastClicked && !b.lastClicked) return 0;
      if (!a.lastClicked) return -1;
      if (!b.lastClicked) return 1;
      return new Date(b.lastClicked).getTime() - new Date(a.lastClicked).getTime();
    });

    console.log(`Found ${rows.length} notes for user ${user}`);
    res.json(notes);
  });
});

// opret en ny note
app.post('/notes', validateUser, (req, res) => {
  console.log('\n=== New Note Creation Request ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));

  const note = req.body;
  note.user = req.user;

  if (!note.id) {
    note.id = Date.now().toString();
  }

  // parse og validere todoList
  const todoList = parseTodoList(note.todoList);
  const todoListStr = stringifyTodoList(todoList);

  const sql = `INSERT INTO notes (id, user, title, description, color, image, todoList, showDescription, showList, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`;
  const params = [
    note.id,
    note.user,
    note.title,
    note.description || '',
    note.color || '#3C8C50',
    note.image || '',
    todoListStr,
    note.showDescription ? 1 : 0,
    todoList.length > 0 ? 1 : 0
  ];

  console.log('Executing SQL:', sql);
  console.log('With params:', params);

  db.run(sql, params, function(err) {
    if (err) {
      console.error('Error inserting note:', err);
      console.error('SQL Error details:', {
        code: err.code,
        message: err.message,
        stack: err.stack
      });
      return res.status(500).json({
        error: 'Failed to create note',
        details: err.message,
        sql: sql,
        params: params
      });
    }

    console.log('Note created successfully with ID:', note.id);
    console.log('SQLite lastID:', this.lastID);
    console.log('SQLite changes:', this.changes);

    // returner den oprettede note med parsed todoList
    const createdNote = {
      ...note,
      todoList,
      showList: todoList.length > 0
    };
    res.json(createdNote);
  });
});

// opdater en note
app.put('/notes/:id', validateUser, (req, res) => {
  const user = req.user;
  const id = req.params.id;
  const note = req.body;
  console.log('Updating note:', id, 'for user:', user);

  note.user = user;

  // først tjek, om noten eksisterer og tilhører brugeren
  db.get('SELECT * FROM notes WHERE id = ?', [id], (err, existingNote) => {
    if (err) {
      console.error('Error checking note existence:', err);
      return res.status(500).json({ error: 'Failed to check note existence' });
    }

    if (!existingNote) {
      console.error('No note found with ID:', id, 'for user:', user);
      return res.status(404).json({ error: 'Note not found' });
    }

    if (existingNote.user !== user) {
      console.error('Cannot update note belonging to another user');
      return res.status(403).json({ error: 'Cannot update note belonging to another user' });
    }

    // håndter todoList
    let todoList;
    if (note.todoList) {
      todoList = parseTodoList(note.todoList);
    } else {
      todoList = parseTodoList(existingNote.todoList);
    }

    // sørg for, at todoList er gyldig
    if (!Array.isArray(todoList)) {
      todoList = [];
    }

    const todoListStr = stringifyTodoList(todoList);

    db.run(`
      UPDATE notes
      SET title = ?, description = ?, color = ?, image = ?, todoList = ?, showDescription = ?, showList = ?, lastClicked = ?
      WHERE id = ? AND user = ?
    `, [
      note.title,
      note.description,
      note.color,
      note.image,
      todoListStr,
      note.showDescription ? 1 : 0,
      todoList.length > 0 ? 1 : 0,
      note.lastClicked,
      id,
      user
    ], function(err) {
      if (err) {
        console.error('Error updating note:', err);
        return res.status(500).json({ error: 'Failed to update note' });
      }

      if (this.changes === 0) {
        console.error('No note found with ID:', id, 'for user:', user);
        return res.status(404).json({ error: 'Note not found' });
      }

      // returner den opdaterede note med parsed todoList
      const updatedNote = {
        ...note,
        todoList,
        showList: todoList.length > 0
      };
      res.json(updatedNote);
    });
  });
});

// fjern en note
app.delete('/notes/:id', validateUser, (req, res) => {
  const user = req.user;
  const id = req.params.id;
  console.log('Deleting note:', id, 'for user:', user);

  // først tjek, om noten eksisterer og tilhører brugeren
  db.get('SELECT user FROM notes WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error checking note existence:', err);
      return res.status(500).json({ error: 'Failed to check note existence' });
    }

    if (!row) {
      console.error('No note found with ID:', id);
      return res.status(404).json({ error: 'Note not found' });
    }

    if (row.user !== user) {
      console.error('Cannot delete note belonging to another user');
      return res.status(403).json({ error: 'Cannot delete note belonging to another user' });
    }

    // Delete the note
    db.run('DELETE FROM notes WHERE id = ? AND user = ?', [id, user], function(err) {
      if (err) {
        console.error('Error deleting note:', err);
        return res.status(500).json({ error: 'Failed to delete note' });
      }

      if (this.changes === 0) {
        console.error('No note found with ID:', id);
        return res.status(404).json({ error: 'Note not found' });
      }

      console.log('Successfully deleted note with ID:', id);
      res.json({ message: 'Note deleted successfully' });
    });
  });
});

// hent alle afkrysete noter for en bestemt bruger
app.get('/checked-notes/:user', validateUser, (req, res) => {
  const user = req.user;
  console.log('Fetching checked notes for user:', user);

  db.all('SELECT * FROM checked_notes WHERE user = ?', [user], (err, rows) => {
    if (err) {
      console.error('Error fetching checked notes:', err);
      return res.status(500).json({ error: 'Failed to fetch checked notes' });
    }

    const notes = rows.map(note => {
      const todoList = parseTodoList(note.todoList);
      return {
        ...note,
        todoList,
        showList: todoList.length > 0
      };
    });

    // sorter noter: "Ny" først, derefter efter lastClicked i faldende rækkefølge
    notes.sort((a, b) => {
      if (!a.lastClicked && !b.lastClicked) return 0;
      if (!a.lastClicked) return -1;
      if (!b.lastClicked) return 1;
      return new Date(b.lastClicked).getTime() - new Date(a.lastClicked).getTime();
    });

    console.log(`Found ${rows.length} checked notes for user ${user}`);
    res.json(notes);
  });
});

// opret en ny afkryset note
app.post('/checked-notes', validateUser, (req, res) => {
  const user = req.user;
  const note = req.body;
  console.log('Creating checked note for user:', user);

  // sørg for, at brugeren er sat korrekt
  note.user = user;

  // generer en unik ID, hvis den ikke er angivet
  if (!note.id) {
    note.id = generateId();
    console.log('Generated new checked note ID:', note.id);
  }

  // konverter todoList til JSON streng
  const todoListJson = JSON.stringify(note.todoList || []);

  db.run(`
    INSERT INTO checked_notes (id, user, title, description, color, image, todoList, showDescription, showList)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    note.id,
    note.user,
    note.title,
    note.description,
    note.color,
    note.image,
    todoListJson,
    note.showDescription ? 1 : 0,
    note.showList ? 1 : 0
  ], function(err) {
    if (err) {
      console.error('Error creating checked note:', err);
      return res.status(500).json({ error: 'Failed to create checked note' });
    }

    console.log('Created checked note with ID:', note.id);
    res.json(note);
  });
});

// opdater en afkryset note
app.put('/checked-notes/:id', validateUser, (req, res) => {
  const user = req.user;
  const id = req.params.id;
  const note = req.body;
  console.log('Updating checked note:', id, 'for user:', user);

  // sørg for, at brugeren er sat korrekt
  note.user = user;

  // først tjek, om noten eksisterer og tilhører brugeren
  db.get('SELECT * FROM checked_notes WHERE id = ?', [id], (err, existingNote) => {
    if (err) {
      console.error('Error checking checked note existence:', err);
      return res.status(500).json({ error: 'Failed to check checked note existence' });
    }

    if (!existingNote) {
      console.error('No checked note found with ID:', id, 'for user:', user);
      return res.status(404).json({ error: 'Checked note not found' });
    }

    if (existingNote.user !== user) {
      console.error('Cannot update checked note belonging to another user');
      return res.status(403).json({ error: 'Cannot update checked note belonging to another user' });
    }

    // Handle todoList
    let todoList;
    if (note.todoList) {
      todoList = parseTodoList(note.todoList);
    } else {
      todoList = parseTodoList(existingNote.todoList);
    }

    // sørg for, at todoList er gyldig
    if (!Array.isArray(todoList)) {
      todoList = [];
    }

    const todoListStr = stringifyTodoList(todoList);

    db.run(`
      UPDATE checked_notes
      SET title = ?, description = ?, color = ?, image = ?, todoList = ?, showDescription = ?, showList = ?, lastClicked = ?
      WHERE id = ? AND user = ?
    `, [
      note.title,
      note.description,
      note.color,
      note.image,
      todoListStr,
      note.showDescription ? 1 : 0,
      todoList.length > 0 ? 1 : 0,
      note.lastClicked,
      id,
      user
    ], function(err) {
      if (err) {
        console.error('Error updating checked note:', err);
        return res.status(500).json({ error: 'Failed to update checked note' });
      }

      if (this.changes === 0) {
        console.error('No checked note found with ID:', id, 'for user:', user);
        return res.status(404).json({ error: 'Checked note not found' });
      }

      // returner den opdaterede note med parsed todoList
      const updatedNote = {
        ...note,
        todoList,
        showList: todoList.length > 0
      };
      res.json(updatedNote);
    });
  });
});

// fjern en afkryset note
app.delete('/checked-notes/:id', validateUser, (req, res) => {
  const user = req.user;
  const id = req.params.id;
  console.log('Deleting checked note:', id, 'for user:', user);

  // først tjek, om noten eksisterer og tilhører brugeren
  db.get('SELECT user FROM checked_notes WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error checking checked note existence:', err);
      return res.status(500).json({ error: 'Failed to check checked note existence' });
    }

    if (!row) {
      console.error('No checked note found with ID:', id);
      return res.status(404).json({ error: 'Checked note not found' });
    }

    if (row.user !== user) {
      console.error('Cannot delete checked note belonging to another user');
      return res.status(403).json({ error: 'Cannot delete checked note belonging to another user' });
    }

    // slet den afkrysete note
    db.run('DELETE FROM checked_notes WHERE id = ? AND user = ?', [id, user], function(err) {
      if (err) {
        console.error('Error deleting checked note:', err);
        return res.status(500).json({ error: 'Failed to delete checked note' });
      }

      if (this.changes === 0) {
        console.error('No checked note found with ID:', id);
        return res.status(404).json({ error: 'Checked note not found' });
      }

      console.log('Successfully deleted checked note with ID:', id);
      res.json({ message: 'Checked note deleted successfully' });
    });
  });
});

// POST /notes/:id/check
app.post('/notes/:id/check', validateUser, (req, res) => {
  const user = req.user;
  const id = req.params.id;
  console.log('Checking note:', id, 'for user:', user);

  // først tjek, om noten eksisterer og tilhører brugeren
  db.get('SELECT * FROM notes WHERE id = ? AND user = ?', [id, user], (err, note) => {
    if (err) {
      console.error('Error checking note existence:', err);
      return res.status(500).json({ error: 'Failed to check note existence' });
    }

    if (!note) {
      console.error('No note found with ID:', id, 'for user:', user);
      return res.status(404).json({ error: 'Note not found' });
    }

    // sørg for, at todoList er håndteret korrekt
    let todoList = note.todoList;
    if (typeof todoList === 'string') {
      try {
        todoList = JSON.parse(todoList);
      } catch (e) {
        console.error('Error parsing todoList:', e);
        todoList = [];
      }
    }
    // sørg for, at todoList er et array
    if (!Array.isArray(todoList)) {
      todoList = [];
    }

    // tilføj checked_at tidsstempel mens lastClicked bevares
    const checkedNote = {
      ...note,
      todoList: JSON.stringify(todoList),
      checked_at: new Date().toISOString(),
      lastClicked: note.lastClicked // bevar lastClicked tidsstempel
    };

    // indsæt i checked_notes
    db.run(`
      INSERT INTO checked_notes (id, user, title, description, color, image, todoList, showDescription, showList, created_at, checked_at, lastClicked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      checkedNote.id,
      checkedNote.user,
      checkedNote.title,
      checkedNote.description,
      checkedNote.color,
      checkedNote.image,
      checkedNote.todoList,
      checkedNote.showDescription,
      checkedNote.showList,
      checkedNote.created_at,
      checkedNote.checked_at,
      checkedNote.lastClicked
    ], function(err) {
      if (err) {
        console.error('Error creating checked note:', err);
        return res.status(500).json({ error: 'Failed to create checked note' });
      }

      // slet fra notes
      db.run('DELETE FROM notes WHERE id = ? AND user = ?', [id, user], function(err) {
        if (err) {
          console.error('Error deleting note:', err);
          return res.status(500).json({ error: 'Failed to delete note' });
        }

        console.log('Moved note to checked notes:', id);
        res.json(checkedNote);
      });
    });
  });
});

// POST /checked-notes/:id/uncheck
app.post('/checked-notes/:id/uncheck', validateUser, (req, res) => {
  const user = req.user;
  const id = req.params.id;
  console.log('Unchecking note:', id, 'for user:', user);

  // først tjek, om noten eksisterer og tilhører brugeren
  db.get('SELECT * FROM checked_notes WHERE id = ? AND user = ?', [id, user], (err, note) => {
    if (err) {
      console.error('Error checking note existence:', err);
      return res.status(500).json({ error: 'Failed to check note existence' });
    }

    if (!note) {
      console.error('No checked note found with ID:', id, 'for user:', user);
      return res.status(404).json({ error: 'Checked note not found' });
    }

    // sørg for, at todoList er håndteret korrekt
    let todoList = note.todoList;
    if (typeof todoList === 'string') {
      try {
        todoList = JSON.parse(todoList);
      } catch (e) {
        console.error('Error parsing todoList:', e);
        todoList = [];
      }
    }
    // sørg for, at todoList er et array
    if (!Array.isArray(todoList)) {
      todoList = [];
    }

    // indsæt i notes mens lastClicked bevares
    db.run(`
      INSERT INTO notes (id, user, title, description, color, image, todoList, showDescription, showList, created_at, lastClicked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      note.id,
      note.user,
      note.title,
      note.description,
      note.color,
      note.image,
      JSON.stringify(todoList),
      note.showDescription,
      note.showList,
      note.created_at,
      note.lastClicked // bevar lastClicked tidsstempel
    ], function(err) {
      if (err) {
        console.error('Error creating note:', err);
        return res.status(500).json({ error: 'Failed to create note' });
      }

      // slet fra checked_notes
      db.run('DELETE FROM checked_notes WHERE id = ? AND user = ?', [id, user], function(err) {
        if (err) {
          console.error('Error deleting checked note:', err);
          return res.status(500).json({ error: 'Failed to delete checked note' });
        }

        console.log('Moved note back to regular notes:', id);
        res.json(note);
      });
    });
  });
});

// tilføj ny endpoint til fil upload
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

app.get("/api/notes", async (req, res) => {
  const userId = req.query.user;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const notes = await db.all("SELECT * FROM notes WHERE user = ?", [userId]);
    const parsedNotes = notes.map(note => {
      let todoList = [];
      try {
        if (note.todoList) {
          const parsed = JSON.parse(note.todoList);
          todoList = Array.isArray(parsed) ? parsed.map(item => ({
            text: item.text || '',
            checked: Boolean(item.checked),
            completedAt: item.completedAt || null
          })) : [];
        }
      } catch (e) {
        console.error('Failed to parse todoList:', e);
      }
      return {
        ...note,
        todoList,
        showList: todoList.length > 0
      };
    });
    res.json(parsedNotes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

app.get("/api/checked-notes", async (req, res) => {
  const userId = req.query.user;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const notes = await db.all("SELECT * FROM checked_notes WHERE user = ?", [userId]);
    const parsedNotes = notes.map(note => {
      let todoList = [];
      try {
        if (note.todoList) {
          const parsed = JSON.parse(note.todoList);
          todoList = Array.isArray(parsed) ? parsed.map(item => ({
            text: item.text || '',
            checked: Boolean(item.checked),
            completedAt: item.completedAt || null
          })) : [];
        }
      } catch (e) {
        console.error('Failed to parse todoList:', e);
      }
      return {
        ...note,
        todoList,
        showList: todoList.length > 0
      };
    });
    res.json(parsedNotes);
  } catch (error) {
    console.error("Error fetching checked notes:", error);
    res.status(500).json({ error: "Failed to fetch checked notes" });
  }
});
