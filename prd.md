<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistem Konversi Jadwal Absensi</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js"></script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f3f4f6;
        }
        /* Custom scrollbar for tables */
        .table-container::-webkit-scrollbar {
            height: 8px;
            width: 8px;
        }
        .table-container::-webkit-scrollbar-track {
            background: #f1f1f1; 
        }
        .table-container::-webkit-scrollbar-thumb {
            background: #cbd5e1; 
            border-radius: 4px;
        }
        .table-container::-webkit-scrollbar-thumb:hover {
            background: #94a3b8; 
        }
    </style>
</head>
<body class="p-6 text-gray-800">

    <div class="max-w-6xl mx-auto space-y-6">
        
        <!-- Header -->
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
                <h1 class="text-2xl font-bold text-gray-800">Konversi Jadwal Absensi</h1>
                <p class="text-sm text-gray-500">Ubah jadwal harian menjadi format sistem upload</p>
            </div>
            <button onclick="exportToExcel()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
                Export Excel
            </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div class="lg:col-span-1 space-y-6">
                <!-- Master Project -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 class="text-lg font-semibold mb-4 border-b pb-2">1. Master Project</h2>
                    
                    <div class="flex gap-2 mb-4">
                        <input type="text" id="newProjectName" placeholder="Nama Project Baru" class="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <button onclick="addProject()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition">Tambah</button>
                    </div>

                    <div class="mb-2">
                        <label class="block text-xs font-medium text-gray-600 mb-1">Pilih Project Aktif:</label>
                        <select id="projectSelect" onchange="loadProjectLegends()" class="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                            <!-- Options populated by JS -->
                        </select>
                    </div>
                </div>

                <!-- Legenda Absensi -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div class="flex justify-between items-center mb-4 border-b pb-2">
                        <h2 class="text-lg font-semibold">2. Legenda Absensi</h2>
                        <span id="activeProjectLabel" class="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded"></span>
                    </div>

                    <form id="legendForm" onsubmit="addLegend(event)" class="space-y-3 mb-4">
                        <div class="grid grid-cols-3 gap-2">
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Kode</label>
                                <input type="text" id="legCode" required placeholder="P" class="w-full border rounded px-2 py-1.5 text-sm uppercase">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Masuk (HH:MM)</label>
                                <input type="time" id="legIn" required class="w-full border rounded px-2 py-1.5 text-sm">
                            </div>
                            <div>
                                <label class="block text-xs text-gray-500 mb-1">Pulang (HH:MM)</label>
                                <input type="time" id="legOut" required class="w-full border rounded px-2 py-1.5 text-sm">
                            </div>
                        </div>
                        <button type="submit" class="w-full bg-gray-800 hover:bg-gray-900 text-white py-2 rounded-lg text-sm font-medium transition">Simpan Legenda</button>
                    </form>

                    <div class="table-container overflow-x-auto max-h-48 border rounded-lg">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                                <tr>
                                    <th class="px-3 py-2">Kode</th>
                                    <th class="px-3 py-2">Jam Masuk</th>
                                    <th class="px-3 py-2">Jam Pulang</th>
                                    <th class="px-3 py-2 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="legendTableBody" class="divide-y">
                                <!-- Legend rows -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="lg:col-span-2 space-y-6">
                <!-- Input Data Jadwal -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div class="flex justify-between items-center mb-4 border-b pb-2">
                        <h2 class="text-lg font-semibold">3. Input Data Jadwal</h2>
                        <div class="flex gap-2">
                            <button onclick="downloadTemplate()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition border border-gray-300">Download Template</button>
                            <button onclick="processData()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition shadow-sm">Proses Konversi</button>
                        </div>
                    </div>

                    <div id="quickLegend" class="mb-4 text-xs text-gray-600 flex gap-2 flex-wrap items-center bg-blue-50 p-2.5 rounded-lg border border-blue-100">
                        <!-- Legends populated by JS -->
                    </div>

                    <div class="flex border-b border-gray-200 mb-4">
                        <button onclick="switchTab('upload')" id="btnTabUpload" class="py-2 px-4 border-b-2 border-indigo-600 text-indigo-600 font-medium text-sm transition">Upload File Excel</button>
                        <button onclick="switchTab('manual')" id="btnTabManual" class="py-2 px-4 border-b-2 border-transparent text-gray-500 hover:text-gray-700 font-medium text-sm transition">Input Manual (Sistem)</button>
                    </div>

                    <!-- Tab Content: Upload Excel -->
                    <div id="tabContentUpload" class="block">
                        <div class="mb-6 p-6 border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50 text-center relative hover:bg-indigo-100 transition">
                            <input type="file" id="fileUpload" accept=".xlsx, .xls" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange="handleFileUpload(event)">
                            
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto text-indigo-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p class="text-base font-semibold text-indigo-800">Klik atau Drag & Drop "format input jadwal_2.xlsx"</p>
                            <p class="text-sm text-indigo-600 mt-1">Format Matrix: <b>NIK</b>, <b>Nama</b>, dan kolom-kolom berikutnya adalah <b>Tanggal</b></p>
                        </div>
                    </div>

                    <!-- Tab Content: Manual Input -->
                    <div id="tabContentManual" class="hidden mb-6">
                        <div class="flex gap-2 items-center mb-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <label class="text-sm font-medium text-gray-700">Pilih Periode:</label>
                            <input type="month" id="manualMonthPicker" class="border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 bg-white">
                            <button onclick="initManualGrid()" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition shadow-sm">Buat Grid Kalender</button>
                        </div>
                        
                        <div id="manualGridContainer" class="hidden">
                            <div class="table-container overflow-x-auto max-h-96 border rounded-lg bg-white mb-3 shadow-sm relative">
                                <table class="w-full text-sm text-left whitespace-nowrap">
                                    <thead class="text-xs text-gray-700 bg-gray-200 sticky top-0 z-20">
                                        <tr id="manualGridHeaderRow">
                                            <!-- Headers populated by JS -->
                                        </tr>
                                    </thead>
                                    <tbody id="manualGridBody" class="divide-y">
                                        <!-- Rows populated by JS -->
                                    </tbody>
                                </table>
                            </div>
                            <div class="flex justify-between items-center">
                                <button onclick="addManualRow()" class="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                                    </svg>
                                    Tambah Karyawan
                                </button>
                                <button onclick="saveManualData()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">Simpan Data ke Preview</button>
                            </div>
                        </div>
                    </div>

                    <div class="table-container overflow-x-auto max-h-64 border rounded-lg">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                                <tr>
                                    <th class="px-4 py-3">NIK</th>
                                    <th class="px-4 py-3">Nama</th>
                                    <th class="px-4 py-3">Tanggal</th>
                                    <th class="px-4 py-3 text-center">Kode Jadwal</th>
                                </tr>
                            </thead>
                            <tbody id="importedTableBody" class="divide-y">
                                <!-- Imported rows -->
                            </tbody>
                        </table>
                        <div id="emptyImportMsg" class="text-center py-8 text-gray-500 text-sm">
                            Belum ada data jadwal yang diupload.
                        </div>
                    </div>
                </div>

                <!-- Preview Hasil Konversi -->
                <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 class="text-lg font-semibold mb-4 border-b pb-2">4. Preview Hasil Konversi</h2>
                    
                    <div class="table-container overflow-x-auto max-h-64 border rounded-lg">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-white uppercase bg-gray-800 sticky top-0">
                                <tr>
                                    <th class="px-4 py-3">Date (M/D/YYYY)</th>
                                    <th class="px-4 py-3">Employee NIK</th>
                                    <th class="px-4 py-3">Schedule Code</th>
                                </tr>
                            </thead>
                            <tbody id="resultTableBody" class="divide-y bg-gray-50">
                                <!-- Result rows -->
                            </tbody>
                        </table>
                        <div id="emptyResultMsg" class="text-center py-8 text-gray-500 text-sm">
                            Klik "Proses Konversi" untuk melihat hasil.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // State Management
        let projects = {
            'Default Project': {
                name: 'Default Project',
                legends: [
                    { code: 'P', in: '07:00', out: '15:00' },
                    { code: 'M', in: '15:00', out: '23:00' },
                    { code: 'L', in: '23:00', out: '07:00' }
                ]
            }
        };
        let activeProjectName = 'Default Project';
        let importedScheduleData = []; // { nik, nama, tanggal, kode }
        let convertedData = []; // { date, nik, scheduleCode }

        let currentManualMonth = '';
        let currentManualYear = '';
        let manualDaysCount = 0;

        function initApp() {
            updateProjectSelect();
            loadProjectLegends();
            
            // Set default month to current local month
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            document.getElementById('manualMonthPicker').value = `${yyyy}-${mm}`;
        }

        function updateProjectSelect() {
            const select = document.getElementById('projectSelect');
            select.innerHTML = '';
            for (const pName in projects) {
                const option = document.createElement('option');
                option.value = pName;
                option.textContent = pName;
                if (pName === activeProjectName) option.selected = true;
                select.appendChild(option);
            }
        }

        function addProject() {
            const input = document.getElementById('newProjectName');
            const name = input.value.trim();
            if (name && !projects[name]) {
                projects[name] = { name: name, legends: [] };
                activeProjectName = name;
                input.value = '';
                updateProjectSelect();
                loadProjectLegends();
            } else if (projects[name]) {
                showMessage("Project dengan nama tersebut sudah ada.");
            }
        }

        function loadProjectLegends() {
            activeProjectName = document.getElementById('projectSelect').value;
            document.getElementById('activeProjectLabel').textContent = activeProjectName;
            renderLegendTable();
            renderQuickLegend();
        }

        function renderQuickLegend() {
            const container = document.getElementById('quickLegend');
            const legends = projects[activeProjectName].legends;
            if(legends.length === 0) {
                container.innerHTML = '<span class="text-red-500 font-medium">Belum ada legenda absen pada project ini.</span>';
                return;
            }
            container.innerHTML = '<strong class="text-blue-800 flex-shrink-0">Kode Tersedia:</strong> ' + legends.map(l => 
                `<span class="bg-white border border-gray-200 px-2 py-0.5 rounded shadow-sm text-gray-800 font-mono text-[11px]">${l.code} (${l.in}-${l.out})</span>`
            ).join('');
        }

        function addLegend(e) {
            e.preventDefault();
            const codeInput = document.getElementById('legCode').value.trim().toUpperCase();
            const inInput = document.getElementById('legIn').value;
            const outInput = document.getElementById('legOut').value;

            if (!codeInput || !inInput || !outInput) return;

            const currentLegends = projects[activeProjectName].legends;
            
            // Check if code exists
            const existingIndex = currentLegends.findIndex(l => l.code === codeInput);
            if (existingIndex >= 0) {
                currentLegends[existingIndex] = { code: codeInput, in: inInput, out: outInput };
            } else {
                currentLegends.push({ code: codeInput, in: inInput, out: outInput });
            }

            // Clear form
            document.getElementById('legCode').value = '';
            document.getElementById('legIn').value = '';
            document.getElementById('legOut').value = '';

            renderLegendTable();
        }

        function deleteLegend(code) {
            const currentLegends = projects[activeProjectName].legends;
            projects[activeProjectName].legends = currentLegends.filter(l => l.code !== code);
            renderLegendTable();
        }

        function renderLegendTable() {
            const tbody = document.getElementById('legendTableBody');
            tbody.innerHTML = '';
            const legends = projects[activeProjectName].legends;

            if (legends.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-4 text-center text-gray-500 text-xs">Belum ada legenda untuk project ini.</td></tr>`;
                return;
            }

            legends.forEach(l => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="px-3 py-2 font-medium">${l.code}</td>
                    <td class="px-3 py-2">${l.in}</td>
                    <td class="px-3 py-2">${l.out}</td>
                    <td class="px-3 py-2 text-center">
                        <button onclick="deleteLegend('${l.code}')" class="text-red-500 hover:text-red-700 text-xs font-medium">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function downloadTemplate() {
            // Format Template Matrix (Crosstab)
            const templateData = [
                { "NIK": "123456", "Nama": "Budi", "2026-08-01": "P", "2026-08-02": "M", "2026-08-03": "L" },
                { "NIK": "654321", "Nama": "Siti", "2026-08-01": "M", "2026-08-02": "P", "2026-08-03": "P" }
            ];
            const worksheet = XLSX.utils.json_to_sheet(templateData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Jadwal");
            XLSX.writeFile(workbook, "format input jadwal_2.xlsx");
        }

        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array', cellDates: true});
                    
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert Excel to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
                    
                    importedScheduleData = [];

                    jsonData.forEach(row => {
                        // Cari key NIK dan Nama dengan mengabaikan huruf besar/kecil
                        const nikKey = Object.keys(row).find(k => k.toLowerCase() === 'nik' || k.toLowerCase() === 'employee nik');
                        const namaKey = Object.keys(row).find(k => k.toLowerCase() === 'nama' || k.toLowerCase() === 'name');
                        
                        const nik = nikKey ? row[nikKey] : null;
                        const nama = namaKey ? row[namaKey] : '-';

                        if (nik && String(nik).trim() !== '') {
                            // Iterasi semua kolom SELAIN NIK dan Nama (yang artinya merupakan kolom Tanggal)
                            Object.keys(row).forEach(key => {
                                if (key !== nikKey && key !== namaKey) {
                                    const kode = row[key];
                                    // Abaikan jika sel/tanggal tersebut tidak diisi (libur)
                                    if (kode && String(kode).trim() !== '') {
                                        importedScheduleData.push({
                                            nik: String(nik).trim(),
                                            nama: String(nama).trim(),
                                            tanggal: String(key).trim(), // Header kolom dianggap sebagai tanggal
                                            kode: String(kode).trim().toUpperCase()
                                        });
                                    }
                                }
                            });
                        }
                    });

                    if (importedScheduleData.length === 0) {
                        showMessage("Gagal membaca data. Pastikan ada kolom NIK, Nama, dan kolom tanggal (klik Download Template untuk contoh).", true);
                    } else {
                        renderImportedTable();
                        showMessage(`Berhasil memuat ${importedScheduleData.length} slot jadwal (hasil unpivot) dari file Excel.`);
                    }
                } catch (error) {
                    console.error("Error reading file:", error);
                    showMessage("Terjadi kesalahan saat membaca file Excel.", true);
                }
                
                // Reset file input agar bisa upload file yang sama berkali-kali jika diperlukan
                event.target.value = "";
            };
            reader.readAsArrayBuffer(file);
        }

        function renderImportedTable() {
            const tbody = document.getElementById('importedTableBody');
            const emptyMsg = document.getElementById('emptyImportMsg');
            tbody.innerHTML = '';
            
            if (importedScheduleData.length === 0) {
                emptyMsg.classList.remove('hidden');
            } else {
                emptyMsg.classList.add('hidden');
                
                // Display max 100 rows for performance in preview
                const displayData = importedScheduleData.slice(0, 100);
                
                displayData.forEach(d => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-gray-50 transition';
                    tr.innerHTML = `
                        <td class="px-4 py-2 border-r border-gray-100">${d.nik}</td>
                        <td class="px-4 py-2 border-r border-gray-100">${d.nama}</td>
                        <td class="px-4 py-2 border-r border-gray-100">${d.tanggal}</td>
                        <td class="px-4 py-2 text-center text-indigo-700 font-bold">${d.kode}</td>
                    `;
                    tbody.appendChild(tr);
                });

                if (importedScheduleData.length > 100) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td colspan="4" class="px-4 py-3 text-center text-xs text-gray-500 italic bg-gray-50">Menampilkan 100 baris pertama dari total ${importedScheduleData.length} baris.</td>`;
                    tbody.appendChild(tr);
                }
            }
        }

        function formatDateForExcel(dateStr) {
            // Cek jika header dibaca sebagai Excel Serial Number oleh sheetJS
            let d;
            if (!isNaN(dateStr) && !isNaN(parseFloat(dateStr))) {
                d = new Date(Math.round((parseFloat(dateStr) - 25569) * 86400 * 1000));
            } else {
                // Konversi format umum string date ke object Date
                d = new Date(dateStr);
            }
            
            // Jika parsing gagal, kembalikan string aslinya
            if (isNaN(d)) return dateStr; 
            
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }

        function processData() {
            if (importedScheduleData.length === 0) {
                showMessage("Tidak ada data jadwal untuk diproses. Silahkan upload file Excel terlebih dahulu.", true);
                return;
            }

            const currentLegends = projects[activeProjectName].legends;
            if (currentLegends.length === 0) {
                showMessage(`Project '${activeProjectName}' tidak memiliki legenda absensi. Silahkan tambahkan terlebih dahulu.`);
                return;
            }

            convertedData = [];
            let errors = [];

            // Loop through imported Excel data
            importedScheduleData.forEach((entry, index) => {
                const legend = currentLegends.find(l => l.code === entry.kode);
                
                if (legend) {
                    // S + Jam Masuk (tanpa titik2) + Jam Pulang (tanpa titik2)
                    const inTimeRaw = legend.in.replace(':', '');
                    const outTimeRaw = legend.out.replace(':', '');
                    const scheduleCode = `S${inTimeRaw}${outTimeRaw}`;

                    convertedData.push({
                        Date: formatDateForExcel(entry.tanggal),
                        EmployeeNIK: entry.nik,
                        ScheduleCode: scheduleCode
                    });
                } else {
                    errors.push(`Baris Excel ke-${index + 2} (NIK: ${entry.nik}, Tgl: ${entry.tanggal}): Kode '${entry.kode}' tidak ditemukan di Legenda.`);
                }
            });

            // Sort by Date then NIK for neatness
            convertedData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

            renderResultTable();

            if (errors.length > 0) {
                showMessage(`Berhasil mengkonversi ${convertedData.length} data jadwal.\n\nGagal ${errors.length} data karena kode tidak sesuai:\n` + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...' : ''), true);
            } else {
                showMessage(`Berhasil memproses & mengkonversi ${convertedData.length} baris jadwal ke format sistem upload! Lanjutkan dengan Export Excel.`);
            }
        }

        function renderResultTable() {
            const tbody = document.getElementById('resultTableBody');
            const emptyMsg = document.getElementById('emptyResultMsg');
            tbody.innerHTML = '';

            if (convertedData.length === 0) {
                emptyMsg.classList.remove('hidden');
            } else {
                emptyMsg.classList.add('hidden');
                convertedData.forEach(d => {
                    const tr = document.createElement('tr');
                    tr.className = 'hover:bg-gray-100';
                    tr.innerHTML = `
                        <td class="px-4 py-2 border-r border-gray-200">${d.Date}</td>
                        <td class="px-4 py-2 border-r border-gray-200">${d.EmployeeNIK}</td>
                        <td class="px-4 py-2 text-indigo-700 font-mono font-medium">${d.ScheduleCode}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        function exportToExcel() {
            if (convertedData.length === 0) {
                showMessage("Tidak ada data hasil konversi untuk diexport. Silahkan klik 'Proses Konversi' terlebih dahulu.");
                return;
            }

            // Create a worksheet from the data
            // We use an array of objects, SheetJS will use keys as headers
            const worksheetData = convertedData.map(item => ({
                'Date': item.Date,
                'Employee NIK': item.EmployeeNIK,
                'Schedule Code': item.ScheduleCode
            }));

            try {
                // Create a new workbook
                const workbook = XLSX.utils.book_new();
                
                // Convert JSON data to sheet
                const worksheet = XLSX.utils.json_to_sheet(worksheetData);
                
                // Append sheet to workbook
                XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule_Upload");
                
                // Generate file name
                const today = new Date();
                const dateString = `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
                const fileName = `Upload_Jadwal_${activeProjectName.replace(/\s+/g, '_')}_${dateString}.xlsx`;
                
                // Write and trigger download
                XLSX.writeFile(workbook, fileName);
            } catch (error) {
                console.error("Error generating Excel:", error);
                showMessage("Terjadi kesalahan saat membuat file Excel. Pastikan library termuat dengan benar.");
            }
        }

        // Utility Message Box
        function showMessage(msg, isWarning = false) {
            // Using a simple custom modal/alert replacement
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            
            const box = document.createElement('div');
            box.className = 'bg-white p-6 rounded-xl shadow-xl max-w-sm w-full mx-4';
            
            const title = document.createElement('h3');
            title.className = `text-lg font-bold mb-2 ${isWarning ? 'text-orange-600' : 'text-gray-800'}`;
            title.textContent = isWarning ? 'Peringatan' : 'Informasi';
            
            const content = document.createElement('p');
            content.className = 'text-sm text-gray-600 whitespace-pre-wrap mb-4';
            content.textContent = msg;
            
            const btn = document.createElement('button');
            btn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium';
            btn.textContent = 'Tutup';
            btn.onclick = () => document.body.removeChild(overlay);
            
            box.appendChild(title);
            box.appendChild(content);
            box.appendChild(btn);
            overlay.appendChild(box);
            document.body.appendChild(overlay);
        }

        function switchTab(tabId) {
            const tabUpload = document.getElementById('tabContentUpload');
            const tabManual = document.getElementById('tabContentManual');
            const btnUpload = document.getElementById('btnTabUpload');
            const btnManual = document.getElementById('btnTabManual');

            if (tabId === 'upload') {
                tabUpload.classList.remove('hidden');
                tabUpload.classList.add('block');
                tabManual.classList.remove('block');
                tabManual.classList.add('hidden');
                
                btnUpload.classList.add('border-indigo-600', 'text-indigo-600');
                btnUpload.classList.remove('border-transparent', 'text-gray-500');
                btnManual.classList.remove('border-indigo-600', 'text-indigo-600');
                btnManual.classList.add('border-transparent', 'text-gray-500');
            } else {
                tabManual.classList.remove('hidden');
                tabManual.classList.add('block');
                tabUpload.classList.remove('block');
                tabUpload.classList.add('hidden');
                
                btnManual.classList.add('border-indigo-600', 'text-indigo-600');
                btnManual.classList.remove('border-transparent', 'text-gray-500');
                btnUpload.classList.remove('border-indigo-600', 'text-indigo-600');
                btnUpload.classList.add('border-transparent', 'text-gray-500');
            }
        }

        function initManualGrid() {
            const monthInput = document.getElementById('manualMonthPicker').value;
            if(!monthInput) {
                showMessage("Silakan pilih periode bulan dan tahun terlebih dahulu.", true);
                return;
            }
            const [year, month] = monthInput.split('-');
            currentManualYear = year;
            currentManualMonth = month;
            // Menghitung jumlah hari pada bulan yang dipilih
            manualDaysCount = new Date(year, month, 0).getDate(); 

            renderManualGridHeaders();
            const tbody = document.getElementById('manualGridBody');
            tbody.innerHTML = '';
            
            // Tambahkan 3 baris kosong secara default sebagai pancingan
            addManualRow();
            addManualRow();
            addManualRow();
            
            document.getElementById('manualGridContainer').classList.remove('hidden');
        }

        function renderManualGridHeaders() {
            const tr = document.getElementById('manualGridHeaderRow');
            // NIK dan Nama di-sticky agar tidak hilang saat di-scroll horizontal
            let html = `
                <th class="px-3 py-2 min-w-[120px] bg-gray-200 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">NIK</th>
                <th class="px-3 py-2 min-w-[150px] bg-gray-200 sticky left-[120px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama</th>
            `;
            for(let i=1; i<=manualDaysCount; i++) {
                // Deteksi akhir pekan
                const d = new Date(currentManualYear, parseInt(currentManualMonth)-1, i);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const bgClass = isWeekend ? 'bg-red-100 text-red-700 font-bold' : '';
                
                html += `<th class="px-2 py-2 w-14 text-center ${bgClass}">${i}</th>`;
            }
            tr.innerHTML = html;
        }

        function addManualRow() {
            const tbody = document.getElementById('manualGridBody');
            const tr = document.createElement('tr');
            tr.className = "hover:bg-gray-50";
            
            // Kolom sticky (NIK & Nama)
            let html = `
                <td class="p-1 min-w-[120px] bg-white sticky left-0 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <input type="text" class="w-full border-0 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1.5 text-sm font-medium manual-nik" placeholder="123456">
                </td>
                <td class="p-1 min-w-[150px] bg-white sticky left-[120px] z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <input type="text" class="w-full border-0 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1.5 text-sm manual-nama" placeholder="Nama Karyawan">
                </td>
            `;
            
            // Kotak input kode per hari
            for(let i=1; i<=manualDaysCount; i++) {
                const dateStr = `${currentManualYear}/${currentManualMonth}/${String(i).padStart(2, '0')}`;
                const d = new Date(currentManualYear, parseInt(currentManualMonth)-1, i);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const inputBg = isWeekend ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-100';

                html += `
                    <td class="p-1 min-w-[56px] border-r">
                        <input type="text" class="w-full h-8 border-0 bg-transparent text-center uppercase font-bold text-indigo-700 manual-code ${inputBg} focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded" data-date="${dateStr}" maxlength="3">
                    </td>`;
            }
            tr.innerHTML = html;
            tbody.appendChild(tr);
        }

        function saveManualData() {
            const rows = document.querySelectorAll('#manualGridBody tr');
            let newData = [];
            
            rows.forEach(row => {
                const nik = row.querySelector('.manual-nik').value.trim();
                const nama = row.querySelector('.manual-nama').value.trim();
                
                // Lewati baris jika NIK kosong
                if(!nik) return; 

                const codeInputs = row.querySelectorAll('.manual-code');
                codeInputs.forEach(input => {
                    const kode = input.value.trim().toUpperCase();
                    if(kode) {
                        newData.push({
                            nik: nik,
                            nama: nama || '-',
                            tanggal: input.getAttribute('data-date'),
                            kode: kode
                        });
                    }
                });
            });

            if(newData.length === 0) {
                showMessage("Tidak ada data jadwal yang dapat disimpan. Pastikan NIK dan kotak Kode Jadwal sudah diisi.", true);
                return;
            }

            // Ganti array data jadwal yang ada dengan data dari manual input ini
            importedScheduleData = newData; 
            renderImportedTable();
            
            showMessage(`Berhasil menyimpan ${newData.length} slot jadwal ke antrean.\n\nSilakan cek Tabel Preview di bawah, lalu klik 'Proses Konversi'.`);
        }

        // Initialize on load
        window.onload = initApp;
    </script>
</body>
</html>