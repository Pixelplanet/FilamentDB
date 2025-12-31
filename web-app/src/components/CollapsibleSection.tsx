'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
    title: string;
    id: string; // Unique ID for persistence
    children: React.ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    icon?: React.ReactNode;
    extra?: React.ReactNode; // Extra controls in header
}

export function CollapsibleSection({ title, id, children, defaultExpanded = true, className = '', icon, extra }: Props) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Load state from local storage on mount
        const stored = localStorage.getItem(`filamentdb_section_${id}`);
        if (stored !== null) {
            setIsExpanded(stored === 'true');
        }
        setIsLoaded(true);
    }, [id]);

    const toggle = () => {
        const newState = !isExpanded;
        setIsExpanded(newState);
        localStorage.setItem(`filamentdb_section_${id}`, String(newState));
    };

    if (!isLoaded) {
        // Render initial state to avoid hydration mismatch, or just render collapsed/expanded
        // Using defaultExpanded until loaded
    }

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
            <div
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                onClick={toggle}
                role="button"
                tabIndex={0}
            >
                <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
                    {icon && <span className="text-blue-500 dark:text-blue-400">{icon}</span>}
                    {title}
                </div>
                <div className="flex items-center gap-4">
                    {extra && (
                        <div onClick={(e) => e.stopPropagation()}>
                            {extra}
                        </div>
                    )}
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </div>
            </div>

            {isExpanded && (
                <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                    {children}
                </div>
            )}
        </div>
    );
}
