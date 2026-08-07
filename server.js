const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static web app frontend from public/
app.use(express.static(path.join(__dirname, 'public')));

// ==================== REST API ENDPOINTS ==================== //

// 1. GET /api/projects - Ambil semua project
app.get('/api/projects', (req, res) => {
    db.all(`SELECT * FROM projects ORDER BY created_at ASC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// 2. POST /api/projects - Tambah project baru
app.post('/api/projects', (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Nama project wajib diisi.' });
    }

    db.run(`INSERT INTO projects (name) VALUES (?)`, [name.trim()], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Project dengan nama tersebut sudah ada.' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ data: { id: this.lastID, name: name.trim() } });
    });
});

// 3. DELETE /api/projects/:id - Hapus project
app.delete('/api/projects/:id', (req, res) => {
    const projectId = req.params.id;
    db.run(`DELETE FROM projects WHERE id = ?`, [projectId], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Project berhasil dihapus', changes: this.changes });
    });
});

// 4. GET /api/projects/:projectId/legends - Ambil legenda absensi per project
app.get('/api/projects/:projectId/legends', (req, res) => {
    const { projectId } = req.params;
    db.all(`SELECT * FROM legends WHERE project_id = ? ORDER BY code ASC`, [projectId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// 5. POST /api/projects/:projectId/legends - Tambah/update legenda absensi
app.post('/api/projects/:projectId/legends', (req, res) => {
    const { projectId } = req.params;
    const { code, time_in, time_out } = req.body;

    if (!code || !time_in || !time_out) {
        return res.status(400).json({ error: 'Kode, Jam Masuk, dan Jam Pulang wajib diisi.' });
    }

    const upperCode = code.trim().toUpperCase();

    db.run(
        `INSERT INTO legends (project_id, code, time_in, time_out)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(project_id, code) DO UPDATE SET time_in = excluded.time_in, time_out = excluded.time_out`,
        [projectId, upperCode, time_in, time_out],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Legenda berhasil disimpan', id: this.lastID, code: upperCode });
        }
    );
});

// 6. DELETE /api/projects/:projectId/legends/:code - Hapus legenda absensi
app.delete('/api/projects/:projectId/legends/:code', (req, res) => {
    const { projectId, code } = req.params;
    db.run(`DELETE FROM legends WHERE project_id = ? AND code = ?`, [projectId, code.toUpperCase()], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Legenda berhasil dihapus', changes: this.changes });
    });
});

// 7. GET /api/projects/:projectId/schedules - Ambil riwayat/data jadwal tersimpan
app.get('/api/projects/:projectId/schedules', (req, res) => {
    const { projectId } = req.params;
    db.all(`SELECT * FROM schedules WHERE project_id = ? ORDER BY date ASC, nik ASC`, [projectId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

// 8. POST /api/projects/:projectId/schedules - Batch save schedules
app.post('/api/projects/:projectId/schedules', (req, res) => {
    const { projectId } = req.params;
    const { items, clearExisting } = req.body; // array of { nik, name, date, code, converted_code }

    if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Data schedules harus berupa array.' });
    }

    db.serialize(() => {
        if (clearExisting) {
            db.run(`DELETE FROM schedules WHERE project_id = ?`, [projectId]);
        }

        const stmt = db.prepare(
            `INSERT INTO schedules (project_id, nik, name, date, code, converted_code) VALUES (?, ?, ?, ?, ?, ?)`
        );

        items.forEach(item => {
            stmt.run(projectId, item.nik, item.name || '-', item.date, item.code, item.converted_code);
        });

        stmt.finalize(err => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: `Berhasil menyimpan ${items.length} data jadwal ke SQLite.` });
        });
    });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Server Konversi Absensi berjalan di http://localhost:${PORT}`);
    console.log(`====================================================`);
});
