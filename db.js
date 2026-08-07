const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Gagal membuka koneksi database SQLite:', err.message);
    } else {
        console.log('Terhubung ke database SQLite:', DB_PATH);
    }
});

// Inisialisasi tabel-tabel database
db.serialize(() => {
    // Tabel Projects
    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabel Legends
    db.run(`
        CREATE TABLE IF NOT EXISTS legends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            time_in TEXT NOT NULL,
            time_out TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, code)
        )
    `);

    // Tabel Schedules (Hasil Import / Input Manual & Hasil Konversi)
    db.run(`
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            nik TEXT NOT NULL,
            name TEXT,
            date TEXT NOT NULL,
            code TEXT NOT NULL,
            converted_code TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            UNIQUE(project_id, nik, date)
        )
    `);

    // Seed Data Default jika belum ada project
    db.get(`SELECT COUNT(*) as count FROM projects`, (err, row) => {
        if (!err && row && row.count === 0) {
            db.run(`INSERT INTO projects (name) VALUES ('Default Project')`, function(err) {
                if (!err) {
                    const defaultProjectId = this.lastID;
                    const defaultLegends = [
                        ['P', '07:00', '15:00'],
                        ['M', '15:00', '23:00'],
                        ['L', '23:00', '07:00']
                    ];
                    const stmt = db.prepare(`INSERT INTO legends (project_id, code, time_in, time_out) VALUES (?, ?, ?, ?)`);
                    defaultLegends.forEach(leg => stmt.run(defaultProjectId, leg[0], leg[1], leg[2]));
                    stmt.finalize();
                    console.log('Seed data default berhasil dibuat.');
                }
            });
        }
    });
});

module.exports = db;
