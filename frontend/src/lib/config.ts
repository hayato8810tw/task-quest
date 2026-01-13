// API設定
// 本番環境ではNEXT_PUBLIC_API_URL環境変数を設定してください
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const API_BASE_URL = `${API_URL}/api`;

// 認証付きfetchヘルパー
export function getAuthHeaders(): Record<string, string> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// 認証付きfetch
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const headers = {
        ...getAuthHeaders(),
        ...options.headers,
    };
    return fetch(url, { ...options, headers });
}
