const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./data/filament_inventory.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS filaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      spool_type TEXT NOT NULL CHECK(spool_type IN ('refill', 'with_spool')),
      weight_remaining REAL DEFAULT 1000,
      purchase_date TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  const createCustomBrandsQuery = `
    CREATE TABLE IF NOT EXISTS custom_brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  const createCustomColorsQuery = `
    CREATE TABLE IF NOT EXISTS custom_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      hex_code TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  const createCustomTypesQuery = `
    CREATE TABLE IF NOT EXISTS custom_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating filaments table:', err.message);
    } else {
      console.log('Filaments table ready');
    }
  });
  
  db.run(createCustomBrandsQuery, (err) => {
    if (err) {
      console.error('Error creating custom_brands table:', err.message);
    } else {
      console.log('Custom brands table ready');
    }
  });
  
  db.run(createCustomColorsQuery, (err) => {
    if (err) {
      console.error('Error creating custom_colors table:', err.message);
    } else {
      console.log('Custom colors table ready');
    }
  });
  
  db.run(createCustomTypesQuery, (err) => {
    if (err) {
      console.error('Error creating custom_types table:', err.message);
    } else {
      console.log('Custom types table ready');
    }
  });
}

// API Routes

// Get all filaments
app.get('/api/filaments', (req, res) => {
  const query = `
    SELECT * FROM filaments 
    ORDER BY created_at DESC
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Search filaments
app.get('/api/filaments/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }
  
  const query = `
    SELECT * FROM filaments 
    WHERE brand LIKE ? OR type LIKE ? OR color LIKE ? OR notes LIKE ?
    ORDER BY created_at DESC
  `;
  
  const searchTerm = `%${q}%`;
  
  db.all(query, [searchTerm, searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get single filament
app.get('/api/filaments/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM filaments WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Filament not found' });
      return;
    }
    res.json(row);
  });
});

// Add new filament
app.post('/api/filaments', (req, res) => {
  const { brand, type, color, spool_type, weight_remaining, purchase_date, notes } = req.body;
  
  if (!brand || !type || !color || !spool_type) {
    return res.status(400).json({ error: 'Brand, type, color, and spool_type are required' });
  }
  
  const query = `
    INSERT INTO filaments (brand, type, color, spool_type, weight_remaining, purchase_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [brand, type, color, spool_type, weight_remaining || 1000, purchase_date, notes], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID, message: 'Filament added successfully' });
  });
});

// Update filament
app.put('/api/filaments/:id', (req, res) => {
  const { id } = req.params;
  const { brand, type, color, spool_type, weight_remaining, purchase_date, notes } = req.body;
  
  const query = `
    UPDATE filaments 
    SET brand = ?, type = ?, color = ?, spool_type = ?, weight_remaining = ?, 
        purchase_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  
  db.run(query, [brand, type, color, spool_type, weight_remaining, purchase_date, notes, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Filament not found' });
      return;
    }
    res.json({ message: 'Filament updated successfully' });
  });
});

// Delete filament
app.delete('/api/filaments/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM filaments WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Filament not found' });
      return;
    }
    res.json({ message: 'Filament deleted successfully' });
  });
});

// Custom brands endpoints
app.get('/api/custom-brands', (req, res) => {
  db.all('SELECT * FROM custom_brands ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/custom-brands', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Brand name is required' });
  }
  
  db.run('INSERT INTO custom_brands (name) VALUES (?)', [name], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(409).json({ error: 'Brand already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.json({ id: this.lastID, name, message: 'Custom brand added successfully' });
  });
});

// Custom colors endpoints
app.get('/api/custom-colors', (req, res) => {
  db.all('SELECT * FROM custom_colors ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/custom-colors', (req, res) => {
  const { name, hex_code } = req.body;
  if (!name || !hex_code) {
    return res.status(400).json({ error: 'Color name and hex code are required' });
  }
  
  db.run('INSERT INTO custom_colors (name, hex_code) VALUES (?, ?)', [name, hex_code], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(409).json({ error: 'Color already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.json({ id: this.lastID, name, hex_code, message: 'Custom color added successfully' });
  });
});

// Update custom brand
app.put('/api/custom-brands/:name', (req, res) => {
  const { name } = req.params;
  const { newName } = req.body;
  
  if (!newName) {
    return res.status(400).json({ error: 'New brand name is required' });
  }
  
  const oldName = decodeURIComponent(name);
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Update custom brand
    db.run('UPDATE custom_brands SET name = ? WHERE name = ?', [newName, oldName], function(err) {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        db.run('ROLLBACK');
        res.status(404).json({ error: 'Custom brand not found' });
        return;
      }
      
      // Update all filaments using this brand
      db.run('UPDATE filaments SET brand = ?, updated_at = CURRENT_TIMESTAMP WHERE brand = ?', [newName, oldName], function(err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ 
            message: 'Custom brand updated successfully',
            filamentsUpdated: this.changes
          });
        });
      });
    });
  });
});

// Delete custom brand
app.delete('/api/custom-brands/:name', (req, res) => {
  const { name } = req.params;
  
  db.run('DELETE FROM custom_brands WHERE name = ?', [decodeURIComponent(name)], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Custom brand not found' });
      return;
    }
    res.json({ message: 'Custom brand deleted successfully' });
  });
});

// Update custom color
app.put('/api/custom-colors/:name', (req, res) => {
  const { name } = req.params;
  const { newName, newHexCode } = req.body;
  
  if (!newName || !newHexCode) {
    return res.status(400).json({ error: 'New color name and hex code are required' });
  }
  
  const oldName = decodeURIComponent(name);
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Update custom color
    db.run('UPDATE custom_colors SET name = ?, hex_code = ? WHERE name = ?', [newName, newHexCode, oldName], function(err) {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        db.run('ROLLBACK');
        res.status(404).json({ error: 'Custom color not found' });
        return;
      }
      
      // Update all filaments using this color
      db.run('UPDATE filaments SET color = ?, updated_at = CURRENT_TIMESTAMP WHERE color = ?', [newName, oldName], function(err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ 
            message: 'Custom color updated successfully',
            filamentsUpdated: this.changes
          });
        });
      });
    });
  });
});

// Delete custom color
app.delete('/api/custom-colors/:name', (req, res) => {
  const { name } = req.params;
  
  db.run('DELETE FROM custom_colors WHERE name = ?', [decodeURIComponent(name)], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Custom color not found' });
      return;
    }
    res.json({ message: 'Custom color deleted successfully' });
  });
});

// Custom types endpoints
app.get('/api/custom-types', (req, res) => {
  db.all('SELECT * FROM custom_types ORDER BY name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/custom-types', (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Type name is required' });
  }
  
  db.run('INSERT INTO custom_types (name) VALUES (?)', [name], function(err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(409).json({ error: 'Type already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.json({ id: this.lastID, name, message: 'Custom type added successfully' });
  });
});

// Update custom type
app.put('/api/custom-types/:name', (req, res) => {
  const { name } = req.params;
  const { newName } = req.body;
  
  if (!newName) {
    return res.status(400).json({ error: 'New type name is required' });
  }
  
  const oldName = decodeURIComponent(name);
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Update custom type
    db.run('UPDATE custom_types SET name = ? WHERE name = ?', [newName, oldName], function(err) {
      if (err) {
        db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        db.run('ROLLBACK');
        res.status(404).json({ error: 'Custom type not found' });
        return;
      }
      
      // Update all filaments using this type
      db.run('UPDATE filaments SET type = ?, updated_at = CURRENT_TIMESTAMP WHERE type = ?', [newName, oldName], function(err) {
        if (err) {
          db.run('ROLLBACK');
          res.status(500).json({ error: err.message });
          return;
        }
        
        db.run('COMMIT', (err) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
          res.json({ 
            message: 'Custom type updated successfully',
            filamentsUpdated: this.changes
          });
        });
      });
    });
  });
});

// Delete custom type
app.delete('/api/custom-types/:name', (req, res) => {
  const { name } = req.params;
  
  db.run('DELETE FROM custom_types WHERE name = ?', [decodeURIComponent(name)], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Custom type not found' });
      return;
    }
    res.json({ message: 'Custom type deleted successfully' });
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for K8s
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Filament Tracker server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});
