import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api'
import { Task, Comment } from '@/types'
import { toaster } from '@/components/ui/toaster'

export function TaskModal({ task, onClose, onTaskUpdated }: { task: Task | null; onClose: () => void; onTaskUpdated: () => void }) {
    const [comments, setComments] = useState<Comment[]>([])
    const [newComment, setNewComment] = useState('')
    const [uploading, setUploading] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [user, setUser] = useState<{ role: string } | null>(null) // <-- for delete permission

    useEffect(() => {
        if (task) {
            api.getComments(task.task_id).then(setComments).catch(() => setComments([]))
            if (task.image_key) {
                api.getImageUrl?.(task.task_id)
                    .then(data => setImageUrl(data.url))
                    .catch(() => {
                        setImageUrl(`https://my-minijira-originals-bucket.s3.amazonaws.com/${task.image_key}`)
                    })
            } else {
                setImageUrl(null)
            }
        }
    }, [task])

    // Fetch current user's role to decide if delete button should appear
    useEffect(() => {
        api.getMe().then(data => setUser(data)).catch(() => {})
    }, [])

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

    return (
        <Modal open={!!task} onClose={onClose}>
            <div className="space-y-4 max-h-[80vh] overflow-y-auto">
                <h2 className="text-xl font-bold">{task.title}</h2>
                <p className="text-sm text-gray-600">{task.description}</p>
                <div className="flex gap-2 text-xs">
                    <span className="bg-blue-100 px-2 py-1 rounded">{task.status}</span>
                    <span className="bg-yellow-100 px-2 py-1 rounded">{task.priority}</span>
                    <span>{task.deadline}</span>
                </div>

                {/* Delete button – visible only for Manager */}
                {user?.role === 'Manager' && (
                    <button
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-700 text-sm"
                    >
                        Delete Task
                    </button>
                )}

                {task.image_key && (
                    <a
                        href={imageUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block cursor-pointer hover:opacity-80"
                    >
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
                        <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment…" />
                        <Button onClick={handleAddComment}>Send</Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}