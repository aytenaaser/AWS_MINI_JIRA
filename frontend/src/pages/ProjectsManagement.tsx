import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/dialog'

interface Project {
    project_id: string
    name: string
    description: string
    teams: string[]
    created_by: string
    created_at: string
}

interface Team {
    team_id: string
    name: string
    members: string[]
}

export function ProjectsManagement({ user }: { user: { role: string } }) {
    const [projects, setProjects] = useState<Project[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [showCreate, setShowCreate] = useState(false)
    const [newName, setNewName] = useState('')
    const [newDescription, setNewDescription] = useState('')
    const [selectedTeams, setSelectedTeams] = useState<string[]>([])

    const fetchData = async () => {
        try {
            const [projectsData, teamsData] = await Promise.all([
                api.getProjects(),
                api.getTeams(),
            ])
            setProjects(projectsData)
            setTeams(teamsData)
        } catch {
            toaster('Failed to load data', 'error')
        }
    }

    useEffect(() => { fetchData() }, [])

    const handleCreate = async () => {
        if (!newName.trim()) {
            toaster('Project name is required', 'error')
            return
        }
        try {
            await api.createProject({
                name: newName.trim(),
                description: newDescription,
                teams: selectedTeams,
            })
            toaster('Project created', 'success')
            setNewName('')
            setNewDescription('')
            setSelectedTeams([])
            setShowCreate(false)
            fetchData()
        } catch (err: any) {
            toaster(err.message || 'Failed to create project', 'error')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this project?')) return
        try {
            await api.deleteProject(id)
            toaster('Project deleted', 'success')
            fetchData()
        } catch (err: any) {
            toaster(err.message || 'Failed to delete project', 'error')
        }
    }

    const toggleTeam = (teamId: string) => {
        setSelectedTeams(prev =>
            prev.includes(teamId) ? prev.filter(t => t !== teamId) : [...prev, teamId]
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Projects</h2>
                {user.role === 'Manager' && (
                    <Button onClick={() => setShowCreate(true)}>Create Project</Button>
                )}
            </div>

            {projects.length === 0 ? (
                <div className="text-center text-gray-500 py-10">No projects yet.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map(project => (
                        <div key={project.project_id} className="bg-white p-4 rounded shadow">
                            <h3 className="font-semibold">{project.name}</h3>
                            <p className="text-sm text-gray-600">{project.description}</p>
                            <div className="mt-2">
                                <span className="text-xs font-medium">Teams: </span>
                                {project.teams?.length > 0
                                    ? project.teams.map((teamId: string) => {
                                        const team = teams.find(t => t.team_id === teamId)
                                        return (
                                            <span key={teamId} className="text-xs bg-blue-100 px-2 py-0.5 rounded mr-1">
                          {team ? team.name : teamId}
                        </span>
                                        )
                                    })
                                    : <span className="text-xs text-gray-400">None</span>}
                            </div>
                            {user.role === 'Manager' && (
                                <button
                                    onClick={() => handleDelete(project.project_id)}
                                    className="text-red-500 hover:text-red-700 text-xs mt-2"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Project Modal */}
            <Modal open={showCreate} onClose={() => setShowCreate(false)}>
                <div className="space-y-4">
                    <h3 className="font-semibold">Create Project</h3>
                    <Input
                        placeholder="Project name *"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                    />
                    <Textarea
                        placeholder="Description"
                        value={newDescription}
                        onChange={e => setNewDescription(e.target.value)}
                    />

                    {/* Team multi‑select */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Assign Teams</label>
                        <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-1">
                            {teams.map(team => (
                                <label key={team.team_id} className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedTeams.includes(team.team_id)}
                                        onChange={() => toggleTeam(team.team_id)}
                                        className="form-checkbox h-4 w-4 text-blue-600"
                                    />
                                    <span>{team.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleCreate}>Create</Button>
                </div>
            </Modal>
        </div>
    )
}