/**
 * Excel Processing & Conversion Engine Module
 */

function downloadTemplate() {
    // Standard template sample crosstab data
    const templateData = [
        { "NIK": "123456", "Nama": "Budi", "2026-08-01": "P", "2026-08-02": "M", "2026-08-03": "L" },
        { "NIK": "654321", "Nama": "Siti", "2026-08-01": "M", "2026-08-02": "P", "2026-08-03": "P" }
    ];
    
    try {
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Jadwal");
        XLSX.writeFile(workbook, "format input jadwal_2.xlsx");
    } catch (error) {
        console.error("Error downloading template:", error);
        showModal("Peringatan", "Gagal mengunduh template Excel. Pastikan SheetJS termuat.");
    }
}

function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
                const unpivotedData = [];

                jsonData.forEach(row => {
                    // Cari key NIK & Nama
                    const nikKey = Object.keys(row).find(k => k.toLowerCase() === 'nik' || k.toLowerCase() === 'employee nik');
                    const namaKey = Object.keys(row).find(k => k.toLowerCase() === 'nama' || k.toLowerCase() === 'name');

                    const nik = nikKey ? row[nikKey] : null;
                    const nama = namaKey ? row[namaKey] : '-';

                    if (nik && String(nik).trim() !== '') {
                        Object.keys(row).forEach(key => {
                            if (key !== nikKey && key !== namaKey) {
                                const kode = row[key];
                                if (kode && String(kode).trim() !== '') {
                                    unpivotedData.push({
                                        nik: String(nik).trim(),
                                        nama: String(nama).trim(),
                                        tanggal: String(key).trim(),
                                        kode: String(kode).trim().toUpperCase()
                                    });
                                }
                            }
                        });
                    }
                });

                resolve(unpivotedData);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

function formatDateForSystem(dateStr) {
    if (!dateStr) return '';
    const str = String(dateStr).trim();
    
    // Handle numeric Excel serial date
    if (!isNaN(str) && !isNaN(parseFloat(str)) && parseFloat(str) > 30000) {
        const d = new Date(Math.round((parseFloat(str) - 25569) * 86400 * 1000));
        if (!isNaN(d.getTime())) {
            return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
        }
    }

    // Handle M/D/YY or M/D/YYYY (e.g. 7/1/26 -> 7/1/2026)
    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
        let month = parseInt(parts[0], 10);
        let day = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000; // Convert 26 -> 2026
        if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            return `${month}/${day}/${year}`;
        }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }

    return str;
}

// Default Fallback Shift Types
const DEFAULT_FALLBACK_LEGENDS = [
    { code: 'P', time_in: '07:00', time_out: '15:00' },
    { code: 'M', time_in: '15:00', time_out: '23:00' },
    { code: 'L', time_in: '23:00', time_out: '07:00' },
    { code: 'P8', time_in: '08:00', time_out: '15:00' },
    { code: 'P9', time_in: '09:00', time_out: '16:00' },
    { code: 'OFF', time_in: '00:00', time_out: '00:00' },
    { code: 'LIBUR', time_in: '00:00', time_out: '00:00' },
    { code: 'LBR', time_in: '00:00', time_out: '00:00' }
];

function convertSchedules(importedScheduleData, legends) {
    const converted = [];
    const errors = [];

    // Combine project-specific legends with default fallback legends
    const activeLegends = (legends && legends.length > 0) ? legends : DEFAULT_FALLBACK_LEGENDS;

    importedScheduleData.forEach((entry, index) => {
        const inputCode = String(entry.kode || '').trim().toUpperCase();

        // 1. Search in project legends
        let legend = activeLegends.find(l => String(l.code).toUpperCase() === inputCode);

        // 2. If not found in project legends, search in default fallback legends
        if (!legend) {
            legend = DEFAULT_FALLBACK_LEGENDS.find(l => String(l.code).toUpperCase() === inputCode);
        }

        let scheduleCode = '';

        if (legend) {
            const inTimeRaw = String(legend.time_in || '07:00').replace(':', '');
            const outTimeRaw = String(legend.time_out || '15:00').replace(':', '');
            scheduleCode = `S${inTimeRaw}${outTimeRaw}`;
        } else if (inputCode.startsWith('S') && inputCode.length >= 7) {
            // Already formatted system code (e.g. S07001500)
            scheduleCode = inputCode;
        } else {
            // Fallback for custom undefined shift codes so NO DATA IS DROPPED!
            scheduleCode = `S_${inputCode}`;
            errors.push(`Shift '${inputCode}' tidak ada di legenda (dikonversi otomatis sebagai ${scheduleCode}).`);
        }

        converted.push({
            Date: formatDateForSystem(entry.tanggal),
            EmployeeNIK: entry.nik,
            ScheduleCode: scheduleCode,
            originalCode: entry.kode
        });
    });

    // Sort by Date then NIK for clean ordering
    converted.sort((a, b) => {
        const dA = new Date(a.Date);
        const dB = new Date(b.Date);
        if (!isNaN(dA.getTime()) && !isNaN(dB.getTime())) {
            return dA - dB;
        }
        return String(a.Date).localeCompare(String(b.Date));
    });

    return { converted, errors };
}

function generateExcelFile(convertedData, projectName) {
    if (!convertedData || convertedData.length === 0) {
        showModal("Peringatan", "Tidak ada data hasil konversi untuk diexport.");
        return;
    }

    const worksheetData = convertedData.map(item => ({
        'Date': item.Date,
        'Employee NIK': item.EmployeeNIK,
        'Schedule Code': item.ScheduleCode
    }));

    try {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, "Schedule_Upload");

        const today = new Date();
        const dateString = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
        const sanitizedProject = (projectName || 'Project').replace(/\s+/g, '_');
        const fileName = `Upload_Jadwal_${sanitizedProject}_${dateString}.xlsx`;

        XLSX.writeFile(workbook, fileName);
    } catch (error) {
        console.error("Error generating Excel:", error);
        showModal("Error", "Terjadi kesalahan saat membuat file Excel.");
    }
}
