import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { api } from '@/services/api'
import { Task, Comment } from '@/types'
import { toaster } from '@/components/ui/toaster'

interface User {
    user_id: string
    email: string
    name?: string
    team_id: string
    role: string
}

export function TaskModal({ task, onClose, onTaskUpdated }: { task: Task | null; onClose: () => void; onTaskUpdated: () => void }) {
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [uploading, setUploading] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [currentUser, setCurrentUser] = useState<{ role: string; userId: string } | null>(null)
    const [users, setUsers] = useState<User[]>([])

    // Inline edit state – initialised from the task
    const [editDescription, setEditDescription] = useState(task?.description || '')
    const [editPriority, setEditPriority] = useState(task?.priority || 'Medium')
    const [editDeadline, setEditDeadline] = useState(task?.deadline || '')
    const [editAssigneeId, setEditAssigneeId] = useState(task?.assignee_id || '')
    const [editTeamId, setEditTeamId] = useState(task?.team_id || '')
    const [saving, setSaving] = useState(false)

    // Reload state when the selected task changes
    useEffect(() => {
        if (task) {
            setEditDescription(task.description || '')
            setEditPriority(task.priority || 'Medium')
            setEditDeadline(task.deadline || '')
            setEditAssigneeId(task.assignee_id || '')
            setEditTeamId(task.team_id || '')
        }
    }, [task])

    // Fetch current user, users list, and comments
    useEffect(() => {
        if (task) {
            api.getComments(task.task_id).then(setComments).catch(() => setComments([]))
            if (task.image_key) {
                api.getImageUrl?.(task.task_id)
                    .then(data => setImageUrl(data.url))
                    .catch(() => setImageUrl(`https://my-minijira-originals-bucket.s3.amazonaws.com/${task.image_key}`))
            } else {
                setImageUrl(null)
            }
        }
    }, [task])

    useEffect(() => {
        api.getMe().then(data => setCurrentUser(data)).catch(() => {})
        api.getUsers().then(data => setUsers(data)).catch(() => {})
    }, [])

    // Auto‑fill team when assignee changes
    useEffect(() => {
        if (editAssigneeId) {
            const selectedUser = users.find(u => u.user_id === editAssigneeId)
            if (selectedUser) {
                setEditTeamId(selectedUser.team_id)
            }
        }
    }, [editAssigneeId, users])

    const handleSave = async () => {
        if (!task || currentUser?.role !== 'Manager') return;

        const updateBody: any = {};

        // Description
        if (editDescription !== task.description) {
            updateBody.description = editDescription;
        }
        // Priority
        if (editPriority !== task.priority) {
            updateBody.priority = editPriority;
        }
        // Deadline
        if (editDeadline !== task.deadline) {
            updateBody.deadline = editDeadline;
        }
        // Assignee and team: only include if the assignee is non‑empty and changed
        if (editAssigneeId && editAssigneeId !== task.assignee_id) {
            updateBody.assignee_id = editAssigneeId;
            updateBody.team_id = editTeamId;   // will be non‑empty because we have an assignee
        }

        if (Object.keys(updateBody).length === 0) {
            toaster('No changes to save', 'error');
            return;
        }

        setSaving(true);
        try {
            await api.updateTask(task.task_id, updateBody);
            toaster('Task updated', 'success');
            onTaskUpdated();
        } catch (err: any) {
            toaster(err.message || 'Failed to update task', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!task || !confirm('Are you sure you want to delete this task?')) return
        try {
            await api.deleteTask(task.task_id)
            toaster('Task deleted', 'success')
            onTaskUpdated()
            onClose()
        } catch {
            toaster('Failed to delete task', 'error')
        }
    }

    const handleAddComment = async () => {
        if (!newComment.trim() || !task) return
        try {
            await api.addComment({ task_id: task.task_id, text: newComment })
            setNewComment('')
            const updated = await api.getComments(task.task_id)
            setComments(updated)
            toaster('Comment added', 'success')
        } catch {
            toaster('Failed to add comment', 'error')
        }
    }

    const handleUploadImage = async () => {
        if (!task) return
        setUploading(true)
        try {
            const { uploadUrl, imageKey } = await api.getUploadUrl(task.task_id)
            const fileInput = document.createElement('input')
            fileInput.type = 'file'
            fileInput.accept = 'image/*'
            fileInput.onchange = async (e: any) => {
                const file = e.target.files[0]
                if (!file) return
                await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': 'image/jpeg' } })
                await api.updateTask(task.task_id, { image_key: imageKey })
                toaster('Image uploaded', 'success')
                onTaskUpdated()
            }
            fileInput.click()
        } catch {
            toaster('Failed to upload image', 'error')
        } finally {
            setUploading(false)
        }
    }
    if (!task) return null

    const isManager = currentUser?.role === 'Manager';

    return (
        <Modal open={!!task} onClose={onClose}>
            <div className="space-y-4 max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold">{task.title}</h2>

                {/* Description */}
                {isManager ? (
                    <Textarea
                        placeholder="Description"
                        value={editDescription}
                        onChange={e => setEditDescription(e.target.value)}
                    />
                ) : (
                    <p className="text-sm text-gray-600">{task.description}</p>
                )}

                {/* Priority */}
                {isManager ? (
                    <Select
                        options={['Low', 'Medium', 'High', 'Critical'].map(v => ({ value: v, label: v }))}
                        value={editPriority}
                        onChange={e => setEditPriority(e.target.value)}
                    />
                ) : (
                    <div className="flex gap-2 text-xs">
                        <span className="bg-yellow-100 px-2 py-1 rounded">{task.priority}</span>
                    </div>
                )}

                {/* Deadline */}
                {isManager ? (
                    <Input
                        type="date"
                        value={editDeadline}
                        onChange={e => setEditDeadline(e.target.value)}
                    />
                ) : (
                    <span className="text-sm">{task.deadline}</span>
                )}

                {/* Assignee and Team */}
                {isManager && (
                    <div className="space-y-2">
                        <Select
                            options={[
                                { value: '', label: 'Select assignee...' },
                                ...users.map(u => ({ value: u.user_id, label: u.name || u.email }))
                            ]}
                            value={editAssigneeId}
                            onChange={e => setEditAssigneeId(e.target.value)}
                        />
                        <Input
                            placeholder="Team (auto‑selected)"
                            value={editTeamId}
                            disabled
                            className="bg-gray-200 cursor-not-allowed"
                        />
                    </div>
                )}

                {/* Status badge (always visible, not editable inline) */}
                <div className="flex gap-2 text-xs">
                    <span className="bg-blue-100 px-2 py-1 rounded">{task.status}</span>
                    {!isManager && <span className="bg-yellow-100 px-2 py-1 rounded">{task.priority}</span>}
                </div>

                {/* Save / Cancel for manager */}
                {isManager && (
                    <div className="flex gap-2">
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                    </div>
                )}

                {/* Delete button (Manager only) */}
                {isManager && (
                    <button onClick={handleDelete} className="text-red-500 hover:text-red-700 text-sm">
                        Delete Task
                    </button>
                )}

                {/* Image section */}
                {task.image_key && (
                    <a href={imageUrl || '#'} target="_blank" rel="noopener noreferrer" className="block cursor-pointer hover:opacity-80">
                        <img
                            src={imageUrl || `https://my-minijira-originals-bucket.s3.amazonaws.com/${task.image_key}`}
                            alt="Attachment"
                            className="max-h-40 rounded"
                        />
                    </a>
                )}
                <Button variant="outline" onClick={handleUploadImage} disabled={uploading}>
                    {uploading ? 'Uploading…' : 'Upload Image'}
                </Button>

                {/* Comments */}
                <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">Comments</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {comments.map((c) => (
                            <div key={c.comment_id} className="text-sm bg-gray-50 p-2 rounded">
                                <p>{c.text}</p>
                                <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment…" />
                        <Button onClick={handleAddComment}>Send</Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}