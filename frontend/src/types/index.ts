export interface Task {
    task_id: string
    title: string
    description: string
    status: 'To Do' | 'In Progress' | 'In Review' | 'Done'
    priority: string
    deadline: string
    assignee_id: string
    team_id: string
    project_id: string
    image_key?: string
    created_by: string
    created_at: string
    updated_at: string
}

export interface Comment {
    comment_id: string
    task_id: string
    user_id: string
    text: string
    created_at: string
}

export interface User {
    user_id: string; email: string; name?: string; team_id: string; role: string;
}
export interface Team {
    team_id: string; name: string; members: string[];
}