
import React from 'react';
import { MATERIAL_TAG_CATEGORIES } from '@/app/inventory/constants';
import { Tag } from 'lucide-react';

interface Props {
    selectedTags: string[];
    onChange: (tags: string[]) => void;
    readOnly?: boolean;
}

export function MaterialTagsSelector({ selectedTags = [], onChange, readOnly = false }: Props) {
    const handleToggle = (tag: string) => {
        if (readOnly) return;
        if (selectedTags.includes(tag)) {
            onChange(selectedTags.filter(t => t !== tag));
        } else {
            onChange([...selectedTags, tag]);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4 text-pink-600 font-semibold">
                <Tag className="w-5 h-5" />
                <span>Material Properties & Tags</span>
            </div>

            <div className="space-y-6">
                {Object.entries(MATERIAL_TAG_CATEGORIES).map(([category, tags]) => (
                    <div key={category}>
                        <h4 className="text-xs uppercase font-bold text-gray-500 mb-2 border-b dark:border-gray-700 pb-1">
                            {category}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {tags.map(tag => (
                                <label key={tag} className={`flex items-start gap-2 text-sm p-1.5 rounded transition-colors ${readOnly ? 'cursor-default opacity-80' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600 disabled:opacity-50"
                                        checked={selectedTags.includes(tag)}
                                        onChange={() => handleToggle(tag)}
                                        disabled={readOnly}
                                    />
                                    <span className="leading-tight text-gray-700 dark:text-gray-300">{tag}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
