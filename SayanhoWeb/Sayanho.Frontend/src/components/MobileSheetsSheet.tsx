import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, FileText, Map } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLayoutStore } from '../store/useLayoutStore';
import { useTheme } from '../context/ThemeContext';

interface MobileSheetsSheetProps {
    onClose: () => void;
}

export const MobileSheetsSheet: React.FC<MobileSheetsSheetProps> = ({ onClose }) => {
    const { colors } = useTheme();
    const { sheets, activeSheetId, setActiveSheet, addSheet, removeSheet, renameSheet } = useStore();
    const {
        activeView,
        floorPlans,
        activeFloorPlanId,
        setActiveFloorPlan,
        addFloorPlan,
        removeFloorPlan,
        updateFloorPlan
    } = useLayoutStore();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleStartEdit = (id: string, name: string) => {
        setEditingId(id);
        setEditName(name);
    };

    const handleSaveEdit = (id: string) => {
        if (!editName.trim()) return;
        if (activeView === 'sld') {
            renameSheet(id, editName.trim());
        } else {
            updateFloorPlan(id, { name: editName.trim() });
        }
        setEditingId(null);
    };

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {activeView === 'sld' ? 'Schematic Sheets' : 'Floor Plans'} ({activeView === 'sld' ? sheets.length : floorPlans.length})
                </span>

                <button
                    type="button"
                    onClick={() => {
                        if (activeView === 'sld') {
                            addSheet();
                        } else {
                            addFloorPlan({ name: `Level ${floorPlans.length + 1}` });
                        }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 shadow-sm"
                >
                    <Plus size={14} />
                    <span>{activeView === 'sld' ? 'New Sheet' : 'New Plan'}</span>
                </button>
            </div>

            <div className="space-y-2">
                {activeView === 'sld' ? (
                    // SLD Sheets
                    sheets.map((sheet, index) => {
                        const isActive = sheet.sheetId === activeSheetId;
                        const isEditing = editingId === sheet.sheetId;

                        return (
                            <div
                                key={sheet.sheetId}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isActive ? 'bg-blue-600/15 border-blue-500/50' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <div
                                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                                    onClick={() => {
                                        if (!isEditing) {
                                            setActiveSheet(sheet.sheetId);
                                            onClose();
                                        }
                                    }}
                                >
                                    <FileText size={16} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit(sheet.sheetId);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            autoFocus
                                            className="px-2 py-1 text-xs rounded border border-blue-500 bg-black/20 focus:outline-none flex-1"
                                            style={{ color: colors.text }}
                                        />
                                    ) : (
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-xs font-medium truncate ${isActive ? 'text-blue-400' : ''}`}>
                                                {sheet.name}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {sheet.canvasItems.length} items · {sheet.storedConnectors.length} wires
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {isEditing ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSaveEdit(sheet.sheetId)}
                                            className="p-1.5 text-green-500 hover:text-green-400"
                                            title="Save"
                                        >
                                            <Check size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(sheet.sheetId, sheet.name)}
                                            className="p-1.5 text-slate-400 hover:text-slate-200"
                                            title="Rename"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}

                                    {sheets.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm(`Delete sheet "${sheet.name}"?`)) {
                                                    removeSheet(sheet.sheetId);
                                                }
                                            }}
                                            className="p-1.5 text-red-400 hover:text-red-300"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Layout Floor Plans
                    floorPlans.map((plan) => {
                        const isActive = plan.id === activeFloorPlanId;
                        const isEditing = editingId === plan.id;

                        return (
                            <div
                                key={plan.id}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isActive ? 'bg-blue-600/15 border-blue-500/50' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <div
                                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                                    onClick={() => {
                                        if (!isEditing) {
                                            setActiveFloorPlan(plan.id);
                                            onClose();
                                        }
                                    }}
                                >
                                    <Map size={16} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEdit(plan.id);
                                                if (e.key === 'Escape') setEditingId(null);
                                            }}
                                            autoFocus
                                            className="px-2 py-1 text-xs rounded border border-blue-500 bg-black/20 focus:outline-none flex-1"
                                            style={{ color: colors.text }}
                                        />
                                    ) : (
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-xs font-medium truncate ${isActive ? 'text-blue-400' : ''}`}>
                                                {plan.name}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {plan.walls.length} walls · {plan.components.length} components · {plan.rooms.length} rooms
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {isEditing ? (
                                        <button
                                            type="button"
                                            onClick={() => handleSaveEdit(plan.id)}
                                            className="p-1.5 text-green-500 hover:text-green-400"
                                            title="Save"
                                        >
                                            <Check size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(plan.id, plan.name)}
                                            className="p-1.5 text-slate-400 hover:text-slate-200"
                                            title="Rename"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                    )}

                                    {floorPlans.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm(`Delete floor plan "${plan.name}"?`)) {
                                                    removeFloorPlan(plan.id);
                                                }
                                            }}
                                            className="p-1.5 text-red-400 hover:text-red-300"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
