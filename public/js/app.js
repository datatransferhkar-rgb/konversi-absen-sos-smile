// Global Application State
let projectsState = [];
let activeProject = null;
let legendsState = [];
let importedScheduleData = []; // [{ nik, nama, tanggal, kode }]
let convertedData = [];         // [{ Date, EmployeeNIK, ScheduleCode }]

// Manual Grid State
let currentManualYear = '';
let currentManualMonth = '';
let manualDaysCount = 0;

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Set default month picker to current year-month
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const monthPicker = document.getElementById('manualMonthPicker');
    if (monthPicker) monthPicker.value = `${yyyy}-${mm}`;

    await loadProjects();
}

// ==================== MASTER PROJECT FUNCTIONS ==================== //

async function loadProjects() {
    try {
        const projects = await ApiService.getProjects();
        if (projects && projects.length > 0) {
            projectsState = projects;
            updateProjectDropdown();
            // Set first project as active
            selectProject(projectsState[0].id);
        } else {
            // Local fallback if DB server not ready or empty
            projectsState = [{ id: 1, name: 'Default Project' }];
            updateProjectDropdown();
            selectProject(1);
        }
    } catch (err) {
        console.error('Gagal memuat projects:', err);
    }
}

function updateProjectDropdown() {
    const select = document.getElementById('projectSelect');
    if (!select) return;

    select.innerHTML = '';
    projectsState.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        select.appendChild(opt);
    });
}

async function onProjectChanged() {
    const select = document.getElementById('projectSelect');
    const projectId = parseInt(select.value, 10);
    await selectProject(projectId);
}

async function selectProject(projectId) {
    activeProject = projectsState.find(p => p.id === projectId) || projectsState[0];
    
    // Update UI elements
    const select = document.getElementById('projectSelect');
    if (select) select.value = activeProject.id;

    const badge = document.getElementById('activeProjectBadge');
    if (badge) badge.textContent = activeProject.name;

    const deleteBtn = document.getElementById('btnDeleteProject');
    if (deleteBtn) {
        // Tampilkan tombol hapus jika bukan satu-satunya project
        if (projectsState.length > 1) {
            deleteBtn.classList.remove('hidden');
        } else {
            deleteBtn.classList.add('hidden');
        }
    }

    // Load Legends for active project from SQLite
    await loadLegends();
}

async function addProject() {
    const input = document.getElementById('newProjectName');
    const name = input.value.trim();
    if (!name) return;

    try {
        const newProj = await ApiService.addProject(name);
        projectsState.push(newProj);
        updateProjectDropdown();
        await selectProject(newProj.id);
        input.value = '';
        showModal('Sukses', `Project '${name}' berhasil dibuat dan disimpan ke SQLite!`);
    } catch (err) {
        showModal('Peringatan', err.message || 'Gagal membuat project.');
    }
}

async function deleteActiveProject() {
    if (!activeProject) return;
    if (projectsState.length <= 1) {
        showModal('Peringatan', 'Minimal harus ada 1 Master Project di database.');
        return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus project '${activeProject.name}'? Data legenda dan jadwal terkait di SQLite akan terhapus.`)) {
        return;
    }

    try {
        await ApiService.deleteProject(activeProject.id);
        projectsState = projectsState.filter(p => p.id !== activeProject.id);
        updateProjectDropdown();
        await selectProject(projectsState[0].id);
        showModal('Sukses', 'Project berhasil dihapus dari SQLite.');
    } catch (err) {
        showModal('Error', err.message || 'Gagal menghapus project.');
    }
}

// ==================== LEGENDA ABSENSI FUNCTIONS ==================== //

async function loadLegends() {
    if (!activeProject) return;
    try {
        const legends = await ApiService.getLegends(activeProject.id);
        if (legends) {
            legendsState = legends.map(l => ({ code: l.code, time_in: l.time_in, time_out: l.time_out }));
        } else {
            legendsState = [
                { code: 'P', time_in: '07:00', time_out: '15:00' },
                { code: 'M', time_in: '15:00', time_out: '23:00' },
                { code: 'L', time_in: '23:00', time_out: '07:00' }
            ];
        }
        renderLegendTable();
        renderQuickLegend();
    } catch (err) {
        console.error('Error loading legends:', err);
    }
}

function renderLegendTable() {
    const tbody = document.getElementById('legendTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (legendsState.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-4 text-center text-slate-400 text-xs">Belum ada legenda absensi untuk project ini.</td></tr>`;
        return;
    }

    legendsState.forEach(l => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        tr.innerHTML = `
            <td class="px-3 py-2 font-bold text-indigo-900 font-mono">${l.code}</td>
            <td class="px-3 py-2 text-slate-700">${l.time_in}</td>
            <td class="px-3 py-2 text-slate-700">${l.time_out}</td>
            <td class="px-3 py-2 text-center">
                <button onclick="deleteLegend('${l.code}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderQuickLegend() {
    const container = document.getElementById('quickLegend');
    if (!container) return;

    if (legendsState.length === 0) {
        container.innerHTML = `<span class="text-rose-500 font-medium">⚠️ Belum ada legenda absensi pada project ini.</span>`;
        return;
    }

    container.innerHTML = `<strong class="text-indigo-900 font-bold flex-shrink-0">Kode Tersedia:</strong> ` +
        legendsState.map(l => 
            `<span class="bg-white border border-indigo-200/80 px-2.5 py-0.5 rounded-lg shadow-sm text-slate-800 font-mono text-[11px] font-semibold">
                ${l.code} <span class="text-indigo-600">(${l.time_in} - ${l.time_out})</span>
            </span>`
        ).join('');
}

async function addLegend(e) {
    e.preventDefault();
    const code = document.getElementById('legCode').value.trim().toUpperCase();
    const time_in = document.getElementById('legIn').value;
    const time_out = document.getElementById('legOut').value;

    if (!code || !time_in || !time_out) return;

    try {
        await ApiService.saveLegend(activeProject.id, { code, time_in, time_out });
        
        // Update local state
        const idx = legendsState.findIndex(l => l.code === code);
        if (idx >= 0) {
            legendsState[idx] = { code, time_in, time_out };
        } else {
            legendsState.push({ code, time_in, time_out });
        }

        renderLegendTable();
        renderQuickLegend();

        document.getElementById('legCode').value = '';
        document.getElementById('legIn').value = '';
        document.getElementById('legOut').value = '';

        showModal('Sukses', `Legenda '${code}' (${time_in} - ${time_out}) tersimpan di SQLite!`);
    } catch (err) {
        showModal('Peringatan', err.message || 'Gagal menyimpan legenda.');
    }
}

async function deleteLegend(code) {
    if (!confirm(`Hapus legenda kode '${code}'?`)) return;

    try {
        await ApiService.deleteLegend(activeProject.id, code);
        legendsState = legendsState.filter(l => l.code !== code);
        renderLegendTable();
        renderQuickLegend();
    } catch (err) {
        showModal('Error', err.message || 'Gagal menghapus legenda.');
    }
}

// ==================== DUAL MODE INPUT JADWAL ==================== //

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
        btnUpload.classList.remove('border-transparent', 'text-slate-500');
        btnManual.classList.remove('border-indigo-600', 'text-indigo-600');
        btnManual.classList.add('border-transparent', 'text-slate-500');
    } else {
        tabManual.classList.remove('hidden');
        tabManual.classList.add('block');
        tabUpload.classList.remove('block');
        tabUpload.classList.add('hidden');

        btnManual.classList.add('border-indigo-600', 'text-indigo-600');
        btnManual.classList.remove('border-transparent', 'text-slate-500');
        btnUpload.classList.remove('border-indigo-600', 'text-indigo-600');
        btnUpload.classList.add('border-transparent', 'text-slate-500');
    }
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const parsed = await parseExcelFile(file);
        if (!parsed || parsed.length === 0) {
            showModal('Peringatan', 'Gagal membaca file. Pastikan ada kolom NIK, Nama, dan Tanggal.');
            return;
        }

        importedScheduleData = parsed;
        renderImportedTable();
        showModal('Berhasil', `Memuat ${importedScheduleData.length} slot jadwal dari file Excel (${file.name}).`);
    } catch (err) {
        console.error('Upload Error:', err);
        showModal('Error', 'Terjadi kesalahan saat membaca file Excel.');
    }

    event.target.value = '';
}

// Manual Calendar Matrix Grid
function initManualGrid() {
    const monthInput = document.getElementById('manualMonthPicker').value;
    if (!monthInput) {
        showModal('Peringatan', 'Silakan pilih bulan dan tahun terlebih dahulu.');
        return;
    }

    const [year, month] = monthInput.split('-');
    currentManualYear = year;
    currentManualMonth = month;
    manualDaysCount = new Date(year, month, 0).getDate();

    renderManualGridHeaders();

    const tbody = document.getElementById('manualGridBody');
    tbody.innerHTML = '';

    // Tambah 3 baris default
    addManualRow();
    addManualRow();
    addManualRow();

    document.getElementById('manualGridContainer').classList.remove('hidden');
}

function renderManualGridHeaders() {
    const tr = document.getElementById('manualGridHeaderRow');
    let html = `
        <th class="px-3 py-2 min-w-[120px] sticky-header-left-1 border-r border-slate-200">NIK</th>
        <th class="px-3 py-2 min-w-[150px] sticky-header-left-2 border-r border-slate-200">Nama</th>
    `;

    for (let i = 1; i <= manualDaysCount; i++) {
        const d = new Date(currentManualYear, parseInt(currentManualMonth) - 1, i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const bgClass = isWeekend ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-700';

        html += `<th class="px-2 py-2 w-14 text-center border-r border-slate-200 ${bgClass}">${i}</th>`;
    }

    tr.innerHTML = html;
}

function addManualRow() {
    const tbody = document.getElementById('manualGridBody');
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';

    let html = `
        <td class="p-1 min-w-[120px] sticky-col-left-1 border-r border-slate-200">
            <input type="text" class="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 text-xs font-semibold manual-nik" placeholder="123456">
        </td>
        <td class="p-1 min-w-[150px] sticky-col-left-2 border-r border-slate-200">
            <input type="text" class="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 text-xs manual-nama" placeholder="Nama Karyawan">
        </td>
    `;

    for (let i = 1; i <= manualDaysCount; i++) {
        const dateStr = `${currentManualYear}/${currentManualMonth}/${String(i).padStart(2, '0')}`;
        const d = new Date(currentManualYear, parseInt(currentManualMonth) - 1, i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const bgClass = isWeekend ? 'bg-rose-50' : '';

        html += `
            <td class="p-1 min-w-[56px] border-r border-slate-200 ${bgClass}">
                <input type="text" class="w-full h-8 border-0 bg-transparent text-center uppercase font-mono font-bold text-indigo-700 manual-code focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded" data-date="${dateStr}" maxlength="3">
            </td>
        `;
    }

    tr.innerHTML = html;
    tbody.appendChild(tr);
}

function saveManualData() {
    const rows = document.querySelectorAll('#manualGridBody tr');
    const newData = [];

    rows.forEach(row => {
        const nikInput = row.querySelector('.manual-nik');
        const namaInput = row.querySelector('.manual-nama');
        if (!nikInput) return;

        const nik = nikInput.value.trim();
        const nama = namaInput.value.trim();
        if (!nik) return;

        const codeInputs = row.querySelectorAll('.manual-code');
        codeInputs.forEach(input => {
            const kode = input.value.trim().toUpperCase();
            if (kode) {
                newData.push({
                    nik: nik,
                    nama: nama || '-',
                    tanggal: input.getAttribute('data-date'),
                    kode: kode
                });
            }
        });
    });

    if (newData.length === 0) {
        showModal('Peringatan', 'Tidak ada data jadwal yang dapat disimpan. Pastikan NIK dan Kode diisi.');
        return;
    }

    importedScheduleData = newData;
    renderImportedTable();
    showModal('Berhasil', `${newData.length} slot jadwal disimpan ke antrean preview.`);
}

function renderImportedTable() {
    const tbody = document.getElementById('importedTableBody');
    const emptyMsg = document.getElementById('emptyImportMsg');
    const countBadge = document.getElementById('importedRowCount');
    if (!tbody) return;

    tbody.innerHTML = '';
    countBadge.textContent = `${importedScheduleData.length} Data`;

    if (importedScheduleData.length === 0) {
        emptyMsg.classList.remove('hidden');
    } else {
        emptyMsg.classList.add('hidden');
        const displayData = importedScheduleData.slice(0, 100);

        displayData.forEach(d => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition';
            tr.innerHTML = `
                <td class="px-4 py-2 border-r border-slate-100 font-semibold text-slate-800">${d.nik}</td>
                <td class="px-4 py-2 border-r border-slate-100 text-slate-600">${d.nama}</td>
                <td class="px-4 py-2 border-r border-slate-100 text-slate-600">${d.tanggal}</td>
                <td class="px-4 py-2 text-center text-indigo-700 font-mono font-bold">${d.kode}</td>
            `;
            tbody.appendChild(tr);
        });

        if (importedScheduleData.length > 100) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="4" class="px-4 py-2.5 text-center text-xs text-slate-500 italic bg-slate-50">Menampilkan 100 baris pertama dari total ${importedScheduleData.length} baris.</td>`;
            tbody.appendChild(tr);
        }
    }
}

// ==================== KONVERSI & RESULT FUNCTIONS ==================== //

function processData() {
    if (importedScheduleData.length === 0) {
        showModal('Peringatan', 'Tidak ada data jadwal untuk diproses. Upload file Excel atau isi grid manual.');
        return;
    }

    if (legendsState.length === 0) {
        showModal('Peringatan', `Project '${activeProject.name}' belum memiliki legenda. Tambahkan terlebih dahulu.`);
        return;
    }

    const { converted, errors } = convertSchedules(importedScheduleData, legendsState);
    convertedData = converted;

    renderResultTable();

    const saveDbBtn = document.getElementById('btnSaveToDb');
    if (convertedData.length > 0) {
        if (saveDbBtn) saveDbBtn.classList.remove('hidden');
    }

    if (errors.length > 0) {
        showModal('Peringatan Konversi', `Berhasil mengkonversi ${convertedData.length} data.\n\nGagal ${errors.length} data karena kode tidak sesuai:\n` + errors.slice(0, 5).join('\n') + (errors.length > 5 ? '\n...' : ''));
    } else {
        showModal('Berhasil', `Berhasil mengkonversi ${convertedData.length} baris jadwal ke format system! Silakan export ke Excel atau simpan ke SQLite.`);
    }
}

function renderResultTable() {
    const tbody = document.getElementById('resultTableBody');
    const emptyMsg = document.getElementById('emptyResultMsg');
    const resultBadge = document.getElementById('resultCountBadge');
    if (!tbody) return;

    tbody.innerHTML = '';
    resultBadge.textContent = `${convertedData.length} Baris Terkonversi`;

    if (convertedData.length === 0) {
        emptyMsg.classList.remove('hidden');
    } else {
        emptyMsg.classList.add('hidden');
        convertedData.forEach(d => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-100 transition';
            tr.innerHTML = `
                <td class="px-4 py-2 border-r border-slate-200 font-medium text-slate-700">${d.Date}</td>
                <td class="px-4 py-2 border-r border-slate-200 font-semibold text-slate-800">${d.EmployeeNIK}</td>
                <td class="px-4 py-2 text-indigo-700 font-mono font-bold">${d.ScheduleCode}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function saveToSQLite() {
    if (!convertedData || convertedData.length === 0) {
        showModal('Peringatan', 'Tidak ada data konversi yang dapat disimpan.');
        return;
    }

    try {
        const items = convertedData.map(c => ({
            nik: c.EmployeeNIK,
            name: '-',
            date: c.Date,
            code: c.originalCode || 'P',
            converted_code: c.ScheduleCode
        }));

        await ApiService.saveSchedules(activeProject.id, items, true);
        showModal('Sukses Database', `${items.length} riwayat jadwal berhasil disimpan permanen ke database SQLite!`);
    } catch (err) {
        showModal('Error Database', err.message || 'Gagal menyimpan ke SQLite.');
    }
}

function exportToExcel() {
    if (convertedData.length === 0) {
        showModal('Peringatan', "Belum ada hasil konversi. Klik '⚡ Proses Konversi' terlebih dahulu.");
        return;
    }
    generateExcelFile(convertedData, activeProject ? activeProject.name : 'Project');
}

// Modal helper dialog
function showModal(title, message) {
    const overlay = document.getElementById('modalOverlay');
    const card = document.getElementById('modalCard');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');

    if (!overlay || !card) return;

    titleEl.textContent = title;
    msgEl.textContent = message;

    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        card.classList.remove('scale-95');
    }, 10);
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    const card = document.getElementById('modalCard');

    if (!overlay || !card) return;

    overlay.classList.add('opacity-0');
    card.classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 200);
}
