import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/KanbanBoard'
import { TaskModal } from '@/components/TaskModal'
import { CreateTaskDialog } from '@/components/CreateTaskDialog'
import { TeamsManagement } from '@/pages/TeamsManagement'
import { ProjectsManagement } from '@/pages/ProjectsManagement'
import { Button } from '@/components/ui/button'
import { api } from '@/services/api'
import { Task, User, Team } from '@/types'
import { toaster } from '@/components/ui/toaster'

export function Dashboard() {
    const [allUsers, setAllUsers] = useState<User[]>([])
    const [allTeams, setAllTeams] = useState<Team[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [createOpen, setCreateOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<{
        userId: string; name: string; role: string; email: string; teamId?: string; teamName?: string;
    } | null>(null)
    const [showSection, setShowSection] = useState<'kanban' | 'teams' | 'projects'>('kanban')
    const [selectedTeam, setSelectedTeam] = useState<string>('All') // team filter

    const fetchTasks = async () => {
        try {
            const data = await api.getTasks()
            setTasks(data)
        } catch {
            toaster('Failed to load tasks', 'error')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        api.getMe()
            .then(userData => setUser(userData))
            .catch(() => console.warn('Could not fetch user info'))
            .finally(() => fetchTasks())
        api.getUsers().then(setAllUsers).catch(() => {})
        api.getTeams().then(setAllTeams).catch(() => {})
    }, [])

    // Filter tasks by team for manager view
    const filteredTasks = user?.role === 'Manager' && selectedTeam !== 'All'
        ? tasks.filter(t => t.team_id === selectedTeam)
        : tasks

    if (loading) return <div className="p-8 text-center">Loading tasks…</div>
    if (!user) return <div className="p-8 text-center">Loading user…</div>

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2">Hello, {user.name}!</h1>
            <p className="text-sm text-gray-600 mb-1">{user.email} ({user.role})</p>
            {user.role === 'Employee' && user.teamName && (
                <p className="text-sm text-blue-600 mb-4">Team: {user.teamName}</p>
            )}
            {user.role === 'Employee' && !user.teamName && (
                <p className="text-sm text-red-500 mb-4">Team: Unassigned</p>
            )}
            {user.role !== 'Employee' && <div className="mb-4" />}

            {/* Toggle buttons visible to everyone */}
            <div className="flex gap-2 mb-4">
                <Button
                    variant={showSection === 'kanban' ? 'default' : 'outline'}
                    onClick={() => setShowSection('kanban')}
                >
                    Kanban Board
                </Button>
                {user.role === 'Manager' && (
                    <Button
                        variant={showSection === 'teams' ? 'default' : 'outline'}
                        onClick={() => setShowSection('teams')}
                    >
                        Manage Teams
                    </Button>
                )}
                <Button
                    variant={showSection === 'projects' ? 'default' : 'outline'}
                    onClick={() => setShowSection('projects')}
                >
                    Projects
                </Button>
            </div>

            {/* Manager notice only on Kanban */}
            {user.role === 'Manager' && showSection === 'kanban' && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4 text-sm">
                    ⚠️ These are the tasks you have assigned to your employees. You can view and manage them, but they are not your personal assignments.
                </div>
            )}

            {/* Conditionally render the selected section */}
            {showSection === 'teams' && user.role === 'Manager' ? (
                <TeamsManagement currentUserRole={user.role} />
            ) : showSection === 'projects' ? (
                <ProjectsManagement user={user} />
            ) : (
                <>
                    {/* Team filter dropdown – Manager only */}
                    {user.role === 'Manager' && (
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-sm font-medium">Filter by Team:</span>
                            <select
                                value={selectedTeam}
                                onChange={e => setSelectedTeam(e.target.value)}
                                className="border rounded px-3 py-1 text-sm"
                            >
                                <option value="All">All Teams</option>
                                {allTeams.map(team => (
                                    <option key={team.team_id} value={team.team_id}>{team.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Kanban Board</h2>
                        {user.role === 'Manager' && (
                            <Button onClick={() => setCreateOpen(true)}>Create Task</Button>
                        )}
                    </div>

                    {filteredTasks.length === 0 ? (
                        <div className="text-center text-gray-500 py-20">No tasks yet. Create one!</div>
                    ) : (
                        <KanbanBoard
                            tasks={filteredTasks}
                            users={allUsers}
                            onSelectTask={setSelectedTask}
                            onTasksChange={fetchTasks}
                            currentUserId={user.userId}
                        />
                    )}
                    <TaskModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onTaskUpdated={fetchTasks}
                    />
                    <CreateTaskDialog
                        open={createOpen}
                        onClose={() => setCreateOpen(false)}
                        onCreated={fetchTasks}
                    />
                </>
            )}
        </div>
    )
}