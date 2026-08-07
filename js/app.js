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

// Current Active Main Tab ('projects' | 'legends' | 'schedule')
let currentMainTab = 'projects';

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
    switchMainTab('projects');
}

// ==================== MAIN TAB SWITCHING ==================== //

function switchMainTab(tabName) {
    currentMainTab = tabName;

    const viewProjects = document.getElementById('viewTabProjects');
    const viewLegends = document.getElementById('viewTabLegends');
    const viewSchedule = document.getElementById('viewTabSchedule');

    const tabProjectsBtn = document.getElementById('mainTabProjects');
    const tabLegendsBtn = document.getElementById('mainTabLegends');
    const tabScheduleBtn = document.getElementById('mainTabSchedule');

    // Hide all views
    viewProjects.classList.add('hidden');
    viewLegends.classList.add('hidden');
    viewSchedule.classList.add('hidden');

    // Reset button styles
    [tabProjectsBtn, tabLegendsBtn, tabScheduleBtn].forEach(btn => {
        if (btn) {
            btn.classList.remove('border-indigo-600', 'text-indigo-600', 'font-extrabold');
            btn.classList.add('border-transparent', 'text-slate-500', 'font-semibold');
        }
    });

    if (tabName === 'projects') {
        viewProjects.classList.remove('hidden');
        tabProjectsBtn.classList.add('border-indigo-600', 'text-indigo-600', 'font-extrabold');
        tabProjectsBtn.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
        renderProjectList();
    } else if (tabName === 'legends') {
        viewLegends.classList.remove('hidden');
        tabLegendsBtn.classList.add('border-indigo-600', 'text-indigo-600', 'font-extrabold');
        tabLegendsBtn.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
        loadLegends();
    } else if (tabName === 'schedule') {
        viewSchedule.classList.remove('hidden');
        tabScheduleBtn.classList.add('border-indigo-600', 'text-indigo-600', 'font-extrabold');
        tabScheduleBtn.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
        loadLegends();
    }
}

// ==================== MASTER PROJECT FUNCTIONS ==================== //

async function loadProjects() {
    try {
        const projects = await ApiService.getProjects();
        if (projects && projects.length > 0) {
            projectsState = projects;
        } else {
            // Local fallback if DB server empty
            projectsState = [{ id: 1, name: 'Default Project', created_at: new Date().toISOString() }];
        }
        updateProjectDropdowns();
        if (!activeProject && projectsState.length > 0) {
            activeProject = projectsState[0];
        }
        renderProjectList();
    } catch (err) {
        console.error('Gagal memuat projects:', err);
    }
}

function updateProjectDropdowns() {
    const legendSelect = document.getElementById('legendProjectSelect');
    const scheduleSelect = document.getElementById('scheduleProjectSelect');

    [legendSelect, scheduleSelect].forEach(select => {
        if (!select) return;
        select.innerHTML = '';
        projectsState.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            if (activeProject && p.id === activeProject.id) opt.selected = true;
            select.appendChild(opt);
        });
    });
}

function renderProjectList() {
    const tbody = document.getElementById('projectListBody');
    const badge = document.getElementById('projectCountBadge');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (badge) badge.textContent = `${projectsState.length} Project`;

    if (projectsState.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-4 text-center text-slate-400 text-xs">Belum ada project terdaftar. Silakan tambah project baru di atas.</td></tr>`;
        return;
    }

    projectsState.forEach(p => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        const isSelected = activeProject && activeProject.id === p.id;
        const activeTag = isSelected ? `<span class="ml-2 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">Aktif</span>` : '';

        tr.innerHTML = `
            <td class="px-4 py-3 font-mono font-bold text-slate-500">#${p.id}</td>
            <td class="px-4 py-3 font-bold text-slate-900 flex items-center">
                ${p.name} ${activeTag}
            </td>
            <td class="px-4 py-3 text-center space-x-1 whitespace-nowrap">
                <button onclick="openProjectLegends(${p.id})" class="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg text-xs font-bold transition border border-indigo-100">
                    📋 Legenda Shift
                </button>
                <button onclick="openProjectSchedule(${p.id})" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-xs font-bold transition border border-emerald-100">
                    ⚡ Input Jadwal
                </button>
                <button onclick="deleteProjectById(${p.id})" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded-lg text-xs font-bold transition border border-rose-100" title="Hapus Project">
                    Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function onLegendProjectChanged() {
    const select = document.getElementById('legendProjectSelect');
    const projectId = parseInt(select.value, 10);
    activeProject = projectsState.find(p => p.id === projectId) || projectsState[0];
    updateProjectDropdowns();
    await loadLegends();
}

async function onScheduleProjectChanged() {
    const select = document.getElementById('scheduleProjectSelect');
    const projectId = parseInt(select.value, 10);
    activeProject = projectsState.find(p => p.id === projectId) || projectsState[0];
    updateProjectDropdowns();
    await loadLegends();
}

async function openProjectLegends(projectId) {
    activeProject = projectsState.find(p => p.id === projectId) || projectsState[0];
    updateProjectDropdowns();
    switchMainTab('legends');
}

async function openProjectSchedule(projectId) {
    activeProject = projectsState.find(p => p.id === projectId) || projectsState[0];
    updateProjectDropdowns();
    switchMainTab('schedule');
}

async function addProject() {
    const input = document.getElementById('newProjectName');
    const name = input.value.trim();
    if (!name) return;

    try {
        const newProj = await ApiService.addProject(name);
        projectsState.push(newProj);
        activeProject = newProj;
        updateProjectDropdowns();
        renderProjectList();
        input.value = '';
        showModal('Sukses', `Project '${name}' berhasil ditambahkan ke daftar Master Project!`);
    } catch (err) {
        showModal('Peringatan', err.message || 'Gagal membuat project.');
    }
}

async function deleteProjectById(projectId) {
    const proj = projectsState.find(p => p.id === projectId);
    if (!proj) return;

    if (projectsState.length <= 1) {
        showModal('Peringatan', 'Minimal harus ada 1 Master Project.');
        return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus project '${proj.name}'? Data legenda dan jadwal terkait akan terhapus.`)) {
        return;
    }

    try {
        await ApiService.deleteProject(projectId);
        projectsState = projectsState.filter(p => p.id !== projectId);
        if (activeProject && activeProject.id === projectId) {
            activeProject = projectsState[0];
        }
        updateProjectDropdowns();
        renderProjectList();
        showModal('Sukses', `Project '${proj.name}' berhasil dihapus.`);
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
            <td class="px-4 py-2.5 font-bold text-indigo-900 font-mono">${l.code}</td>
            <td class="px-4 py-2.5 text-slate-700 font-medium">${l.time_in}</td>
            <td class="px-4 py-2.5 text-slate-700 font-medium">${l.time_out}</td>
            <td class="px-4 py-2.5 text-center">
                <button onclick="deleteLegend('${l.code}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderQuickLegend() {
    const containerTab2 = document.getElementById('quickLegendTab2');
    const containerTab3 = document.getElementById('quickLegendTab3');

    const htmlContent = legendsState.length === 0
        ? `<span class="text-rose-500 font-medium">⚠️ Belum ada legenda absensi pada project ini.</span>`
        : `<strong class="text-indigo-900 font-bold flex-shrink-0">Kode Tersedia:</strong> ` +
          legendsState.map(l => 
            `<span class="bg-white border border-indigo-200/80 px-2.5 py-0.5 rounded-lg shadow-sm text-slate-800 font-mono text-[11px] font-semibold">
                ${l.code} <span class="text-indigo-600">(${l.time_in} - ${l.time_out})</span>
            </span>`
          ).join('');

    if (containerTab2) containerTab2.innerHTML = htmlContent;
    if (containerTab3) containerTab3.innerHTML = htmlContent;
}

async function addLegend(e) {
    e.preventDefault();
    const code = document.getElementById('legCode').value.trim().toUpperCase();
    const time_in = document.getElementById('legIn').value;
    const time_out = document.getElementById('legOut').value;

    if (!code || !time_in || !time_out) return;

    try {
        await ApiService.saveLegend(activeProject.id, { code, time_in, time_out });
        
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

        showModal('Sukses', `Legenda '${code}' (${time_in} - ${time_out}) tersimpan untuk project ${activeProject.name}!`);
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

function switchSubTab(tabId) {
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
        showModal('Peringatan', `Project '${activeProject.name}' belum memiliki legenda. Tambahkan legenda di Tab 2 terlebih dahulu.`);
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
        showModal('Berhasil', `Berhasil mengkonversi ${convertedData.length} baris jadwal ke format system! Silakan export ke Excel atau simpan data.`);
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
        showModal('Sukses Database', `${items.length} riwayat jadwal berhasil disimpan untuk project ${activeProject.name}!`);
    } catch (err) {
        showModal('Error Database', err.message || 'Gagal menyimpan data.');
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
