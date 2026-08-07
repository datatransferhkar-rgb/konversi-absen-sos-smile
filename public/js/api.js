const API_BASE = '/api';

// Helper LocalStorage Keys
const STORAGE_KEYS = {
    PROJECTS: 'sos_absen_projects',
    LEGENDS: 'sos_absen_legends_', // + projectId
    SCHEDULES: 'sos_absen_schedules_' // + projectId
};

function isLocalhostServer() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

// Initial default seed for offline/GitHub Pages
function getLocalSeedProjects() {
    return [{ id: 1, name: 'Default Project', created_at: new Date().toISOString() }];
}

function getLocalSeedLegends() {
    return [
        { id: 1, project_id: 1, code: 'P', time_in: '07:00', time_out: '15:00' },
        { id: 2, project_id: 1, code: 'M', time_in: '15:00', time_out: '23:00' },
        { id: 3, project_id: 1, code: 'L', time_in: '23:00', time_out: '07:00' }
    ];
}

const ApiService = {
    // 1. Fetch All Projects
    async getProjects() {
        if (isLocalhostServer()) {
            try {
                const res = await fetch(`${API_BASE}/projects`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.data && data.data.length > 0) {
                        return data.data;
                    }
                }
            } catch (err) {
                console.warn('Backend API server tidak merespons, beralih ke LocalStorage:', err);
            }
        }

        // LocalStorage Fallback (GitHub Pages / Static Hosting)
        try {
            let projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS));
            if (!projects || !Array.isArray(projects) || projects.length === 0) {
                projects = getLocalSeedProjects();
                localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
            }
            return projects;
        } catch (e) {
            console.error('Error reading localStorage projects:', e);
            const seed = getLocalSeedProjects();
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(seed));
            return seed;
        }
    },

    // 2. Add New Project
    async addProject(name) {
        const cleanName = name.trim();
        if (isLocalhostServer()) {
            try {
                const res = await fetch(`${API_BASE}/projects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: cleanName })
                });
                if (res.ok) {
                    const data = await res.json();
                    return data.data;
                }
            } catch (err) {
                console.warn('Backend API error, beralih ke LocalStorage');
            }
        }

        // LocalStorage Fallback
        const projects = await this.getProjects();
        if (projects.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
            throw new Error('Project dengan nama tersebut sudah ada.');
        }

        const newProj = {
            id: Date.now(),
            name: cleanName,
            created_at: new Date().toISOString()
        };
        projects.push(newProj);
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        return newProj;
    },

    // 3. Delete Project
    async deleteProject(id) {
        if (isLocalhostServer()) {
            try {
                const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
                if (res.ok) return await res.json();
            } catch (err) {
                console.warn('Backend API error, beralih ke LocalStorage');
            }
        }

        // LocalStorage Fallback
        let projects = await this.getProjects();
        projects = projects.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        localStorage.removeItem(STORAGE_KEYS.LEGENDS + id);
        localStorage.removeItem(STORAGE_KEYS.SCHEDULES + id);
        return { message: 'Project deleted' };
    },

    // 4. Get Legends per Project
    async getLegends(projectId) {
        if (isLocalhostServer()) {
            try {
                const res = await fetch(`${API_BASE}/projects/${projectId}/legends`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.data) {
                        return data.data.map(l => ({
                            id: l.id,
                            project_id: l.project_id,
                            code: l.code,
                            time_in: l.time_in || l.in || '07:00',
                            time_out: l.time_out || l.out || '15:00'
                        }));
                    }
                }
            } catch (err) {
                console.warn('Backend API error, beralih ke LocalStorage');
            }
        }

        // LocalStorage Fallback
        try {
            let legends = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEGENDS + projectId));
            if (!legends || !Array.isArray(legends) || legends.length === 0) {
                if (projectId == 1) {
                    legends = getLocalSeedLegends();
                } else {
                    legends = [];
                }
                localStorage.setItem(STORAGE_KEYS.LEGENDS + projectId, JSON.stringify(legends));
            }
            return legends.map(l => ({
                id: l.id || Date.now(),
                project_id: l.project_id || projectId,
                code: l.code,
                time_in: l.time_in || l.in || '07:00',
                time_out: l.time_out || l.out || '15:00'
            }));
        } catch (e) {
            console.error('Error reading localStorage legends:', e);
            return getLocalSeedLegends();
        }
    },

    // 5. Save/Update Legend
    async saveLegend(projectId, legend) {
        const upperCode = legend.code.trim().toUpperCase();
        if (isLocalhostServer()) {
            try {
                const res = await fetch(`${API_BASE}/projects/${projectId}/legends`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: upperCode, time_in: legend.time_in, time_out: legend.time_out })
                });
                if (res.ok) return await res.json();
            } catch (err) {
                console.warn('Backend API error, beralih ke LocalStorage');
            }
        }

        // LocalStorage Fallback
        const legends = await this.getLegends(projectId);
        const idx = legends.findIndex(l => l.code.toUpperCase() === upperCode);

        const newLegend = {
            id: Date.now(),
            project_id: projectId,
            code: upperCode,
            time_in: legend.time_in,
            time_out: legend.time_out
        };

        if (idx >= 0) {
            legends[idx] = newLegend;
        } else {
            legends.push(newLegend);
        }

        localStorage.setItem(STORAGE_KEYS.LEGENDS + projectId, JSON.stringify(legends));
        return { message: 'Legend saved', id: newLegend.id };
    },

    // 6. Delete Legend
    async deleteLegend(projectId, code) {
        const upperCode = code.trim().toUpperCase();
        if (isLocalhostServer()) {
            try {
                const res = await fetch(`${API_BASE}/projects/${projectId}/legends/${upperCode}`, { method: 'DELETE' });
                if (res.ok) return await res.json();
            } catch (err) {
                console.warn('Backend API error, beralih ke LocalStorage');
            }
        }

        // LocalStorage Fallback
        let legends = await this.getLegends(projectId);
        legends = legends.filter(l => l.code.toUpperCase() !== upperCode);
        localStorage.setItem(STORAGE_KEYS.LEGENDS + projectId, JSON.stringify(legends));
        return { message: 'Legend deleted' };
    },

    // 7. Fetch Saved Schedules for a Project
    async getSchedules(projectId) {
        if (isLocalhostServer()) {
            try {
                const res = await fetch(`${API_BASE}/projects/${projectId}/schedules`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.data) return data.data;
                }
            } catch (err) {
                console.warn('Backend API error, beralih ke LocalStorage');
            }
        }

        // LocalStorage Fallback
        try {
            let items = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES + projectId));
            return items || [];
        } catch (e) {
            console.error('Error reading localStorage schedules:', e);
            return [];
        }
    },

    // 8. Save Schedules Batch
    async saveSchedules(projectId, items, clearExisting = true) {
        if (isLocalhostServer()) {
            try {
                const res = await fetch(`${API_BASE}/projects/${projectId}/schedules`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items, clearExisting })
                });
                if (res.ok) return await res.json();
            } catch (err) {
                console.warn('Backend API error, beralih ke LocalStorage');
            }
        }

        // LocalStorage Fallback
        localStorage.setItem(STORAGE_KEYS.SCHEDULES + projectId, JSON.stringify(items));
        return { message: `Berhasil menyimpan ${items.length} data jadwal ke penyimpanan browser.` };
    }
};
