const API_URL = import.meta.env.VITE_API_URL

async function request(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('id_token')
    const headers: Record<string, string> = {
        ...(token && { Authorization: `Bearer ${token}` }),
    }
    // Only set Content-Type for methods that have a body
    if (options.method && options.method !== 'GET' && options.method !== 'HEAD') {
        headers['Content-Type'] = 'application/json'
    }
    const res = await fetch(`${API_URL}${path}`, { ...options, headers })
    if (!res.ok) {
        const errorText = await res.text()
        console.error('API error:', res.status, errorText)
        throw new Error(errorText)
    }
    return res.json()
}

export const api = {
    getTasks: () => request('/tasks'),
    createTask: (data: any) => request('/tasks', { method: 'POST', body: JSON.stringify(data) }),
    updateTask: (id: string, data: any) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getComments: (taskId: string) => request(`/comments/${taskId}`),
    addComment: (data: { task_id: string; text: string }) => request('/comments', { method: 'POST', body: JSON.stringify(data) }),
    getUploadUrl: (taskId: string) => request(`/tasks/${taskId}/upload-url`),
    getMe: async () => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
    getImageUrl: async (taskId: string) => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/tasks/${taskId}/image-url`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
    getUsers: async () => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
    getTeams: async () => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/teams`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },

    addUserToTeam: async (data: { user_id: string; team_id: string }) => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/teams/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },

    createTeam: async (data: { name: string }) => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/teams`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
    deleteTask: async (id: string) => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
    getProjects: async () => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/projects`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },

    createProject: async (data: { name: string; description: string; teams?: string[] }) => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
    deleteProject: async (id: string) => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
    deleteUser: async (id: string) => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/users/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
    deleteTeam: async (id: string) => {
        const token = localStorage.getItem('id_token')
        const res = await fetch(`${API_URL}/teams/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error(await res.text())
        return res.json()
    },
}