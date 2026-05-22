import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Task } from '@/types'

const priorityColors: Record<string, string> = {
    'Critical': 'bg-red-100 border-red-300 text-red-900',
    'High': 'bg-orange-100 border-orange-300 text-orange-900',
    'Medium': 'bg-yellow-100 border-yellow-300 text-yellow-900',
    'Low': 'bg-green-100 border-green-300 text-green-900',
}

export function TaskCard({ task, assigneeName, onOpen }: {
    task: Task;
    assigneeName: string;
    onOpen: () => void;
}) {
    const colorClass = priorityColors[task.priority] || 'bg-gray-100 border-gray-300 text-gray-900'

    return (
        <Card
            className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${colorClass}`}
            onClick={onOpen}
        >
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm">{task.title}</CardTitle>
                <p className="text-xs text-gray-500 mt-1">Assigned to: {assigneeName}</p>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-xs">
                <span className="bg-white bg-opacity-60 px-2 py-0.5 rounded font-medium">
                    {task.priority}
                </span>
                <span className="ml-2">{task.deadline}</span>
            </CardContent>
        </Card>
    )
}