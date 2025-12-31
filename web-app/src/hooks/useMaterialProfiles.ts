import useSWR from 'swr';
import { MaterialProfile } from '@/db';

// Simple fetcher
const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useMaterialProfiles() {
    const { data, error, isLoading, mutate } = useSWR<MaterialProfile[]>('/api/profiles', fetcher);

    const saveProfile = async (profile: MaterialProfile) => {
        const res = await fetch('/api/profiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profile)
        });
        if (!res.ok) throw new Error('Failed to save profile');
        mutate(); // Refresh
        return await res.json();
    };

    const deleteProfile = async (id: string) => {
        const res = await fetch(`/api/profiles?id=${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete profile');
        mutate();
    };

    return {
        profiles: data || [],
        loading: isLoading,
        error,
        saveProfile,
        deleteProfile,
        mutate
    };
}
