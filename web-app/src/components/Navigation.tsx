'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Database, ScanLine, Menu, X, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ThemeToggle } from './ThemeToggle';
import { SyncStatus } from './SyncStatus';
import { UserMenu } from './UserMenu';

export function Navigation({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        CapacitorApp.addListener('backButton', ({ canGoBack }) => {
            if (pathname !== '/' || canGoBack) {
                // If we are not on root, try to go back
                // Or if webview thinks we can go back (might cover history stack within same route if handled)
                if (pathname !== '/') {
                    router.back();
                } else {
                    // If at root and no history, exit
                    CapacitorApp.exitApp();
                }
            } else {
                CapacitorApp.exitApp();
            }
        });

        return () => {
            CapacitorApp.removeAllListeners();
        };
    }, [pathname, router]);

    const links = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Inventory', href: '/inventory', icon: Database },
        { name: 'Scanner', href: '/scan', icon: ScanLine },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    const toggle = () => setIsOpen(!isOpen);

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
                <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center">
                        <ScanLine className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-orange-500">
                            FilamentDB
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <SyncStatus />
                        <ThemeToggle />
                        <UserMenu />
                    </div>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={clsx(
                                    'flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                )}
                            >
                                <Icon className={clsx('mr-3 h-5 w-5', isActive ? 'text-blue-700 dark:text-blue-200' : 'text-gray-400')} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Mobile Drawer */}
            <div className={clsx(
                "fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="absolute inset-0 bg-gray-600/75" onClick={toggle} />
                <div className="relative flex-1 flex flex-col max-w-xs w-full h-full bg-white dark:bg-gray-900">
                    <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-orange-500">FilamentDB</span>
                        <button onClick={toggle} className="p-1 rounded-md text-gray-400 hover:text-gray-500">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <nav className="px-4 py-6 space-y-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className={clsx(
                                        'flex items-center px-4 py-3 rounded-lg text-sm font-medium',
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200'
                                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                                    )}
                                >
                                    <Icon className={clsx('mr-3 h-5 w-5', isActive ? 'text-blue-700 dark:text-blue-200' : 'text-gray-400')} />
                                    {link.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Main Content Wrapper */}
            <div className="flex flex-col flex-1 md:pl-64 min-h-screen">
                {/* Mobile Header */}
                <header className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 md:hidden sticky top-0 z-10">
                    <div className="flex items-center">
                        <button onClick={toggle} className="text-gray-500 hover:text-gray-700 focus:outline-none">
                            <Menu className="h-6 w-6" />
                        </button>
                        <span className="ml-4 text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-orange-500">FilamentDB</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <SyncStatus />
                        <ThemeToggle />
                        <UserMenu />
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
