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

    const parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
        let year, month, day;
        if (parts[0].length === 4) {
            // YYYY/MM/DD or YYYY-MM-DD
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            day = parseInt(parts[2], 10);
        } else {
            // MM/DD/YYYY or M/D/YY
            month = parseInt(parts[0], 10);
            day = parseInt(parts[1], 10);
            year = parseInt(parts[2], 10);
            if (year < 100) year += 2000;
        }

        if (!isNaN(month) && !isNaN(day) && !isNaN(year) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            return `${month}/${day}/${year}`;
        }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    }

    return str;
}

function convertSchedules(importedScheduleData, legends) {
    const converted = [];
    const errors = [];

    // Strict validation against registered project legends
    if (!legends || legends.length === 0) {
        return {
            converted: [],
            errors: ['Project ini belum memiliki Tipe Shift terdaftar. Silakan kelola Tipe Shift terlebih dahulu.']
        };
    }

    importedScheduleData.forEach((entry, index) => {
        const inputCode = String(entry.kode || '').trim().toUpperCase();

        // Search STRICTLY in project-registered shift types
        const legend = legends.find(l => String(l.code).toUpperCase() === inputCode);

        if (legend) {
            const inTimeRaw = String(legend.time_in || '07:00').replace(':', '');
            const outTimeRaw = String(legend.time_out || '15:00').replace(':', '');
            const scheduleCode = `S${inTimeRaw}${outTimeRaw}`;

            converted.push({
                Date: formatDateForSystem(entry.tanggal),
                EmployeeNIK: entry.nik,
                EmployeeNama: entry.nama || '-',
                ScheduleCode: scheduleCode,
                originalCode: entry.kode
            });
        } else {
            // Reject entry if shift code is not registered in project's shift types
            errors.push(`Baris ${index + 1} (NIK: ${entry.nik}, Tgl: ${entry.tanggal}): Kode Shift '${entry.kode}' tidak ada di Tipe Jadwal Project.`);
        }
    });

    // Sort by Date then NIK for clean ordering
    converted.sort((a, b) => {
        const pA = a.Date.split('/');
        const pB = b.Date.split('/');
        if (pA.length === 3 && pB.length === 3) {
            const dA = new Date(pA[2], pA[0] - 1, pA[1]);
            const dB = new Date(pB[2], pB[0] - 1, pB[1]);
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
