import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/dialog'

interface Team {
    team_id: string
    name: string
    members: string[]
}

interface User {
    user_id: string
    email: string
    name?: string
    team_id: string
    role: string
}

export function TeamsManagement({ currentUserRole }: { currentUserRole: string }) {
    const [teams, setTeams] = useState<Team[]>([])
    const [users, setUsers] = useState<User[]>([])
    const [selectedUser, setSelectedUser] = useState('')
    const [selectedTeam, setSelectedTeam] = useState('')
    const [newTeamName, setNewTeamName] = useState('')
    const [showCreateTeam, setShowCreateTeam] = useState(false)
    const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            const [teamsData, usersData] = await Promise.all([api.getTeams(), api.getUsers()])
            setTeams(teamsData)
            setUsers(usersData)
        } catch {
            toaster('Failed to load teams/users', 'error')
        }
    }

    useEffect(() => { fetchData() }, [])

    const handleAssign = async () => {
        if (!selectedUser || !selectedTeam) {
            toaster('Please select both user and team', 'error')
            return
        }
        try {
            await api.addUserToTeam({ user_id: selectedUser, team_id: selectedTeam })
            toaster('User assigned to team successfully', 'success')
            fetchData()
        } catch (err: any) {
            toaster(err.message || 'Failed to assign user to team', 'error')
        }
    }

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            toaster('Team name is required', 'error')
            return
        }
        try {
            await api.createTeam({ name: newTeamName.trim() })
            toaster('Team created', 'success')
            setNewTeamName('')
            setShowCreateTeam(false)
            fetchData()
        } catch (err: any) {
            toaster(err.message || 'Failed to create team', 'error')
        }
    }

    const handleDeleteTeam = async (teamId: string) => {
        if (!confirm('Delete this team? All members will become unassigned, and the team will be removed from all projects.')) return
        try {
            await api.deleteTeam(teamId)
            toaster('Team deleted', 'success')
            fetchData()
        } catch (err: any) {
            toaster(err.message || 'Failed to delete team', 'error')
        }
    }

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Delete this user? All their tasks will also be deleted.')) return
        try {
            await api.deleteUser(userId)
            toaster('User deleted', 'success')
            fetchData()
        } catch (err: any) {
            toaster(err.message || 'Failed to delete user', 'error')
        }
    }

    const toggleExpand = (teamId: string) => {
        setExpandedTeamId(prev => prev === teamId ? null : teamId)
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Teams Management</h2>

            {/* Assign user to team */}
            <div className="bg-white p-4 rounded shadow">
                <h3 className="font-semibold mb-2">Assign User to Team</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm mb-1">User</label>
                        <Select
                            options={[
                                { value: '', label: 'Select user...' },
                                ...users.map(u => ({ value: u.user_id, label: u.name || u.email })),
                            ]}
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm mb-1">Team</label>
                        <Select
                            options={[
                                { value: '', label: 'Select team...' },
                                ...teams.map(t => ({ value: t.team_id, label: t.name })),
                            ]}
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAssign}>Assign</Button>
                </div>
            </div>

            {/* Teams list with expandable members */}
            <div className="bg-white p-4 rounded shadow">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">Teams</h3>
                    <Button variant="outline" onClick={() => setShowCreateTeam(true)}>Create Team</Button>
                </div>
                <ul className="space-y-1">
                    {teams.map(team => (
                        <li key={team.team_id} className="border-b py-1 text-sm flex justify-between items-center">
                            <div
                                className="cursor-pointer hover:text-blue-600 font-medium"
                                onClick={() => toggleExpand(team.team_id)}
                            >
                                {team.name} ({team.members?.length || 0} members)
                            </div>
                            {currentUserRole === 'Manager' && (
                                <button
                                    className="text-red-500 hover:text-red-700 ml-2 text-xs"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team.team_id); }}
                                >
                                    Delete
                                </button>
                            )}
                            {expandedTeamId === team.team_id && (
                                <div className="pl-4 mt-1 text-gray-600 w-full">
                                    {team.members?.length > 0 ? (
                                        <ul className="space-y-1">
                                            {team.members.map((userId: string) => {
                                                const user = users.find(u => u.user_id === userId)
                                                return (
                                                    <li key={userId} className="text-xs flex justify-between items-center">
                                                        <span>{user ? (user.name || user.email) : userId}</span>
                                                        {currentUserRole === 'Manager' && (
                                                            <button
                                                                className="text-red-500 hover:text-red-700 ml-2"
                                                                onClick={() => handleDeleteUser(userId)}
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    ) : (
                                        <p className="text-xs italic">No members</p>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Create Team Modal */}
            <Modal open={showCreateTeam} onClose={() => setShowCreateTeam(false)}>
                <div className="space-y-4">
                    <h3 className="font-semibold">Create New Team</h3>
                    <Input
                        placeholder="Team name"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                    />
                    <Button onClick={handleCreateTeam}>Create</Button>
                </div>
            </Modal>
        </div>
    )
}