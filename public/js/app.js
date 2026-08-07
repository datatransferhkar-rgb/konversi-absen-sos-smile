// Global Application State
let projectsState = [];
let activeProject = null;
let legendsState = [];
let importedScheduleData = []; // [{ nik, nama, tanggal, kode }]
let convertedData = [];         // [{ Date, EmployeeNIK, EmployeeNama, ScheduleCode }]
let savedSchedulesHistory = []; // [{ date, nik, name, code, converted_code }]

// Manual Grid State
let currentManualYear = '';
let currentManualMonth = '';
let manualDaysCount = 0;

// Initialize Application when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function initApp() {
    // Set default month picker to current year-month
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const monthPicker = document.getElementById('manualMonthPicker');
    if (monthPicker) monthPicker.value = `${yyyy}-${mm}`;

    await loadProjects();
}

// Helper to extract period key (e.g., '2026-08') and label (e.g., 'Agustus 2026') from date string
function getPeriodInfo(dateStr) {
    if (!dateStr) return { key: 'UNKNOWN', label: 'Lainnya' };

    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        // Fallback parse M/D/YYYY or YYYY/MM/DD
        const parts = String(dateStr).split(/[\/\-]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                // YYYY/MM/DD
                d = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
            } else {
                // M/D/YYYY
                d = new Date(parts[2], parseInt(parts[0]) - 1, parts[1]);
            }
        }
    }

    if (isNaN(d.getTime())) return { key: 'UNKNOWN', label: 'Lainnya' };

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const monthName = monthNames[d.getMonth()];
    return {
        key: `${yyyy}-${mm}`,
        label: `${monthName} ${yyyy}`
    };
}

// Helper to normalize date string format for comparison
function normalizeDateStr(dStr) {
    if (!dStr) return '';
    const str = String(dStr).trim();
    return formatDateForSystem(str);
}

// ==================== MASTER PROJECT DASHBOARD ==================== //

async function loadProjects() {
    try {
        const projects = await ApiService.getProjects();
        if (projects && Array.isArray(projects) && projects.length > 0) {
            projectsState = projects;
        } else {
            projectsState = [{ id: 1, name: 'Default Project', created_at: new Date().toISOString() }];
        }
    } catch (err) {
        console.error('Gagal memuat projects:', err);
        projectsState = [{ id: 1, name: 'Default Project', created_at: new Date().toISOString() }];
    }

    if (!activeProject && projectsState.length > 0) {
        activeProject = projectsState[0];
    }
    await renderProjectList();
}

async function renderProjectList() {
    const tbody = document.getElementById('projectListBody');
    const badge = document.getElementById('projectCountBadge');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (badge) badge.textContent = `${projectsState.length} Project`;

    if (!projectsState || projectsState.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-slate-400 text-xs">Belum ada project terdaftar. Silakan tambah project baru di atas.</td></tr>`;
        return;
    }

    // Fetch legend counts for each project
    for (const p of projectsState) {
        const legends = await ApiService.getLegends(p.id);
        const legendCount = legends ? legends.length : 0;

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        tr.innerHTML = `
            <td class="px-4 py-3.5 font-mono font-bold text-slate-500">#${p.id}</td>
            <td class="px-4 py-3.5 font-bold text-slate-900">
                ${p.name}
            </td>
            <td class="px-4 py-3.5 text-center">
                <span class="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-bold border border-indigo-100">
                    ${legendCount} Tipe Shift
                </span>
            </td>
            <td class="px-4 py-3.5 text-center space-x-1.5 whitespace-nowrap">
                <button onclick="openModalTipeJadwal(${p.id})" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm shadow-indigo-100 flex-inline items-center gap-1">
                    📋 Tipe Jadwal
                </button>
                <button onclick="openModalInputJadwal(${p.id})" class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-100 flex-inline items-center gap-1">
                    ⚡ Input & Konversi Jadwal
                </button>
                <button onclick="deleteProjectById(${p.id})" class="bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border border-rose-200" title="Hapus Project">
                    🗑️ Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

async function addProject() {
    const input = document.getElementById('newProjectName');
    if (!input) return;
    const name = input.value.trim();
    if (!name) {
        showModal('Peringatan', 'Silakan masukkan nama project terlebih dahulu.');
        return;
    }

    try {
        const newProj = await ApiService.addProject(name);
        if (!projectsState.some(p => String(p.id) === String(newProj.id))) {
            projectsState.push(newProj);
        }
        activeProject = newProj;
        await renderProjectList();
        input.value = '';
        showModal('Sukses', `Project '${name}' berhasil ditambahkan ke Daftar Project!`);
    } catch (err) {
        showModal('Peringatan', err.message || 'Gagal membuat project.');
    }
}

async function deleteProjectById(projectId) {
    const proj = projectsState.find(p => String(p.id) === String(projectId));
    if (!proj) return;

    if (projectsState.length <= 1) {
        showModal('Peringatan', 'Minimal harus ada 1 Master Project.');
        return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus project '${proj.name}'? Data tipe jadwal dan konversi terkait akan terhapus.`)) {
        return;
    }

    try {
        await ApiService.deleteProject(projectId);
        projectsState = projectsState.filter(p => String(p.id) !== String(projectId));
        if (activeProject && String(activeProject.id) === String(projectId)) {
            activeProject = projectsState[0];
        }
        await renderProjectList();
        showModal('Sukses', `Project '${proj.name}' berhasil dihapus.`);
    } catch (err) {
        showModal('Error', err.message || 'Gagal menghapus project.');
    }
}

// ==================== MODAL 1: KELOLA TIPE JADWAL ==================== //

async function openModalTipeJadwal(projectId) {
    activeProject = projectsState.find(p => String(p.id) === String(projectId)) || projectsState[0];
    const nameEl = document.getElementById('modalTipeJadwalProjectName');
    if (nameEl) nameEl.textContent = activeProject.name;

    await loadLegends();

    const modal = document.getElementById('modalTipeJadwal');
    if (!modal) return;
    const card = modal.querySelector('div');

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if (card) card.classList.remove('scale-95');
    }, 10);
}

function closeModalTipeJadwal() {
    const modal = document.getElementById('modalTipeJadwal');
    if (!modal) return;
    const card = modal.querySelector('div');

    modal.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
        renderProjectList(); // Update total shift count badge on main list
    }, 200);
}

async function loadLegends() {
    if (!activeProject) return;
    try {
        const legends = await ApiService.getLegends(activeProject.id);
        if (legends && Array.isArray(legends)) {
            legendsState = legends.map(l => ({
                code: l.code,
                time_in: l.time_in || l.in || '07:00',
                time_out: l.time_out || l.out || '15:00'
            }));
        } else {
            legendsState = [];
        }
        renderLegendTable();
        renderQuickLegend();
    } catch (err) {
        console.error('Error loading legends:', err);
    }
}

function renderLegendTable() {
    const tbody = document.getElementById('tableTipeJadwalBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (legendsState.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-3 py-4 text-center text-slate-400 text-xs font-semibold">⚠️ Belum ada Tipe Shift untuk project ini. Tambahkan di form samping.</td></tr>`;
        return;
    }

    legendsState.forEach(l => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        tr.innerHTML = `
            <td class="px-3.5 py-2 font-bold text-indigo-900 font-mono">${l.code}</td>
            <td class="px-3.5 py-2 text-slate-700 font-medium">${l.time_in}</td>
            <td class="px-3.5 py-2 text-slate-700 font-medium">${l.time_out}</td>
            <td class="px-3.5 py-2 text-center">
                <button onclick="deleteLegend('${l.code}')" class="text-rose-600 hover:text-rose-800 text-xs font-bold">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderQuickLegend() {
    const containerTipe = document.getElementById('quickLegendTipeJadwal');
    const containerInput = document.getElementById('quickLegendInputJadwal');

    const htmlContent = legendsState.length === 0
        ? `<span class="text-rose-600 font-bold flex items-center gap-1">⚠️ Belum Ada Tipe Shift Terdaftar Pada Project Ini. Silakan Klik "📋 Tipe Jadwal".</span>`
        : `<strong class="text-indigo-900 font-bold flex-shrink-0">Shift Tersedia:</strong> ` +
          legendsState.map(l => 
            `<span class="bg-white border border-indigo-200/80 px-2.5 py-0.5 rounded-lg shadow-sm text-slate-800 font-mono text-[11px] font-semibold">
                ${l.code} <span class="text-indigo-600">(${l.time_in} - ${l.time_out})</span>
            </span>`
          ).join('');

    if (containerTipe) containerTipe.innerHTML = htmlContent;
    if (containerInput) containerInput.innerHTML = htmlContent;
}

async function addTipeJadwal(e) {
    e.preventDefault();
    const codeEl = document.getElementById('legCode');
    const inEl = document.getElementById('legIn');
    const outEl = document.getElementById('legOut');
    if (!codeEl || !inEl || !outEl) return;

    const code = codeEl.value.trim().toUpperCase();
    const time_in = inEl.value;
    const time_out = outEl.value;

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

        codeEl.value = '';
        inEl.value = '';
        outEl.value = '';

        showModal('Sukses', `Tipe Shift '${code}' (${time_in} - ${time_out}) tersimpan untuk project ${activeProject.name}!`);
    } catch (err) {
        showModal('Peringatan', err.message || 'Gagal menyimpan tipe jadwal.');
    }
}

async function deleteLegend(code) {
    if (!confirm(`Hapus tipe shift '${code}'?`)) return;

    try {
        await ApiService.deleteLegend(activeProject.id, code);
        legendsState = legendsState.filter(l => l.code !== code);
        renderLegendTable();
        renderQuickLegend();
    } catch (err) {
        showModal('Error', err.message || 'Gagal menghapus tipe shift.');
    }
}

// ==================== MODAL 2: INPUT & KONVERSI JADWAL ==================== //

async function openModalInputJadwal(projectId) {
    activeProject = projectsState.find(p => String(p.id) === String(projectId)) || projectsState[0];
    const nameEl = document.getElementById('modalInputJadwalProjectName');
    if (nameEl) nameEl.textContent = activeProject.name;

    // Reset current schedule previews
    importedScheduleData = [];
    convertedData = [];
    renderImportedTable();
    renderResultTable();

    await loadLegends();
    await loadSavedSchedulesHistory();

    switchSubTab('upload');

    const modal = document.getElementById('modalInputJadwal');
    if (!modal) return;
    const card = modal.querySelector('div');

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        if (card) card.classList.remove('scale-95');
    }, 10);
}

function closeModalInputJadwal() {
    const modal = document.getElementById('modalInputJadwal');
    if (!modal) return;
    const card = modal.querySelector('div');

    modal.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

function switchSubTab(tabId) {
    const tabUpload = document.getElementById('tabContentUpload');
    const tabManual = document.getElementById('tabContentManual');
    const tabHistory = document.getElementById('tabContentHistory');

    const btnUpload = document.getElementById('btnTabUpload');
    const btnManual = document.getElementById('btnTabManual');
    const btnHistory = document.getElementById('btnTabHistory');

    if (!tabUpload || !tabManual || !tabHistory) return;

    // Hide all sub tab contents
    tabUpload.classList.add('hidden');
    tabUpload.classList.remove('block');

    tabManual.classList.add('hidden');
    tabManual.classList.remove('block');

    tabHistory.classList.add('hidden');
    tabHistory.classList.remove('block');

    // Reset button styles
    [btnUpload, btnManual, btnHistory].forEach(btn => {
        if (btn) {
            btn.classList.remove('border-indigo-600', 'text-indigo-600', 'font-bold');
            btn.classList.add('border-transparent', 'text-slate-500', 'font-semibold');
        }
    });

    if (tabId === 'upload') {
        tabUpload.classList.remove('hidden');
        tabUpload.classList.add('block');
        if (btnUpload) {
            btnUpload.classList.add('border-indigo-600', 'text-indigo-600', 'font-bold');
            btnUpload.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
        }
    } else if (tabId === 'manual') {
        tabManual.classList.remove('hidden');
        tabManual.classList.add('block');
        if (btnManual) {
            btnManual.classList.add('border-indigo-600', 'text-indigo-600', 'font-bold');
            btnManual.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
        }
        initManualGrid(); // Auto load grid or existing history for selected month
    } else if (tabId === 'history') {
        tabHistory.classList.remove('hidden');
        tabHistory.classList.add('block');
        if (btnHistory) {
            btnHistory.classList.add('border-indigo-600', 'text-indigo-600', 'font-bold');
            btnHistory.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
        }
        loadSavedSchedulesHistory();
    }
}

async function loadSavedSchedulesHistory() {
    if (!activeProject) return;
    try {
        const history = await ApiService.getSchedules(activeProject.id);
        savedSchedulesHistory = history || [];
        populateHistoryMonthFilter();
        renderSavedHistoryTable();
    } catch (err) {
        console.error('Error loading saved schedules history:', err);
    }
}

function populateHistoryMonthFilter() {
    const filterSelect = document.getElementById('historyMonthFilter');
    if (!filterSelect) return;

    const currentVal = filterSelect.value || 'ALL';
    filterSelect.innerHTML = `<option value="ALL">Semua Bulan</option>`;

    if (!savedSchedulesHistory || savedSchedulesHistory.length === 0) return;

    // Collect unique periods
    const periodsMap = new Map();
    savedSchedulesHistory.forEach(item => {
        const dateStr = item.date || item.Date;
        const info = getPeriodInfo(dateStr);
        if (info.key !== 'UNKNOWN') {
            periodsMap.set(info.key, info.label);
        }
    });

    // Sort periods descending (most recent first)
    const sortedKeys = Array.from(periodsMap.keys()).sort().reverse();

    sortedKeys.forEach(key => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = periodsMap.get(key);
        if (key === currentVal) opt.selected = true;
        filterSelect.appendChild(opt);
    });
}

function renderSavedHistoryTable() {
    const tbody = document.getElementById('savedHistoryTableBody');
    const emptyMsg = document.getElementById('emptyHistoryMsg');
    const badge = document.getElementById('savedHistoryCountBadge');
    const filterSelect = document.getElementById('historyMonthFilter');

    if (!tbody) return;
    tbody.innerHTML = '';

    const selectedPeriod = filterSelect ? filterSelect.value : 'ALL';

    // Filter items by selected period
    let filtered = savedSchedulesHistory;
    if (selectedPeriod && selectedPeriod !== 'ALL') {
        filtered = savedSchedulesHistory.filter(item => {
            const dateStr = item.date || item.Date;
            const info = getPeriodInfo(dateStr);
            return info.key === selectedPeriod;
        });
    }

    if (badge) {
        if (selectedPeriod === 'ALL') {
            badge.textContent = `${filtered.length} Data Tersimpan (Semua Bulan)`;
        } else {
            const selectedOpt = filterSelect.options[filterSelect.selectedIndex];
            const monthLabel = selectedOpt ? selectedOpt.textContent : selectedPeriod;
            badge.textContent = `${filtered.length} Data Tersimpan (${monthLabel})`;
        }
    }

    if (!filtered || filtered.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        return;
    }

    if (emptyMsg) emptyMsg.classList.add('hidden');

    filtered.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition';
        const dateDisplay = item.date || item.Date;
        const nikDisplay = item.nik || item.EmployeeNIK;
        const namaDisplay = item.name || item.EmployeeNama || item.nama || '-';
        const codeDisplay = item.code || item.originalCode || '-';
        const convertedDisplay = item.converted_code || item.ScheduleCode;

        tr.innerHTML = `
            <td class="px-4 py-2 border-r border-slate-100 font-medium text-slate-700">${dateDisplay}</td>
            <td class="px-4 py-2 border-r border-slate-100 font-semibold text-slate-800">${nikDisplay}</td>
            <td class="px-4 py-2 border-r border-slate-100 text-slate-700 font-semibold">${namaDisplay}</td>
            <td class="px-4 py-2 border-r border-slate-100 font-mono font-bold text-slate-600">${codeDisplay}</td>
            <td class="px-4 py-2 font-mono font-bold text-emerald-700">${convertedDisplay}</td>
        `;
        tbody.appendChild(tr);
    });
}

function exportSavedHistoryExcel() {
    const filterSelect = document.getElementById('historyMonthFilter');
    const selectedPeriod = filterSelect ? filterSelect.value : 'ALL';

    let filtered = savedSchedulesHistory;
    if (selectedPeriod && selectedPeriod !== 'ALL') {
        filtered = savedSchedulesHistory.filter(item => {
            const dateStr = item.date || item.Date;
            const info = getPeriodInfo(dateStr);
            return info.key === selectedPeriod;
        });
    }

    if (!filtered || filtered.length === 0) {
        showModal('Peringatan', 'Tidak ada riwayat data tersimpan pada periode ini yang dapat diexport.');
        return;
    }

    const formattedData = filtered.map(item => ({
        Date: item.date || item.Date,
        EmployeeNIK: item.nik || item.EmployeeNIK,
        ScheduleCode: item.converted_code || item.ScheduleCode
    }));

    const periodLabel = selectedPeriod === 'ALL' ? 'Semua_Bulan' : selectedPeriod;
    generateExcelFile(formattedData, activeProject ? activeProject.name + '_Riwayat_' + periodLabel : 'Riwayat_Jadwal_' + periodLabel);
}

async function clearSavedHistory() {
    const filterSelect = document.getElementById('historyMonthFilter');
    const selectedPeriod = filterSelect ? filterSelect.value : 'ALL';

    if (!savedSchedulesHistory || savedSchedulesHistory.length === 0) {
        showModal('Peringatan', 'Belum ada riwayat data tersimpan.');
        return;
    }

    let confirmMsg = `Apakah Anda yakin ingin menghapus seluruh riwayat data jadwal tersimpan untuk project '${activeProject.name}'?`;
    if (selectedPeriod !== 'ALL') {
        const selectedOpt = filterSelect.options[filterSelect.selectedIndex];
        const monthLabel = selectedOpt ? selectedOpt.textContent : selectedPeriod;
        confirmMsg = `Apakah Anda yakin ingin menghapus riwayat data jadwal untuk periode '${monthLabel}' pada project '${activeProject.name}'?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
        let updatedHistory = [];
        if (selectedPeriod !== 'ALL') {
            // Keep items from other months
            updatedHistory = savedSchedulesHistory.filter(item => {
                const dateStr = item.date || item.Date;
                const info = getPeriodInfo(dateStr);
                return info.key !== selectedPeriod;
            });
        }

        await ApiService.saveSchedules(activeProject.id, updatedHistory, true);
        savedSchedulesHistory = updatedHistory;
        populateHistoryMonthFilter();
        renderSavedHistoryTable();
        showModal('Sukses', 'Riwayat data jadwal tersimpan berhasil dibersihkan.');
    } catch (err) {
        showModal('Error', err.message || 'Gagal menghapus riwayat.');
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

        // Perform history status check count
        let newCount = 0;
        let updateCount = 0;
        importedScheduleData.forEach(d => {
            const isExist = savedSchedulesHistory.some(h => {
                const hNik = String(h.nik || h.EmployeeNIK).trim();
                const hDate = normalizeDateStr(h.date || h.Date);
                const dNik = String(d.nik).trim();
                const dDate = normalizeDateStr(d.tanggal);
                return hNik === dNik && hDate === dDate;
            });
            if (isExist) updateCount++;
            else newCount++;
        });

        showModal('Berhasil Membaca File Excel', `Memuat ${importedScheduleData.length} slot jadwal dari file Excel (${file.name}).\n\n📌 Hasil Pengecekan Riwayat:\n• Data Baru: ${newCount} slot\n• Update Data (Sudah Ada di Riwayat): ${updateCount} slot\n\nKlik "⚡ Proses Konversi" untuk memvalidasi tipe shift.`);
    } catch (err) {
        console.error('Upload Error:', err);
        showModal('Error', 'Terjadi kesalahan saat membaca file Excel.');
    }

    event.target.value = '';
}

// Helper to generate select dropdown options strictly from registered shift types in legendsState
function getShiftOptionsHTML(selectedCode = '') {
    let optionsHtml = `<option value="">-</option>`;
    if (legendsState && legendsState.length > 0) {
        legendsState.forEach(l => {
            const isSel = String(l.code).toUpperCase() === String(selectedCode).toUpperCase() ? 'selected' : '';
            optionsHtml += `<option value="${l.code}" ${isSel}>${l.code} (${l.time_in}-${l.time_out})</option>`;
        });
    } else {
        optionsHtml = `<option value="">⚠️ Tambah Tipe Shift Dahulu</option>`;
    }
    return optionsHtml;
}

// Manual Calendar Matrix Grid (With History Edit Support & Name Retention)
function initManualGrid() {
    const monthPicker = document.getElementById('manualMonthPicker');
    const gridBtn = document.getElementById('btnBuildManualGrid');
    if (!monthPicker) return;
    const monthInput = monthPicker.value;
    if (!monthInput) {
        showModal('Peringatan', 'Silakan pilih bulan dan tahun terlebih dahulu.');
        return;
    }

    if (!legendsState || legendsState.length === 0) {
        showModal('Peringatan Tipe Shift', `Project '${activeProject ? activeProject.name : 'Aktif'}' belum memiliki Tipe Shift terdaftar. Silakan tambahkan Tipe Shift terlebih dahulu pada tombol "📋 Tipe Jadwal".`);
        return;
    }

    const [year, month] = monthInput.split('-');
    currentManualYear = year;
    currentManualMonth = month;
    manualDaysCount = new Date(year, month, 0).getDate();

    renderManualGridHeaders();

    const tbody = document.getElementById('manualGridBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Check if saved history for active project contains data for this selected month!
    const targetPeriodKey = `${year}-${month}`;
    const monthHistory = savedSchedulesHistory.filter(item => {
        const dStr = item.date || item.Date;
        const info = getPeriodInfo(dStr);
        return info.key === targetPeriodKey;
    });

    if (monthHistory && monthHistory.length > 0) {
        // Group by Employee NIK while preserving employee Name!
        const employeeMap = new Map();
        monthHistory.forEach(item => {
            const nik = String(item.nik || item.EmployeeNIK).trim();
            const nama = item.name || item.EmployeeNama || item.nama || '';
            const code = item.code || item.originalCode || '';
            const dStr = item.date || item.Date;

            // Extract day number (e.g. 1-31)
            const dObj = new Date(dStr);
            let dayNum = !isNaN(dObj.getTime()) ? dObj.getDate() : parseInt(String(dStr).split(/[\/\-]/)[1]);

            if (!employeeMap.has(nik)) {
                employeeMap.set(nik, { nik, nama, shifts: {} });
            }
            if (nama && nama !== '-' && employeeMap.get(nik).nama === '-') {
                employeeMap.get(nik).nama = nama;
            }

            if (dayNum >= 1 && dayNum <= manualDaysCount) {
                employeeMap.get(nik).shifts[dayNum] = code;
            }
        });

        // Populate rows with existing saved schedules and employee names
        employeeMap.forEach(emp => {
            const displayNama = (emp.nama && emp.nama !== '-') ? emp.nama : '';
            addManualRowWithData(emp.nik, displayNama, emp.shifts);
        });

        if (gridBtn) gridBtn.innerHTML = `✏️ Tampilkan & Edit Jadwal (Bulan Ini)`;
    } else {
        // Render 3 empty default rows
        addManualRow();
        addManualRow();
        addManualRow();

        if (gridBtn) gridBtn.innerHTML = `+ Buat Grid Kalender Baru`;
    }

    const container = document.getElementById('manualGridContainer');
    if (container) container.classList.remove('hidden');
}

function renderManualGridHeaders() {
    const tr = document.getElementById('manualGridHeaderRow');
    if (!tr) return;
    let html = `
        <th class="px-3 py-2 min-w-[120px] sticky-header-left-1 border-r border-slate-200">NIK</th>
        <th class="px-3 py-2 min-w-[150px] sticky-header-left-2 border-r border-slate-200">Nama</th>
    `;

    for (let i = 1; i <= manualDaysCount; i++) {
        const d = new Date(currentManualYear, parseInt(currentManualMonth) - 1, i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const bgClass = isWeekend ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-700';

        html += `<th class="px-2 py-2 min-w-[64px] text-center border-r border-slate-200 ${bgClass}">${i}</th>`;
    }

    tr.innerHTML = html;
}

function addManualRow() {
    addManualRowWithData('', '', {});
}

function addManualRowWithData(nikVal = '', namaVal = '', shiftsObj = {}) {
    const tbody = document.getElementById('manualGridBody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition';

    let html = `
        <td class="p-1 min-w-[120px] sticky-col-left-1 border-r border-slate-200">
            <input type="text" value="${nikVal}" class="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 text-xs font-semibold manual-nik" placeholder="123456">
        </td>
        <td class="p-1 min-w-[150px] sticky-col-left-2 border-r border-slate-200">
            <input type="text" value="${namaVal}" class="w-full bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 text-xs manual-nama" placeholder="Nama Karyawan">
        </td>
    `;

    for (let i = 1; i <= manualDaysCount; i++) {
        const dateStr = `${currentManualYear}/${currentManualMonth}/${String(i).padStart(2, '0')}`;
        const d = new Date(currentManualYear, parseInt(currentManualMonth) - 1, i);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const bgClass = isWeekend ? 'bg-rose-50' : '';
        const savedCode = shiftsObj[i] || '';

        const optionsHtml = getShiftOptionsHTML(savedCode);

        html += `
            <td class="p-1 min-w-[64px] border-r border-slate-200 ${bgClass}">
                <select class="w-full h-8 border border-slate-200 bg-white text-center font-mono font-bold text-indigo-700 manual-code focus:ring-2 focus:ring-indigo-500 rounded text-xs cursor-pointer" data-date="${dateStr}">
                    ${optionsHtml}
                </select>
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

        const codeSelects = row.querySelectorAll('.manual-code');
        codeSelects.forEach(select => {
            const kode = select.value.trim().toUpperCase();
            if (kode) {
                newData.push({
                    nik: nik,
                    nama: nama || '-',
                    tanggal: select.getAttribute('data-date'),
                    kode: kode
                });
            }
        });
    });

    if (newData.length === 0) {
        showModal('Peringatan', 'Tidak ada data jadwal yang dapat disimpan. Pastikan NIK dan Pilihan Shift diisi.');
        return;
    }

    importedScheduleData = newData;
    renderImportedTable();
    showModal('Berhasil', `${newData.length} slot jadwal dimasukkan ke Antrean. Klik tombol "⚡ Proses Konversi" untuk melihat hasil konversi.`);
}

function renderImportedTable() {
    const tbody = document.getElementById('importedTableBody');
    const emptyMsg = document.getElementById('emptyImportMsg');
    const countBadge = document.getElementById('importedRowCount');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (countBadge) countBadge.textContent = `${importedScheduleData.length} Data`;

    if (importedScheduleData.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        const displayData = importedScheduleData.slice(0, 100);

        displayData.forEach(d => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50 transition';

            // History check for NIK and Date
            const dNik = String(d.nik).trim();
            const dDate = normalizeDateStr(d.tanggal);

            const isExistInHistory = savedSchedulesHistory.some(h => {
                const hNik = String(h.nik || h.EmployeeNIK).trim();
                const hDate = normalizeDateStr(h.date || h.Date);
                return hNik === dNik && hDate === dDate;
            });

            const statusBadgeHTML = isExistInHistory
                ? `<span class="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Update (Perubahan)</span>`
                : `<span class="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Baru</span>`;

            tr.innerHTML = `
                <td class="px-4 py-2 border-r border-slate-100 font-semibold text-slate-800">${d.nik}</td>
                <td class="px-4 py-2 border-r border-slate-100 text-slate-600">${d.nama}</td>
                <td class="px-4 py-2 border-r border-slate-100 text-slate-600">${d.tanggal}</td>
                <td class="px-4 py-2 border-r border-slate-100 text-center text-indigo-700 font-mono font-bold">${d.kode}</td>
                <td class="px-4 py-2 text-center">${statusBadgeHTML}</td>
            `;
            tbody.appendChild(tr);
        });

        if (importedScheduleData.length > 100) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="5" class="px-4 py-2 text-center text-xs text-slate-500 italic bg-slate-50">Menampilkan 100 baris pertama dari total ${importedScheduleData.length} baris.</td>`;
            tbody.appendChild(tr);
        }
    }
}

// ==================== KONVERSI & RESULT FUNCTIONS ==================== //

function processData() {
    if (importedScheduleData.length === 0) {
        showModal('Peringatan', 'Tidak ada data jadwal untuk diproses. Upload file Excel atau pilih shift di grid manual.');
        return;
    }

    if (!legendsState || legendsState.length === 0) {
        showModal('Peringatan Tipe Shift', `Project '${activeProject ? activeProject.name : 'Aktif'}' belum memiliki Tipe Shift terdaftar. Silakan tambahkan Tipe Shift terlebih dahulu pada tombol "📋 Tipe Jadwal".`);
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
        showModal(
            'Hasil Konversi & Peringatan Validasi Shift',
            `Berhasil mengkonversi ${convertedData.length} data jadwal.\n\n` +
            `⚠️ Terdapat ${errors.length} data GAGAL dikonversi karena kode shift TIDAK TERDAFTAR pada project '${activeProject.name}':\n\n` +
            errors.slice(0, 8).join('\n') + (errors.length > 8 ? '\n...' : '')
        );
    } else {
        showModal('Berhasil Konversi', `Berhasil mengkonversi seluruh ${convertedData.length} baris jadwal ke format system!\n\nKlik tombol "💾 Simpan Ke Riwayat" untuk menyimpan dan mengupdate riwayat data.`);
    }
}

function renderResultTable() {
    const tbody = document.getElementById('resultTableBody');
    const emptyMsg = document.getElementById('emptyResultMsg');
    const resultBadge = document.getElementById('resultCountBadge');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (resultBadge) resultBadge.textContent = `${convertedData.length} Baris Terkonversi`;

    if (convertedData.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove('hidden');
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
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
        showModal('Peringatan', 'Tidak ada data konversi yang dapat disimpan. Silakan klik "⚡ Proses Konversi" terlebih dahulu.');
        return;
    }

    try {
        let newCount = 0;
        let updateCount = 0;

        // Perform intelligent upsert against savedSchedulesHistory while preserving employee name
        const historyCopy = [...savedSchedulesHistory];

        convertedData.forEach(item => {
            const itemNik = String(item.EmployeeNIK).trim();
            const itemNama = item.EmployeeNama || item.nama || item.name || '-';
            const itemDate = normalizeDateStr(item.Date);

            const existingIdx = historyCopy.findIndex(h => {
                const hNik = String(h.nik || h.EmployeeNIK).trim();
                const hDate = normalizeDateStr(h.date || h.Date);
                return hNik === itemNik && hDate === itemDate;
            });

            const newItemObj = {
                nik: item.EmployeeNIK,
                name: itemNama,
                date: item.Date,
                code: item.originalCode || 'P',
                converted_code: item.ScheduleCode
            };

            if (existingIdx >= 0) {
                // If existing record had name '-' and new item has actual name, preserve actual name!
                if (historyCopy[existingIdx].name && historyCopy[existingIdx].name !== '-' && itemNama === '-') {
                    newItemObj.name = historyCopy[existingIdx].name;
                }
                historyCopy[existingIdx] = newItemObj;
                updateCount++;
            } else {
                historyCopy.push(newItemObj);
                newCount++;
            }
        });

        await ApiService.saveSchedules(activeProject ? activeProject.id : 1, historyCopy, true);
        await loadSavedSchedulesHistory();

        showModal(
            'Berhasil Menyimpan Ke Riwayat!',
            `Pengecekan Data Riwayat Selesai:\n` +
            `• Data Baru: ${newCount} baris ditambahkan\n` +
            `• Update Data: ${updateCount} baris diperbarui (NIK & Tanggal Sama)\n\n` +
            `Seluruh data berhasil disinkronkan ke tab "Riwayat Data Tersimpan (Per Bulan)".`
        );
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
        if (card) card.classList.remove('scale-95');
    }, 10);
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    const card = document.getElementById('modalCard');

    if (!overlay || !card) return;

    overlay.classList.add('opacity-0');
    if (card) card.classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 200);
}
