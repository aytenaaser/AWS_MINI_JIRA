import { useState, useEffect, useRef } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { api } from '@/services/api'
import { toaster } from '@/components/ui/toaster'

interface User {
    user_id: string
    email: string
    name?: string
    team_id: string
    role: string
}

export function CreateTaskDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [priority, setPriority] = useState('Medium')
    const [deadline, setDeadline] = useState('')
    const [assigneeId, setAssigneeId] = useState('')
    const [teamId, setTeamId] = useState('')
    const [users, setUsers] = useState<User[]>([])
    const [error, setError] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            api.getUsers()
                .then(data => setUsers(data))
                .catch(() => toaster('Failed to load users', 'error'))
        }
    }, [open])

    useEffect(() => {
        if (assigneeId) {
            const user = users.find(u => u.user_id === assigneeId)
            setTeamId(user?.team_id || '')
        } else {
            setTeamId('')
        }
    }, [assigneeId, users])

    const handleCreate = async () => {
        setError('')
        if (!title.trim()) { setError('Title is required'); return }
        if (!deadline) { setError('Deadline is required'); return }
        if (!assigneeId) { setError('Please select an assignee'); return }
        if (!teamId) { setError('No team associated with this assignee'); return }

        setUploading(true)
        try {
            // 1. Create the task
            const newTask = await api.createTask({
                title: title.trim(),
                description,
                priority,
                deadline,
                assignee_id: assigneeId,
                team_id: teamId,
                project_id: '00000000-0000-0000-0000-000000000000',
            })

            // 2. If an image was selected, upload it and link to the task
            if (imageFile && newTask.task_id) {
                const { uploadUrl, imageKey } = await api.getUploadUrl(newTask.task_id)
                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: imageFile,
                    headers: { 'Content-Type': imageFile.type || 'image/jpeg' },
                })
                await api.updateTask(newTask.task_id, { image_key: imageKey })
            }

            toaster('Task created', 'success')
            // Reset form
            setTitle(''); setDescription(''); setPriority('Medium'); setDeadline('')
            setAssigneeId(''); setTeamId(''); setImageFile(null); setError('')
            onCreated()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Failed to create task')
            toaster(err.message || 'Failed to create task', 'error')
        } finally {
            setUploading(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) setImageFile(file)
    }

    return (
        <Modal open={open} onClose={onClose}>
            <div className="space-y-4">
                <h2 className="text-lg font-bold">Create Task</h2>

                {error && (
                    <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded text-sm">
                        {error}
                    </div>
                )}

                <Input placeholder="Title *" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
                <Select
                    options={['Low','Medium','High','Critical'].map(v => ({ value: v, label: v }))}
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                />
                <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />

                <Select
                    options={[
                        { value: '', label: 'Select assignee *' },
                        ...users.map(u => ({ value: u.user_id, label: u.name || u.email })),
                    ]}
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                />

                <Input placeholder="Team (auto‑selected)" value={teamId} disabled className="bg-gray-100 cursor-not-allowed" />

                {/* Image Upload */}
                <div>
                    <label className="block text-sm font-medium mb-1">Attach Image (optional)</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        ref={fileInputRef}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {imageFile && <p className="text-xs text-gray-500 mt-1">{imageFile.name}</p>}
                </div>

                <Button onClick={handleCreate} disabled={uploading}>
                    {uploading ? 'Creating…' : 'Create'}
                </Button>
            </div>
        </Modal>
    )
}