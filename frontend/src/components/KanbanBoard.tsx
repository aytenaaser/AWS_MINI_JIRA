import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Task, User } from '@/types'
import { TaskCard } from './TaskCard'
import { api } from '@/services/api'
import { toaster } from '@/components/ui/toaster'

const columns = ['To Do', 'In Progress', 'In Review', 'Done']

export function KanbanBoard({ tasks, users, onSelectTask, onTasksChange, currentUserId }: {
    tasks: Task[]
    users: User[]
    onSelectTask: (task: Task) => void
    onTasksChange: () => void
    currentUserId: string
}) {
    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return
        const taskId = result.draggableId
        const newStatus = result.destination.droppableId as Task['status']
        try {
            await api.updateTask(taskId, { status: newStatus })
            toaster('Task moved', 'success')
            onTasksChange()
        } catch (err: any) {
            const message = err.message || 'Failed to move task'
            if (message.includes('You can only update your own tasks')) {
                toaster("You can only update your own tasks", 'error')
            } else {
                toaster(message, 'error')
            }
        }
    }

    const grouped = columns.reduce<Record<string, Task[]>>((acc, col) => {
        acc[col] = tasks.filter((t) => t.status === col)
        return acc
    }, {})

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-4 gap-4">
                {columns.map((col) => (
                    <Droppable droppableId={col} key={col}>
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="bg-gray-100 rounded p-2 min-h-[200px]">
                                <h2 className="font-semibold mb-2">{col}</h2>
                                {grouped[col].map((task, index) => {
                                    const assignee = users.find(u => u.user_id === task.assignee_id)
                                    const assigneeName = assignee ? (assignee.name || assignee.email) : 'Unassigned'
                                    return (
                                        <Draggable draggableId={task.task_id} index={index} key={task.task_id}>
                                            {(provided) => (
                                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="mb-2">
                                                    <TaskCard
                                                        task={task}
                                                        assigneeName={assigneeName}
                                                        onOpen={() => onSelectTask(task)}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    )
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                ))}
            </div>
        </DragDropContext>
    )
}