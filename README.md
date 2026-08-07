# Aplikasi Konversi Jadwal Absensi SOS Smile (SQLite Edition)

Aplikasi **Konversi Jadwal Absensi SOS Smile** adalah sistem manajemen & konversi jadwal harian karyawan menjadi format standar *upload system* (contoh: `P (07:00 - 15:00)` diubah menjadi `S07001500`). 

Aplikasi ini dibangun menggunakan **Node.js, Express, Tailwind CSS, SheetJS**, dan basis data **SQLite** untuk menyimpan master project, legenda absensi, dan riwayat jadwal.

---

## 🌟 Fitur Utama

1. **Penyimpanan SQLite Database (`database.sqlite`)**:
   - Semua project dan legenda absensi tersimpan secara permanen dalam 1 file database lokal.
   - Tidak memerlukan instalasi server database MySQL/PostgreSQL tambahan.

2. **Master Project Management**:
   - Buat, pilih, dan kelola banyak project absensi secara fleksibel.

3. **Legenda Absensi Dinamis**:
   - Pemetaan Kode Shift (contoh: `P`, `M`, `L`, `OFF`) dengan Jam Masuk (`HH:MM`) dan Jam Pulang (`HH:MM`).
   - Format otomatis hasil konversi: `S` + `JamMasuk` + `JamPulang` (contoh: `07:00` - `15:00` -> `S07001500`).

4. **Dual Mode Input Jadwal**:
   - **Upload File Excel**: Mendukung format Crosstab / Matriks (Kolom `NIK`, `Nama`, dan kolom tanggal `1` s/d `31`). Otomatis di-*unpivot* menjadi baris data jadwal.
   - **Input Grid Kalender (Manual)**: Pemilih bulan & tahun, grid input matriks interaktif dengan penanda warna akhir pekan (weekend highlight), dan penambahan baris karyawan dinamis.

5. **Preview & Validasi Real-time**:
   - Menampilkan status konversi dan peringatan apabila ada kode shift yang belum terdaftar di legenda absensi.

6. **Export Excel (.xlsx) Ready**:
   - Menghasilkan file Excel format standar sistem upload dengan header: `Date (M/D/YYYY)`, `Employee NIK`, dan `Schedule Code`.

---

## 🚀 Cara Menjalankan Aplikasi di Lokal

### Prasyarat:
- Node.js (v18 ke atas)

### Langkah-langkah:
1. Jalankan perintah instalasi dependency:
   ```bash
   npm install
   ```

2. Jalankan server aplikasi:
   ```bash
   npm start
   ```

3. Buka browser dan akses:
   ```
   http://localhost:3000
   ```

---

## 📤 Cara Menghubungkan & Upload ke GitHub

Anda dapat menyimpan seluruh kode aplikasi ini ke repository GitHub pribadi maupun tim.

### Langkah-langkah Push ke GitHub:

1. Inisialisasi Git repository di folder ini (jika belum):
   ```bash
   git init
   ```

2. Buat file `.gitignore` (jika belum ada) agar folder `node_modules` tidak ikut di-upload:
   ```bash
   echo "node_modules/" > .gitignore
   ```

3. Tambahkan semua file dan lakukan commit awal:
   ```bash
   git add .
   git commit -m "Initial commit - Konversi Absensi SOS Smile dengan SQLite"
   ```

4. Buat Repository baru di **GitHub** (misal diberi nama: `konversi-absen-sos-smile`).

5. Hubungkan remote repository GitHub dan upload kode Anda:
   ```bash
   git remote add origin https://github.com/USERNAME_ANDA/konversi-absen-sos-smile.git
   git branch -M main
   git push -u origin main
   ```

---

## 📂 Struktur Direktori Proyek

```
/
├── database.sqlite       # File database SQLite (dibuat otomatis saat app berjalan)
├── db.js                 # Handler & skema database SQLite
├── server.js             # Express REST API Server
├── package.json          # Dependency & script NPM
├── public/               # Frontend Web UI
│   ├── index.html        # Antarmuka web utama
│   ├── css/
│   │   └── style.css     # Styling custom & responsive scrollbar
│   └── js/
│       ├── api.js        # Service API client ke SQLite backend
│       ├── excel.js      # Engine pembaca & konversi Excel (SheetJS)
│       └── app.js        # Controller aplikasi & UI matrix grid
├── prd.md                # Spesifikasi kebutuhan aplikasi (PRD)
└── README.md             # Panduan penggunaan & GitHub
```
