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
    let d;
    // Cek jika header dibaca sebagai Excel Serial Number oleh sheetJS
    if (!isNaN(dateStr) && !isNaN(parseFloat(dateStr))) {
        d = new Date(Math.round((parseFloat(dateStr) - 25569) * 86400 * 1000));
    } else {
        d = new Date(dateStr);
    }

    if (isNaN(d.getTime())) return dateStr;

    // Return format M/D/YYYY (contoh: 8/1/2026)
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function convertSchedules(importedScheduleData, legends) {
    const converted = [];
    const errors = [];

    importedScheduleData.forEach((entry, index) => {
        const legend = legends.find(l => l.code.toUpperCase() === entry.kode.toUpperCase());

        if (legend) {
            // S + Jam Masuk (tanpa titik dua) + Jam Pulang (tanpa titik dua)
            const inTimeRaw = legend.time_in.replace(':', '');
            const outTimeRaw = legend.time_out.replace(':', '');
            const scheduleCode = `S${inTimeRaw}${outTimeRaw}`;

            converted.push({
                Date: formatDateForSystem(entry.tanggal),
                EmployeeNIK: entry.nik,
                ScheduleCode: scheduleCode,
                originalCode: entry.kode
            });
        } else {
            errors.push(`Baris Ke-${index + 1} (NIK: ${entry.nik}, Tgl: ${entry.tanggal}): Kode '${entry.kode}' tidak ada di legenda.`);
        }
    });

    // Urutkan berdasarkan tanggal lalu NIK
    converted.sort((a, b) => new Date(a.Date) - new Date(b.Date));

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
