import { API_BASE_URL } from './config';
export { API_BASE_URL };

export interface LoginResponse {
    success: boolean;
    data?: {
        token: string;
        user: {
            id: string;
            display_name: string;
            level: number;
            available_points: number;
            role: string;
        };
    };
    error?: string;
}

export interface User {
    id: string;
    employee_id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    department: string;
    role: string;
    level: number;
    current_xp: number;
    total_points: number;
    available_points: number;
    login_streak: number;
    badges: Array<{
        id: string;
        name: string;
        description: string;
        icon_url: string;
    }>;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: string;
    difficulty: number;
    base_points: number;
    bonus_xp: number;
    deadline: string;
    status: string;
    tags: string[];
    epicId?: string;
    epic?: {
        id: string;
        title: string;
        project?: {
            id: string;
            title: string;
        };
    };
    created_by: { id: string; display_name: string };
    assigned_to: Array<{ id: string; display_name: string }>;
}

export async function login(employeeId: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, password }),
    });
    return res.json();
}

export async function getMe(token: string): Promise<{ success: boolean; data?: User; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function getTasks(token: string): Promise<{ success: boolean; data?: Task[]; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function claimLoginBonus(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/login-bonus/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function getLoginBonusStatus(token: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/login-bonus/status`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}

export async function completeTask(token: string, taskId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const res = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
}
