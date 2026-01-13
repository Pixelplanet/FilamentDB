'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, LogOut, UserCircle, LogIn, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { clsx } from 'clsx';

interface UserMenuProps {
    align?: 'left' | 'right';
    direction?: 'up' | 'down';
}

export function UserMenu({ align = 'right', direction = 'down' }: UserMenuProps) {
    const { user, logout, isAuthEnabled } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    if (!user) {
        if (!isAuthEnabled) return null;

        return (
            <Link
                href="/login"
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                title="Log In"
            >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Log In</span>
            </Link>
        );
    }

    const handleLogout = async () => {
        await logout();
        setIsOpen(false);
        router.push('/login');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
            >
                {user.avatarUrl ? (
                    <img
                        src={user.avatarUrl}
                        alt={user.displayName || user.username}
                        className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <User className="w-5 h-5" />
                    </div>
                )}
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[100px] truncate">
                    {user.displayName || user.username}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={clsx(
                    "absolute w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100",
                    align === 'right' ? 'right-0' : 'left-0',
                    direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
                    direction === 'up' ? (align === 'right' ? 'origin-bottom-right' : 'origin-bottom-left') : (align === 'right' ? 'origin-top-right' : 'origin-top-left')
                )}>
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {user.displayName || user.username}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.role}
                        </p>
                    </div>

                    <div className="p-1">
                        <Link
                            href="/profile"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <UserCircle className="w-4 h-4" />
                            Profile
                        </Link>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
