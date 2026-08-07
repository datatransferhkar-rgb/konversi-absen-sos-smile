const API_BASE = '/api';

const ApiService = {
    // 1. Fetch All Projects
    async getProjects() {
        try {
            const res = await fetch(`${API_BASE}/projects`);
            if (!res.ok) throw new Error('Gagal mengambil data project');
            const data = await res.json();
            return data.data;
        } catch (err) {
            console.warn('Backend API offline, mengalihkan ke LocalStorage:', err);
            return null;
        }
    },

    // 2. Add New Project
    async addProject(name) {
        try {
            const res = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal membuat project');
            return data.data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // 3. Delete Project
    async deleteProject(id) {
        try {
            const res = await fetch(`${API_BASE}/projects/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Gagal menghapus project');
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // 4. Get Legends per Project
    async getLegends(projectId) {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/legends`);
            if (!res.ok) throw new Error('Gagal mengambil data legenda');
            const data = await res.json();
            return data.data;
        } catch (err) {
            console.error('API Error:', err);
            return null;
        }
    },

    // 5. Save/Update Legend
    async saveLegend(projectId, legend) {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/legends`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(legend)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal menyimpan legenda');
            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // 6. Delete Legend
    async deleteLegend(projectId, code) {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/legends/${code}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Gagal menghapus legenda');
            return await res.json();
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    },

    // 7. Save Schedules Batch
    async saveSchedules(projectId, items, clearExisting = true) {
        try {
            const res = await fetch(`${API_BASE}/projects/${projectId}/schedules`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items, clearExisting })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Gagal menyimpan jadwal ke database');
            return data;
        } catch (err) {
            console.error('API Error:', err);
            throw err;
        }
    }
};
