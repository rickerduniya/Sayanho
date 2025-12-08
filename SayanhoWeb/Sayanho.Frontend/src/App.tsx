import React, { useEffect, useState, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Canvas, CanvasRef } from './components/Canvas';
import { PropertiesPanel } from './components/PropertiesPanel';
import { MenuBar } from './components/MenuBar';
import { Toolbar } from './components/Toolbar';
import { CanvasTabs } from './components/CanvasTabs';
import { SettingsDialog } from './components/SettingsDialog';
import { VoltageDropCalculatorDialog } from './components/VoltageDropCalculatorDialog';
import { MobileDetector } from './components/MobileDetector';
import { ChatPanel } from './components/ChatPanel';
import { AutoRatingResultDialog } from './components/AutoRatingResultDialog';
import { SaveProjectDialog } from './components/SaveProjectDialog';

import { api } from './services/api';
import { useStore } from './store/useStore';
import { useTheme } from './context/ThemeContext';
import { apiTracer } from './utils/apiTracer';
import { updateItemVisuals } from './utils/SvgUpdater';
import type { CanvasSheet, CanvasItem } from './types';
import { Toast } from './components/Toast';

function App() {
    const { getCurrentSheet, setSheet, updateSheet, sheets, setSheets, undo, redo, calculateNetwork, addItem, selectItem, showCurrentValues, toggleShowCurrentValues, isPropertiesPanelOpen, isChatOpen, toggleChat } = useStore();
    const currentSheet = getCurrentSheet();
    const { colors, theme } = useTheme();

    // UI State
    const [showLeftPanel, setShowLeftPanel] = useState(true);
    const [showMenu, setShowMenu] = useState(true); // Toggle MenuBar visibility
    const [scale, setScale] = useState(1);
    const [panMode, setPanMode] = useState(false);
    const [isAddTextMode, setIsAddTextMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showVoltageDropDialog, setShowVoltageDropDialog] = useState(false);
    const [showAutoRatingResult, setShowAutoRatingResult] = useState(false);
    const [autoRatingSuccess, setAutoRatingSuccess] = useState(false);
    const [autoRatingMessage, setAutoRatingMessage] = useState('');

    // Dialog State
    const [showOpen, setShowOpen] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [diagrams, setDiagrams] = useState<{ id: string; name: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

    const canvasRef = useRef<CanvasRef>(null);

    // Set CSS custom property for mobile viewport height
    useEffect(() => {
        const setAppHeight = () => {
            const doc = document.documentElement;
            doc.style.setProperty('--app-height', `${window.innerHeight}px`);
        };

        setAppHeight();
        window.addEventListener('resize', setAppHeight);
        window.addEventListener('orientationchange', setAppHeight);

        return () => {
            window.removeEventListener('resize', setAppHeight);
            window.removeEventListener('orientationchange', setAppHeight);
        };
    }, []);

    // Keyboard Shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Open save dialog and fetch existing project names
    const handleSave = async () => {
        if (sheets.length === 0) return;
        try {
            // Fetch existing diagrams to check for duplicate names
            const list = await api.getDiagrams();
            setDiagrams(list || []);
            setShowSaveDialog(true);
        } catch (error) {
            console.error('Failed to fetch diagrams:', error);
            // Still show dialog, just won't have name validation
            setDiagrams([]);
            setShowSaveDialog(true);
        }
    };

    // Actually save the project with the given name
    const handleConfirmSave = async (projectName: string) => {
        if (sheets.length === 0) return;
        try {
            // Update the first sheet's name (project name)
            const updatedSheets = sheets.map((sheet, index) =>
                index === 0 ? { ...sheet, name: projectName } : sheet
            );
            setSheets(updatedSheets);

            await api.saveDiagram(updatedSheets);
            setShowSaveDialog(false);
            setToastMessage(`Project "${projectName}" saved successfully!`);
            setToastType('success');
        } catch (error) {
            console.error('Save failed:', error);
            setToastMessage('Save failed. Check console for details.');
            setToastType('error');
        }
    };

    const handleOpen = async () => {
        try {
            const list = await api.getDiagrams();
            setDiagrams(list || []);
            setSearchQuery(''); // Reset search when opening
            setShowOpen(true);
        } catch (e) {
            console.error('Failed to list diagrams', e);
        }
    };

    const loadDiagram = async (id: string) => {
        try {
            const loadedSheets = await api.getDiagram(id);

            // Restore SVG content for all items
            const restoredSheets = await Promise.all(loadedSheets.map(async (sheet) => {
                const restoredItems = await Promise.all(sheet.canvasItems.map(async (item) => {
                    // If svgContent is missing but iconPath exists, fetch the SVG
                    if (!item.svgContent && item.iconPath) {
                        try {
                            const iconName = item.iconPath.split('/').pop();
                            if (iconName) {
                                const url = encodeURI(api.getIconUrl(iconName));
                                const response = await fetch(url);
                                if (response.ok) {
                                    let svg = await response.text();

                                    // Apply visual updates if properties exist
                                    if (item.properties && item.properties[0]) {
                                        const { updateItemVisuals } = await import('./utils/SvgUpdater');
                                        const updatedSvg = updateItemVisuals({ ...item, svgContent: svg });
                                        if (updatedSvg) svg = updatedSvg;
                                    }

                                    return { ...item, svgContent: svg };
                                }
                            }
                        } catch (error) {
                            console.error('[loadDiagram] Failed to fetch SVG for', item.name, error);
                        }
                    }
                    return item;
                }));

                return {
                    ...sheet,
                    canvasItems: restoredItems
                };
            }));

            setSheets(restoredSheets);
            setShowOpen(false);

            // Trigger network analysis to regenerate currentValues
            // (currentValues are stripped from saved data to reduce payload size)
            setTimeout(() => {
                console.log('[loadDiagram] Regenerating network analysis...');
                calculateNetwork();
            }, 500); // Small delay to ensure sheets are loaded
        } catch (e) {
            console.error('Failed to load diagram', e);
        }
    };

    const handleGenerateEstimate = async () => {
        try {
            // Show loading state if needed
            const blob = await api.generateEstimate(sheets);

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `Estimate_${date}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating estimate:', error);
            alert('Failed to generate estimate. Please try again.');
        }
    };

    const handleCopyTrace = async () => {
        try {
            await apiTracer.copyToClipboard();
            alert('API trace copied to clipboard! You can now paste it for debugging.');
        } catch (error) {
            console.error('Failed to copy trace:', error);
            alert('Failed to copy trace to clipboard. Check console for details.');
        }
    };

    const handleDownloadReport = async () => {
        try {
            const blob = await api.downloadVoltageDropReport(sheets);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `VoltageDropReport_${date}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report.');
        }
    };

    // Toolbar Handlers
    const handleZoomIn = () => canvasRef.current?.zoomIn();
    const handleZoomOut = () => canvasRef.current?.zoomOut();
    const handleSaveImage = () => canvasRef.current?.saveImage();

    return (
        <div className="flex flex-col h-screen overflow-hidden select-none bg-background text-foreground relative">
            <MobileDetector />

            {/* Full Screen Canvas */}
            <div className="absolute inset-0 z-0">
                <Canvas
                    ref={canvasRef}
                    onScaleChange={setScale}
                    panMode={panMode}
                    isAddTextMode={isAddTextMode}
                    onAddTextComplete={() => setIsAddTextMode(false)}
                />
            </div>

            {/* Top Bar Area - Menu & Toolbar */}
            <div className="absolute top-0 left-0 right-0 z-50 p-2 pointer-events-none flex justify-between items-start">
                <div className="flex items-center gap-4 pointer-events-auto animate-slide-in-top w-full relative">
                    {/* Branding - in toolbar */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 -top-1 pointer-events-none z-50">
                        <h1 className="text-lg font-bold tracking-widest uppercase opacity-70" style={{ color: theme === 'dark' ? '#fff' : '#333' }}>Sayanho <span className="text-xs font-normal opacity-60">V1.1</span></h1>
                    </div>

                    {/* Menu Bar */}
                    {showMenu && (
                        <div className="premium-glass rounded-full px-3 py-1 z-50">
                            <MenuBar
                                onSettings={() => setShowSettings(true)}
                                onGenerateEstimate={handleGenerateEstimate}
                                onOpenVoltageDrop={() => setShowVoltageDropDialog(true)}
                            />
                        </div>
                    )}

                    {/* Toolbar - Centered relative to screen, independent of menu */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-0 pointer-events-auto">
                        <div className="premium-glass rounded-xl p-1.5 flex items-center h-[36px]"> {/* Fixed height to match menu */}
                            <Toolbar
                                onSave={handleSave}
                                onSaveImage={handleSaveImage}
                                onLoad={handleOpen}
                                onZoomIn={handleZoomIn}
                                onZoomOut={handleZoomOut}
                                scale={scale}
                                showLeftPanel={showLeftPanel}
                                onToggleLeftPanel={() => setShowLeftPanel(!showLeftPanel)}
                                showMenu={showMenu}
                                onToggleMenu={() => setShowMenu(!showMenu)}
                                showChat={isChatOpen}
                                onToggleChat={toggleChat}
                                onAutoRate={async () => {
                                    try {
                                        console.log('Starting auto-rating...');
                                        const updatedSheets = await api.autoRate(sheets);

                                        // Restore svgContent from original sheets (backend doesn't return it)
                                        updatedSheets.forEach((updatedSheet, sheetIndex) => {
                                            const originalSheet = sheets[sheetIndex];
                                            if (originalSheet) {
                                                updatedSheet.canvasItems.forEach(updatedItem => {
                                                    if (!updatedItem.svgContent) {
                                                        const originalItem = originalSheet.canvasItems.find(
                                                            orig => orig.uniqueID === updatedItem.uniqueID
                                                        );
                                                        if (originalItem?.svgContent) {
                                                            updatedItem.svgContent = originalItem.svgContent;
                                                        }
                                                    }
                                                });
                                            }
                                        });

                                        // Update visuals for all items in the returned sheets
                                        updatedSheets.forEach(sheet => {
                                            sheet.canvasItems.forEach(item => {
                                                const newSvg = updateItemVisuals(item);
                                                if (newSvg) {
                                                    item.svgContent = newSvg;
                                                }
                                            });
                                        });

                                        setSheets(updatedSheets);
                                        calculateNetwork();
                                        setAutoRatingSuccess(true);
                                        setAutoRatingMessage('Component ratings have been successfully updated based on network analysis.');
                                        setShowAutoRatingResult(true);
                                    } catch (error: any) {
                                        console.error('Auto-rating failed:', error);
                                        const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
                                        setAutoRatingSuccess(false);
                                        setAutoRatingMessage(`Auto-rating failed: ${errorMsg}\n\nPlease ensure:\n1. Network analysis has been run\n2. Electrical components are connected\n3. Database is accessible`);
                                        setShowAutoRatingResult(true);
                                    }
                                }}
                                onAddText={() => setIsAddTextMode(!isAddTextMode)}
                                isAddTextMode={isAddTextMode}
                                onUndo={undo}
                                onRedo={redo}
                                panMode={panMode}
                                onSetPanMode={setPanMode}
                                onCalculate={calculateNetwork}
                                onCopyTrace={handleCopyTrace}
                                showCurrentValues={showCurrentValues}
                                onToggleShowCurrentValues={toggleShowCurrentValues}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Left Sidebar - Floating & Extended to Bottom - Slimmer */}
            {showLeftPanel && (
                <div className="absolute left-4 top-12 bottom-4 w-56 z-40 premium-glass rounded-xl overflow-hidden flex flex-col transition-all duration-300 animate-slide-in-left">
                    <Sidebar />
                </div>
            )}

            {/* Right Properties Panel - Floating & Contextual - Slimmer */}
            <div className={`absolute right-4 top-12 bottom-4 w-64 z-40 pointer-events-none transition-opacity duration-300 ${isPropertiesPanelOpen ? 'opacity-100' : 'opacity-0'}`}>
                {isPropertiesPanelOpen && (
                    <div className="pointer-events-auto h-full premium-glass rounded-xl overflow-hidden flex flex-col animate-slide-in-right">
                        <PropertiesPanel />
                    </div>
                )}
            </div>

            {/* Bottom Tabs - Positioned after Sidebar and before Properties */}
            <div className={`absolute bottom-2 z-30 premium-glass rounded-full px-4 py-0.5 animate-slide-in-bottom transition-all duration-300 ${showLeftPanel ? 'left-64' : 'left-4'} right-80`}>
                <CanvasTabs />
            </div>

            {/* Chat Panel - Floating */}
            <ChatPanel />

            {/* Settings Dialog */}
            <SettingsDialog
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                onSave={() => calculateNetwork()} // Re-calculate when settings change
            />

            {/* Voltage Drop Calculator Dialog */}
            <VoltageDropCalculatorDialog
                isOpen={showVoltageDropDialog}
                onClose={() => setShowVoltageDropDialog(false)}
            />

            {/* Auto Rating Result Dialog */}
            <AutoRatingResultDialog
                isOpen={showAutoRatingResult}
                onClose={() => setShowAutoRatingResult(false)}
                onDownloadReport={handleDownloadReport}
                success={autoRatingSuccess}
                message={autoRatingMessage}
            />

            {/* Save Project Dialog */}
            <SaveProjectDialog
                isOpen={showSaveDialog}
                onClose={() => setShowSaveDialog(false)}
                onSave={handleConfirmSave}
                existingNames={diagrams.map(d => d.name)}
                currentName={sheets[0]?.name || 'Untitled Project'}
            />

            {/* Open Diagram Dialog */}
            {showOpen && (
                <div className="absolute inset-0 bg-black/30 flex items-start justify-center pt-24 z-50" onClick={() => setShowOpen(false)}>
                    <div
                        className="rounded-lg shadow-lg border w-[420px]"
                        style={{ backgroundColor: colors.panelBackground, borderColor: colors.border }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: colors.border }}>
                            <div className="font-semibold" style={{ color: colors.text }}>Open Diagram</div>
                            <button className="text-sm hover:opacity-70" style={{ color: colors.text }} onClick={() => setShowOpen(false)}>Close</button>
                        </div>

                        {/* Search Input */}
                        <div className="px-4 py-2 border-b" style={{ borderColor: colors.border }}>
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                style={{
                                    backgroundColor: colors.canvasBackground,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                                autoFocus
                            />
                        </div>

                        <div className="max-h-80 overflow-y-auto p-2">
                            {(() => {
                                const filteredDiagrams = diagrams.filter(d =>
                                    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    d.id.toLowerCase().includes(searchQuery.toLowerCase())
                                );

                                if (filteredDiagrams.length === 0) {
                                    return (
                                        <div className="text-sm p-3" style={{ color: colors.text }}>
                                            {diagrams.length === 0 ? 'No diagrams found.' : 'No matching projects.'}
                                        </div>
                                    );
                                }

                                return (
                                    <ul>
                                        {filteredDiagrams.map(d => (
                                            <li key={d.id}>
                                                <div className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded">
                                                    <button
                                                        onClick={() => loadDiagram(d.id)}
                                                        className="flex-1 text-left"
                                                        style={{ color: colors.text }}
                                                    >
                                                        <span className="text-sm">{d.name}</span>
                                                        <span className="text-xs opacity-50 ml-2">{d.id.slice(0, 8)}</span>
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm(`Delete project "${d.name}"?`)) {
                                                                try {
                                                                    await api.deleteProject(d.id);
                                                                    setToastMessage(`Project "${d.name}" deleted successfully!`);
                                                                    setToastType('success');
                                                                    // Refresh list
                                                                    const list = await api.getDiagrams();
                                                                    setDiagrams(list || []);
                                                                } catch (error: any) {
                                                                    // Handle 404 - project already deleted or doesn't exist
                                                                    if (error.response?.status === 404) {
                                                                        // Remove stale entry from local list
                                                                        setDiagrams(prev => prev.filter(p => p.id !== d.id));
                                                                        setToastMessage(`Project "${d.name}" was already deleted.`);
                                                                        setToastType('info');
                                                                    } else {
                                                                        console.error('Delete failed:', error);
                                                                        setToastMessage('Delete failed. Check console for details.');
                                                                        setToastType('error');
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Delete project"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
}

export default App;
