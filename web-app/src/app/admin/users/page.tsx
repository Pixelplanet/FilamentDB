
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/PageTransition';
import { User as UserIcon, Shield, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { User } from '@/lib/auth/types';
import { authFetch } from '@/lib/api';

export default function AdminUsersPage() {
    const { user, isAuthenticated } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            fetchUsers();
        }
    }, [isAuthenticated, user]);

    const fetchUsers = async () => {
        try {
            const res = await authFetch('/api/users');
            if (res.ok) {
                setUsers(await res.json());
            } else {
                setError('Failed to load users');
            }
        } catch {
            setError('Failed to connect');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (targetId: string, newRole: 'admin' | 'user') => {
        if (!confirm(`Are you sure you want to make this user ${newRole}?`)) return;

        try {
            const res = await authFetch(`/api/users/${targetId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            fetchUsers();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const handleDelete = async (targetId: string) => {
        if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

        try {
            const res = await authFetch(`/api/users/${targetId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            fetchUsers();
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (!user || user.role !== 'admin') {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    return (
        <PageTransition className="container mx-auto max-w-4xl p-4 space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
                    <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-gray-500">Manage access and roles</p>
                </div>
            </div>

            {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="p-4 font-medium text-gray-500">User</th>
                                <th className="p-4 font-medium text-gray-500">Role</th>
                                <th className="p-4 font-medium text-gray-500">Joined</th>
                                <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {users.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-gray-500" />
                                            </div>
                                            <div>
                                                <div className="font-medium">{u.displayName || u.username}</div>
                                                <div className="text-xs text-gray-500">@{u.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin'
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {u.id !== user.id && (
                                                <>
                                                    {u.role === 'user' ? (
                                                        <button
                                                            onClick={() => handleRoleChange(u.id, 'admin')}
                                                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                                            title="Promote to Admin"
                                                        >
                                                            <ArrowUpCircle className="w-5 h-5" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRoleChange(u.id, 'user')}
                                                            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                            title="Demote to User"
                                                        >
                                                            <ArrowDownCircle className="w-5 h-5" />
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleDelete(u.id)}
                                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete User"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </PageTransition>
    );
}
