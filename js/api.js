const API_BASE = '/api';

// Helper LocalStorage Keys
const STORAGE_KEYS = {
    PROJECTS: 'sos_absen_projects',
    LEGENDS: 'sos_absen_legends_', // + projectId
    SCHEDULES: 'sos_absen_schedules_' // + projectId
};

// Initial default state for offline/GitHub Pages
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
        try {
            const res = await fetch(`${API_BASE}/projects`);
            if (res.ok) {
                const data = await res.json();
                return data.data;
            }
        } catch (err) {
            console.warn('Backend API server tidak tersedia. Menggunakan LocalStorage (Mode GitHub Pages):', err);
        }

        // LocalStorage Fallback
        let projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS));
        if (!projects || projects.length === 0) {
            projects = getLocalSeedProjects();
            localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        }
        return projects;
    },

    // 2. Add New Project
    async addProject(name) {
        try {
            const res = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                const data = await res.json();
                return data.data;
            }
        } catch (err) {
            console.warn('API error, fallback to LocalStorage');
        }

        // LocalStorage Fallback
        const projects = await this.getProjects();
        if (projects.some(p => p.name.toLowerCase() === name.trim().toLowerCase())) {
            throw new Error('Project dengan nama tersebut sudah ada.');
        }

        const newProj = {
            id: Date.now(),
            name: name.trim(),
            created_at: new Date().toISOString()
        };
        projects.push(newProj);
        localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
        return newProj;
    },

    // 3. Delete Project
    async deleteProject(id) {
        try {
            const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
            if (res.ok) return await res.json();
        } catch (err) {
            console.warn('API error, fallback to LocalStorage');
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
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/legends`);
            if (res.ok) {
                const data = await res.json();
                return data.data;
            }
        } catch (err) {
            console.warn('API error, fallback to LocalStorage');
        }

        // LocalStorage Fallback
        let legends = JSON.parse(localStorage.getItem(STORAGE_KEYS.LEGENDS + projectId));
        if (!legends) {
            if (projectId === 1) {
                legends = getLocalSeedLegends();
            } else {
                legends = [];
            }
            localStorage.setItem(STORAGE_KEYS.LEGENDS + projectId, JSON.stringify(legends));
        }
        return legends;
    },

    // 5. Save/Update Legend
    async saveLegend(projectId, legend) {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/legends`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(legend)
            });
            if (res.ok) return await res.json();
        } catch (err) {
            console.warn('API error, fallback to LocalStorage');
        }

        // LocalStorage Fallback
        const legends = await this.getLegends(projectId);
        const upperCode = legend.code.trim().toUpperCase();
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
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/legends/${code}`, { method: 'DELETE' });
            if (res.ok) return await res.json();
        } catch (err) {
            console.warn('API error, fallback to LocalStorage');
        }

        // LocalStorage Fallback
        let legends = await this.getLegends(projectId);
        legends = legends.filter(l => l.code.toUpperCase() !== code.toUpperCase());
        localStorage.setItem(STORAGE_KEYS.LEGENDS + projectId, JSON.stringify(legends));
        return { message: 'Legend deleted' };
    },

    // 7. Save Schedules Batch
    async saveSchedules(projectId, items, clearExisting = true) {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, clearExisting })
            });
            if (res.ok) return await res.json();
        } catch (err) {
            console.warn('API error, fallback to LocalStorage');
        }

        // LocalStorage Fallback
        localStorage.setItem(STORAGE_KEYS.SCHEDULES + projectId, JSON.stringify(items));
        return { message: `Berhasil menyimpan ${items.length} data ke penyimpanan browser.` };
    }
};
