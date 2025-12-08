import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Edit2, MoreVertical } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTheme } from '../context/ThemeContext';

interface CanvasTabsProps {
    // No props needed, it connects to store directly
}

export const CanvasTabs: React.FC<CanvasTabsProps> = () => {
    const {
        sheets,
        activeSheetId,
        setActiveSheet,
        addSheet,
        removeSheet,
        renameSheet
    } = useStore();
    const { colors, theme } = useTheme();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, sheetId: string | null }>({
        visible: false,
        x: 0,
        y: 0,
        sheetId: null
    });

    const handleStartEdit = (id: string, currentName: string) => {
        setEditingId(id);
        setEditName(currentName);
    };

    const handleFinishEdit = () => {
        if (editingId && editName.trim()) {
            renameSheet(editingId, editName.trim());
        }
        setEditingId(null);
        setEditName('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleFinishEdit();
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

        if (sourceIndex === targetIndex) return;

        const newSheets = [...sheets];
        const [movedSheet] = newSheets.splice(sourceIndex, 1);
        newSheets.splice(targetIndex, 0, movedSheet);

        const currentActive = activeSheetId;
        const { setSheets, setActiveSheet } = useStore.getState();
        setSheets(newSheets);
        if (currentActive) setActiveSheet(currentActive);
    };

    const handleContextMenu = (e: React.MouseEvent, sheetId: string) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            sheetId
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu({ ...contextMenu, visible: false });
    };

    const handleMenuRename = (sheetId: string | null) => {
        if (sheetId) {
            const sheet = sheets.find(s => s.sheetId === sheetId);
            if (sheet) {
                handleStartEdit(sheet.sheetId, sheet.name);
            }
        }
        handleCloseContextMenu();
    };

    const handleMenuDelete = (sheetId: string | null) => {
        if (sheetId) {
            removeSheet(sheetId);
        }
        handleCloseContextMenu();
    };

    // Scroll active tab into view
    useEffect(() => {
        if (scrollContainerRef.current && activeSheetId) {
            const activeTab = scrollContainerRef.current.querySelector(`[data-sheet-id="${activeSheetId}"]`);
            if (activeTab) {
                activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [activeSheetId]);

    return (
        <>
            {/* Main Container - Full Width of Parent */}
            <div
                className="flex items-center h-9 select-none rounded-full px-1 gap-1 w-full"
                style={{
                    backgroundColor: colors.panelBackground
                    // Background handled by parent .premium-glass class in App.tsx PLUS this for extra darkness
                }}
            >
                {/* Scrollable Tabs Area */}
                <div
                    ref={scrollContainerRef}
                    className="flex items-center overflow-x-auto scrollbar-hide gap-1 px-1 flex-grow"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    {sheets.map((sheet, index) => {
                        const isActive = sheet.sheetId === activeSheetId;
                        return (
                            <div
                                key={sheet.sheetId}
                                data-sheet-id={sheet.sheetId}
                                draggable={!editingId}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                onClick={() => setActiveSheet(sheet.sheetId)}
                                onDoubleClick={() => handleStartEdit(sheet.sheetId, sheet.name)}
                                onContextMenu={(e) => handleContextMenu(e, sheet.sheetId)}
                                className={`
                                    flex items-center px-4 py-1 rounded-full min-w-[100px] max-w-[160px] group relative transition-all duration-200 flex-shrink-0
                                    ${isActive ? 'shadow-md scale-105 font-medium' : 'hover:bg-white/10 opacity-80 hover:opacity-100'}
                                    ${!editingId ? 'cursor-pointer' : 'cursor-text'}
                                `}
                                style={{
                                    backgroundColor: isActive ? (theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.8)') : 'transparent',
                                    color: colors.text,
                                    border: isActive ? `1px solid ${colors.border}` : '1px solid transparent'
                                }}
                            >
                                {editingId === sheet.sheetId ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onBlur={handleFinishEdit}
                                        onKeyDown={handleKeyDown}
                                        className="w-full bg-transparent outline-none text-sm text-center"
                                        style={{ color: colors.text }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="truncate text-sm w-full text-center">{sheet.name}</span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="h-4 w-[1px] bg-white/20 mx-1 flex-shrink-0"></div>

                {/* Fixed Add Button */}
                <button
                    onClick={() => addSheet()}
                    className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-white/20 transition-all active:scale-95 flex-shrink-0"
                    title="Add New Sheet"
                >
                    <Plus size={16} style={{ color: colors.text }} />
                </button>
            </div>

            {/* Context Menu - Rendered via Portal to escape stacking context */}
            {contextMenu.visible && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={handleCloseContextMenu}
                        onContextMenu={(e) => { e.preventDefault(); handleCloseContextMenu(); }}
                    />
                    <div
                        className="fixed z-[9999] premium-glass rounded-xl py-1 min-w-[140px] overflow-hidden animate-fade-in shadow-2xl border border-white/20"
                        style={{
                            top: contextMenu.y - 100, // Show above cursor
                            left: contextMenu.x,
                        }}
                    >
                        <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 flex items-center gap-2 transition-colors"
                            style={{ color: colors.text }}
                            onClick={() => handleMenuRename(contextMenu.sheetId)}
                        >
                            <Edit2 size={14} />
                            Rename
                        </button>
                        {sheets.length > 1 && (
                            <button
                                className="w-full text-left px-4 py-2 text-sm hover:bg-red-500/20 text-red-500 flex items-center gap-2 transition-colors"
                                onClick={() => handleMenuDelete(contextMenu.sheetId)}
                            >
                                <X size={14} />
                                Delete
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}
        </>
    );
};
