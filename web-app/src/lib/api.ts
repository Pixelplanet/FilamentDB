
export function getApiUrl(path: string): string {
    const isMobile = process.env.NEXT_PUBLIC_BUILD_MODE === 'mobile';
    if (isMobile) {
        // Run on client side only
        if (typeof window !== 'undefined') {
            const serverUrl = localStorage.getItem('sync_server_url');
            if (serverUrl) {
                // Ensure no double slash
                const base = serverUrl.replace(/\/$/, '');
                const endpoint = path.startsWith('/') ? path : `/${path}`;
                return `${base}${endpoint}`;
            }
        }
    }
    return path; // Relative for Web
}

export async function authFetch(path: string, options: RequestInit = {}) {
    const url = getApiUrl(path);

    // Merge options
    const newOptions: RequestInit = {
        ...options,
        credentials: 'include', // Important for Cookies across origins (Mobile)
        headers: {
            ...options.headers,
            // If we have a token in localStorage (manual handling for mobile fallback?), add it?
            // Cookies are preferred.
        }
    };

    return fetch(url, newOptions);
}
