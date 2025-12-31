'use client';

import { useState, useEffect } from 'react';
import { Spool } from '@/db';
import { Tag, Scale, Thermometer, Sparkles, Ruler, Save, Lock, Unlock, GripHorizontal, ChevronUp, ChevronDown, Columns } from 'lucide-react';
import { MaterialTagsSelector } from './MaterialTagsSelector';
import { FINISH_OPTIONS } from '@/app/inventory/constants';
import { CollapsibleSection } from './CollapsibleSection';
import { useMaterialProfiles } from '@/hooks/useMaterialProfiles';

// DnD Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Field Definitions ---

type FieldType = 'text' | 'number' | 'select' | 'color' | 'date' | 'read-only';

interface FieldDef {
    id: string; // keyof Spool
    label: string;
    type: FieldType;
    options?: { value: string; label: string }[];
    placeholder?: string;
    suffix?: string; // Unit suffix (e.g. "°C")
    span?: 1 | 2; // Col span
    readonlyValue?: string; // Static value if fixed
    transformValue?: (val: any) => any; // E.g. toUppercase
}

const SECTIONS: Record<string, FieldDef[]> = {
    'basic-info': [
        { id: 'brand', label: 'Brand', type: 'text', placeholder: 'e.g. Prusament' },
        { id: 'series', label: 'Series / Product Name', type: 'text', placeholder: 'e.g. PLA+' },
        { id: 'material_class', label: 'Material Class', type: 'read-only', readonlyValue: 'FFF (Filament)' },
        { id: 'type', label: 'Material Type', type: 'select', options: ['PLA', 'PETG', 'ASA', 'PC', 'TPU', 'ABS', 'PA', 'PVB', 'PVA', 'HIPS', 'PEI', 'PEKK', 'PEEK'].map(v => ({ value: v, label: v })) },
        { id: 'finish', label: 'Finish', type: 'select', options: FINISH_OPTIONS },
        { id: 'color', label: 'Color Name', type: 'text' },
        { id: 'colorHex', label: 'Color Hex', type: 'color', span: 2 },
    ],
    'weight-props': [
        { id: 'diameter', label: 'Diameter', type: 'number', suffix: 'mm' },
        { id: 'density', label: 'Density', type: 'number', suffix: 'g/cm³' },
        { id: 'weightTotal', label: 'Nominal Weight', type: 'number', suffix: 'g' },
        { id: 'weightRemaining', label: 'Remaining', type: 'number', suffix: 'g' },
        { id: 'weightSpool', label: 'Empty Spool', type: 'number', suffix: 'g' },
    ],
    'temperatures': [
        { id: 'temperatureNozzleMin', label: 'Nozzle Min', type: 'number', suffix: '°C' },
        { id: 'temperatureNozzleMax', label: 'Nozzle Max', type: 'number', suffix: '°C' },
        { id: 'temperatureBedMin', label: 'Bed Min', type: 'number', suffix: '°C' },
        { id: 'temperatureBedMax', label: 'Bed Max', type: 'number', suffix: '°C' },
    ],
    'identification': [
        { id: 'gtin', label: 'GTIN', type: 'text' },
        { id: 'productionDate', label: 'Manufactured Date', type: 'date' },
        { id: 'countryOfOrigin', label: 'Country of Origin (ISO)', type: 'text', transformValue: (v: string) => v.toUpperCase() },
        { id: 'transmissionDistance', label: 'HueForge TD', type: 'number' },
        { id: 'batchNumber', label: 'Batch Number', type: 'text' },
    ],
    'spool-dimensions': [
        { id: 'spoolWidth', label: 'Width', type: 'number', suffix: 'mm' },
        { id: 'spoolOuterDiameter', label: 'Outer Ø', type: 'number', suffix: 'mm' },
        { id: 'spoolInnerDiameter', label: 'Inner Ø', type: 'number', suffix: 'mm' },
        { id: 'spoolHoleDiameter', label: 'Hole Ø', type: 'number', suffix: 'mm' },
    ]
};

const GRID_COLS: Record<number, string> = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5'
};

// --- Components ---

function SortableField({ id, field, readOnly, value, onChange }: { id: string, field: FieldDef, readOnly: boolean, value: any, onChange: (id: string, val: any) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
    };

    const inputClass = `w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 ${readOnly ? 'opacity-70 cursor-not-allowed bg-gray-50 dark:bg-gray-800' : ''}`;

    // Color Input is special
    if (field.type === 'color') {
        return (
            <div ref={setNodeRef} style={style} className={`bg-white dark:bg-gray-800 p-1 relative group ${field.span === 2 ? 'col-span-1 md:col-span-2' : ''}`}>
                {!readOnly && (
                    <div {...attributes} {...listeners} className="absolute -top-2 -right-2 p-1 bg-gray-100 dark:bg-gray-700 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm border border-gray-200 dark:border-gray-600">
                        <GripHorizontal className="w-3 h-3 text-gray-500" />
                    </div>
                )}
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
                <div className="flex gap-2">
                    <input
                        type="color"
                        disabled={readOnly}
                        className="h-10 w-12 rounded cursor-pointer border p-1 bg-white dark:bg-gray-900 disabled:cursor-not-allowed"
                        value={value || '#000000'}
                        onChange={e => onChange(field.id, e.target.value)}
                    />
                    <input
                        disabled={readOnly}
                        className={`flex-1 ${inputClass} font-mono uppercase`}
                        value={value || ''}
                        onChange={e => onChange(field.id, e.target.value)}
                    />
                </div>
            </div>
        );
    }

    // Generic Input
    return (
        <div ref={setNodeRef} style={style} className={`relative group ${field.span === 2 ? 'col-span-1 md:col-span-2' : ''}`}>
            {!readOnly && (
                <div {...attributes} {...listeners} className="absolute top-0 right-0 p-1.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <GripHorizontal className="w-4 h-4 text-gray-400 dark:text-gray-600" />
                </div>
            )}
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.label}</label>
            <div className="relative flex items-center">
                {field.type === 'select' ? (
                    readOnly ? (
                        <input disabled value={value || ''} className={`capitalize ${inputClass}`} />
                    ) : (
                        <select
                            value={value || ''}
                            onChange={e => onChange(field.id, e.target.value)}
                            className={inputClass}
                        >
                            {field.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )
                ) : field.type === 'read-only' ? (
                    <input disabled value={field.readonlyValue} className={inputClass} />
                ) : (
                    <input
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        step={field.type === 'number' ? '0.01' : undefined}
                        disabled={readOnly}
                        value={value || ''}
                        onChange={e => {
                            let v = e.target.value;
                            if (field.transformValue) v = field.transformValue(v);
                            onChange(field.id, field.type === 'number' ? Number(v) : v);
                        }}
                        className={inputClass}
                        placeholder={field.placeholder}
                    />
                )}

                {field.suffix && (
                    <span className="absolute right-3 text-gray-500 dark:text-gray-400 text-sm pointer-events-none select-none">
                        {field.suffix}
                    </span>
                )}
            </div>
        </div>
    );
}

// --- Main Form ---

interface Props {
    initialData?: Partial<Spool>;
    onSubmit: (data: Partial<Spool>) => Promise<void>;
    isSubmitting: boolean;
    defaultReadOnly?: boolean;
    spoolId?: string; // For section persistence
    headerActions?: React.ReactNode;
}

export function SpoolForm({ initialData = {}, onSubmit, isSubmitting, defaultReadOnly = false, headerActions }: Props) {
    const { profiles } = useMaterialProfiles();

    const [formData, setFormData] = useState<Partial<Spool>>({
        brand: '',
        type: 'PLA',
        color: '',
        colorHex: '#000000',
        weightTotal: 1000,
        weightRemaining: 1000,
        weightSpool: 0,
        diameter: 1.75,
        density: 1.24,
        temperatureNozzleMin: 200,
        temperatureNozzleMax: 220,
        temperatureBedMin: 60,
        temperatureBedMax: 60,
        temperaturePreheat: 0,
        finish: 'plain',
        ...initialData
    });

    const [readOnly, setReadOnly] = useState(defaultReadOnly);
    const [sectionOrders, setSectionOrders] = useState<Record<string, string[]>>({});
    const [sectionColumns, setSectionColumns] = useState<Record<string, number>>({});

    // Init Logic
    useEffect(() => {
        const loadedOrders: Record<string, string[]> = {};
        const loadedCols: Record<string, number> = {};

        Object.keys(SECTIONS).forEach(secId => {
            // Load Order
            const storedOrder = localStorage.getItem(`filamentdb_order_${secId}`);
            if (storedOrder) {
                try {
                    loadedOrders[secId] = JSON.parse(storedOrder);
                } catch (e) {
                    loadedOrders[secId] = SECTIONS[secId].map(f => f.id);
                }
            } else {
                loadedOrders[secId] = SECTIONS[secId].map(f => f.id);
            }

            // Load Cols
            const storedCols = localStorage.getItem(`filamentdb_cols_${secId}`);
            if (storedCols) {
                loadedCols[secId] = Math.max(1, Math.min(5, parseInt(storedCols)));
            } else {
                // Default: Basic Info = 2, Others = 3
                loadedCols[secId] = secId === 'basic-info' ? 2 : 3;
            }
        });
        setSectionOrders(loadedOrders);
        setSectionColumns(loadedCols);
    }, []);

    // Sync initialData
    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => {
            const updates: any = { [field]: value };

            // Auto-fill from Profile if Type changes
            if (field === 'type') {
                const profile = profiles.find(p => p.type === value);
                if (profile) {
                    // Check if target fields are empty/zero (allowing overwrite of defaults if unchanged by user is tricky, 
                    // but we assume 0 or null is 'empty')
                    // Currently default state has specific values (200, 220, 60, 60).
                    // If we want "only if user leaves them empty", we check if they are equal to default OR empty.
                    // Or we just update them if they match the generic defaults.
                    // Since I cannot know if "200" came from generic default or user input easily without dirty checking,
                    // I will check if they are "falsy" (0 is falsy, but 0 temp is valid? No, typically not for nozzle).
                    // Actually, if a user selects "PLA", they expect PLA defaults. 
                    // I will check if the *current* value is falsy OR equals the hardcoded default (200, 220, 60...).

                    const isDefaultOrEmpty = (val: number | undefined, defaultVal: number) => !val || val === defaultVal || val === 0;

                    if (isDefaultOrEmpty(prev.temperatureNozzleMin, 200)) updates.temperatureNozzleMin = profile.temperatureNozzleMin;
                    if (isDefaultOrEmpty(prev.temperatureNozzleMax, 220)) updates.temperatureNozzleMax = profile.temperatureNozzleMax;
                    if (isDefaultOrEmpty(prev.temperatureBedMin, 60)) updates.temperatureBedMin = profile.temperatureBedMin;
                    if (isDefaultOrEmpty(prev.temperatureBedMax, 60)) updates.temperatureBedMax = profile.temperatureBedMax;
                    if (isDefaultOrEmpty(prev.density, 1.24)) updates.density = profile.density;
                }
            }
            return { ...prev, ...updates };
        });
    };

    // Sensor for DnD
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent, sectionId: string) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setSectionOrders(prev => {
                const oldOrder = prev[sectionId] || SECTIONS[sectionId].map(f => f.id);
                const oldIndex = oldOrder.indexOf(active.id as string);
                const newIndex = oldOrder.indexOf(over!.id as string);
                const newOrder = arrayMove(oldOrder, oldIndex, newIndex);

                // Persist
                localStorage.setItem(`filamentdb_order_${sectionId}`, JSON.stringify(newOrder));
                return { ...prev, [sectionId]: newOrder };
            });
        }
    };

    const updateColumns = (sectionId: string, increment: number) => {
        setSectionColumns(prev => {
            const current = prev[sectionId] || (sectionId === 'basic-info' ? 2 : 3);
            const newValue = Math.max(1, Math.min(5, current + increment));

            localStorage.setItem(`filamentdb_cols_${sectionId}`, String(newValue));
            return { ...prev, [sectionId]: newValue };
        });
    };

    const renderColumnControl = (sectionId: string) => {
        if (readOnly) return null;
        const cols = sectionColumns[sectionId] || (sectionId === 'basic-info' ? 2 : 3);

        return (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-700/80 rounded-md border border-gray-200 dark:border-gray-600 px-1 py-0.5 shadow-sm" onClick={e => e.stopPropagation()}>
                <Columns className="w-3 h-3 text-gray-500" />
                <span className="text-xs font-mono w-3 text-center">{cols}</span>
                <div className="flex flex-col -my-0.5">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateColumns(sectionId, 1); }}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-0.5 py-px text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                        <ChevronUp className="w-2 h-2" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateColumns(sectionId, -1); }}
                        className="hover:bg-gray-100 dark:hover:bg-gray-600 rounded px-0.5 py-px text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                    >
                        <ChevronDown className="w-2 h-2" />
                    </button>
                </div>
            </div>
        );
    };

    const renderSection = (title: string, id: string, icon: React.ReactNode) => {
        const fieldDefs = SECTIONS[id];
        const order = sectionOrders[id] || fieldDefs.map(f => f.id);
        const cols = sectionColumns[id] || (id === 'basic-info' ? 2 : 3);

        const orderedFields = order
            .map(fieldId => fieldDefs.find(f => f.id === fieldId))
            .filter(Boolean) as FieldDef[];

        fieldDefs.forEach(f => {
            if (!order.includes(f.id)) orderedFields.push(f);
        });

        // Inject Dynamic Options for 'type'
        const displayFields = orderedFields.map(f => {
            if (f.id === 'type' && profiles.length > 0) {
                return {
                    ...f,
                    options: profiles.map(p => ({ value: p.type, label: `${p.name} (${p.type})` }))
                };
            }
            return f;
        });

        const showControls = id !== 'basic-info';

        return (
            <CollapsibleSection
                title={title}
                id={id}
                icon={icon}
                extra={showControls ? renderColumnControl(id) : null}
            >
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, id)}>
                    <SortableContext items={displayFields.map(f => f.id)} strategy={rectSortingStrategy}>
                        <div className={`grid grid-cols-1 ${GRID_COLS[cols]} gap-4 transition-all duration-300`}>
                            {displayFields.map(field => (
                                <SortableField
                                    key={field.id}
                                    id={field.id}
                                    field={field}
                                    readOnly={readOnly}
                                    value={(formData as any)[field.id]}
                                    onChange={handleChange}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </CollapsibleSection>
        );
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex justify-end items-center gap-2 mb-4">
                {headerActions}
                <button
                    onClick={() => setReadOnly(!readOnly)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${readOnly
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                >
                    {readOnly ? (
                        <>
                            <Lock className="w-4 h-4" />
                            <span>Read Only</span>
                        </>
                    ) : (
                        <>
                            <Unlock className="w-4 h-4" />
                            <span>Editing</span>
                        </>
                    )}
                </button>
            </div>

            {renderSection("Basic Information", "basic-info", <Tag className="w-5 h-5" />)}
            {renderSection("Filament Properties & Weight", "weight-props", <Scale className="w-5 h-5" />)}
            {renderSection("Temperature Recommendations (°C)", "temperatures", <Thermometer className="w-5 h-5" />)}
            {renderSection("Identification & Origin", "identification", <Sparkles className="w-5 h-5" />)}

            {/* Material Tags - Static */}
            <CollapsibleSection title="Material Properties & Tags" id="material-tags" icon={<Tag className="w-5 h-5" />}>
                <MaterialTagsSelector
                    selectedTags={formData.tags || []}
                    onChange={tags => handleChange('tags', tags)}
                    readOnly={readOnly}
                />
            </CollapsibleSection>

            {renderSection("Spool Dimensions (mm)", "spool-dimensions", <Ruler className="w-5 h-5" />)}

            {!readOnly && (
                <div className="flex justify-end pt-4 sticky bottom-4 z-10 w-full bg-transparent pointer-events-none">
                    <button
                        onClick={() => onSubmit(formData)}
                        disabled={isSubmitting}
                        className="pointer-events-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </div>
    );
}
