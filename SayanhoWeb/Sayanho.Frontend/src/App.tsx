import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { AgentPanel } from './components/AgentPanel';
import { AutoRatingResultDialog } from './components/AutoRatingResultDialog';

import { SaveProjectDialog } from './components/SaveProjectDialog';
import { NetworkMonitor } from './components/NetworkMonitor';

// Layout Designer imports
import { LayoutDesigner, LayoutDesignerRef } from './components/LayoutDesigner';
import { LayoutSidebar } from './components/LayoutSidebar';
import { LayoutInspector } from './components/LayoutInspector';
import { ViewModeToggle } from './components/ViewModeToggle';
import { useLayoutStore } from './store/useLayoutStore';
import { useIsMobile } from './hooks/useIsMobile';
import { MobileNavBar } from './components/MobileNavBar';
import { MobileBottomSheet } from './components/MobileBottomSheet';
import { MobileToolsSheet } from './components/MobileToolsSheet';
import { MobileSheetsSheet } from './components/MobileSheetsSheet';
import { MobileAISheet } from './components/MobileAISheet';

import { api } from './services/api';
import { useStore } from './store/useStore';
import { useTheme } from './context/ThemeContext';
import { apiTracer } from './utils/apiTracer';
import { updateItemVisuals } from './utils/SvgUpdater';
import { applyAutoArrange } from './utils/AutoArrange';
import { ApplicationSettings } from './utils/ApplicationSettings';
import { exportProjectToFile, importProjectFromFile } from './utils/LocalProjectService';
import { Toast } from './components/Toast';
import { ServerStatusBanner } from './components/ServerStatusBanner';
import { DetectionStatusBanner } from './components/DetectionStatusBanner';
import { BrowserRouter, Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import {
    ChevronDown, LogOut, User, Undo, Redo, MessageSquare, Bot, Sun, Moon,
    MousePointer2, Hand, ZoomIn, ZoomOut, RotateCcw, Maximize, LayoutGrid,
    Zap, Eye, EyeOff, Type, PanelLeftClose, PanelLeftOpen, PanelRight,
    Pencil, Square, DoorOpen, Grid3X3, ArrowUpFromLine, Sparkles, Ruler, Layers, GitBranch, Check
} from 'lucide-react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import { useAuth } from './auth/AuthContext';

function DesignerApp() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { getCurrentSheet, setSheet, updateSheet, sheets, setSheets, applyAutoRatingResults, undo, redo, calculateNetwork, addItem, selectItem, showCurrentValues, toggleShowCurrentValues, isPropertiesPanelOpen, isChatOpen, toggleChat } = useStore();
    const currentSheet = getCurrentSheet();
    const { colors, theme, toggleTheme } = useTheme();

    // Layout store - for view mode toggle and layout tools
    const {
        activeView,
        drawingState,
        setActiveTool,
        setWallThickness,
        setContinuousWallMode,
        visibility: { showWalls, showDoors, showWindows, showRooms },
        setLayoutVisibility
    } = useLayoutStore();
    const activeTool = drawingState.activeTool;

    // UI State
    const isMobile = useIsMobile();
    const [activeMobileSheet, setActiveMobileSheet] = useState<'components' | 'properties' | 'tools' | 'sheets' | 'ai' | null>(null);
    const [showLeftPanel, setShowLeftPanel] = useState(true);
    const [showMenu, setShowMenu] = useState(true); // Toggle MenuBar visibility
    const [scale, setScale] = useState(1);
    const [panMode, setPanMode] = useState(false);
    const [isAddTextMode, setIsAddTextMode] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAccountMenu, setShowAccountMenu] = useState(false);
    const [showLayersMenu, setShowLayersMenu] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);

    const layersButtonRef = useRef<HTMLButtonElement>(null);
    const [layersMenuPos, setLayersMenuPos] = useState({ top: 0, left: 0 });

    const handleToggleLayersMenu = () => {
        if (!showLayersMenu && layersButtonRef.current) {
            const rect = layersButtonRef.current.getBoundingClientRect();
            setLayersMenuPos({
                top: rect.bottom + 6,
                left: Math.max(10, rect.left - 40)
            });
        }
        setShowLayersMenu(prev => !prev);
    };

    const accountButtonRef = useRef<HTMLButtonElement>(null);
    const [accountMenuPos, setAccountMenuPos] = useState({ top: 0, right: 0 });

    const handleToggleAccountMenu = () => {
        if (!showAccountMenu && accountButtonRef.current) {
            const rect = accountButtonRef.current.getBoundingClientRect();
            setAccountMenuPos({
                top: rect.bottom + 6,
                right: Math.max(10, window.innerWidth - rect.right)
            });
        }
        setShowAccountMenu(prev => !prev);
    };

    const [showVoltageDropDialog, setShowVoltageDropDialog] = useState(false);
    const [showNetworkMonitor, setShowNetworkMonitor] = useState(false);
    const [showAgentPanel, setShowAgentPanel] = useState(false);
    const [showAutoRatingResult, setShowAutoRatingResult] = useState(false);
    const [autoRatingSuccess, setAutoRatingSuccess] = useState(false);
    const [autoRatingMessage, setAutoRatingMessage] = useState('');
    const [autoRatingLog, setAutoRatingLog] = useState('');

    // Dialog State
    const [showOpen, setShowOpen] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [diagrams, setDiagrams] = useState<{ id: string; name: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
    const [toastDuration, setToastDuration] = useState(3000);

    const canvasRef = useRef<CanvasRef>(null);
    const layoutRef = useRef<LayoutDesignerRef>(null);

    const handleLogout = async () => {
        setIsSigningOut(true);
        try {
            await logout();
            navigate('/auth', { replace: true });
        } finally {
            setIsSigningOut(false);
            setShowAccountMenu(false);
        }
    };

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

    // Backend cold start is handled globally by serverWakeService (started in
    // main.tsx before mount) and surfaced by <ServerStatusBanner />. It used to
    // be a useEffect here, which meant the wake-up only began once the user had
    // already logged in and reached the designer — exactly when they are about
    // to need the backend. Waking from the landing page hides the delay instead.

    // Keyboard Shortcuts for Undo/Redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented) return;
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (activeView === 'layout') useLayoutStore.getState().redo();
                    else redo();
                } else {
                    if (activeView === 'layout') useLayoutStore.getState().undo();
                    else undo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                if (activeView === 'layout') useLayoutStore.getState().redo();
                else redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeView, undo, redo]);

    // SLD→Layout Sync: Clean Layout staging when SLD items are deleted (while in SLD mode)
    // This effect mirrors the reverse sync in LayoutDesigner but runs when in SLD mode
    const prevSldItemCountRef = useRef<number>(0);

    useEffect(() => {
        // Only run in SLD mode
        if (activeView !== 'sld') return;

        // Get all SLD canvas items across all sheets
        const allSldItems = sheets.flatMap(s => s.canvasItems);
        const currentCount = allSldItems.length;
        const prevCount = prevSldItemCountRef.current;

        // Track count changes
        prevSldItemCountRef.current = currentCount;

        // Only clean when items are REMOVED (count decreased)
        if (currentCount >= prevCount && prevCount !== 0) return;

        // Build set of all existing SLD item IDs
        const existingSldIds = new Set(allSldItems.map(i => i.uniqueID));

        // Get current Layout staging
        const layoutState = useLayoutStore.getState();
        const currentLayoutStaging = layoutState.stagingComponents;

        // Clean Layout staging: remove components whose sldItemId no longer exists
        const cleanedLayoutStaging = currentLayoutStaging.filter(comp => {
            if (!comp.sldItemId) return true; // Keep unlinked components
            return existingSldIds.has(comp.sldItemId);
        });

        if (cleanedLayoutStaging.length !== currentLayoutStaging.length) {
            console.log(`[App/SLD] Cleaning ${currentLayoutStaging.length - cleanedLayoutStaging.length} stale Layout staging components`);
            layoutState.setStagingComponents(cleanedLayoutStaging);
        }
    }, [activeView, sheets]);

    // Quick Save: If we know the project ID, overwrite it. If not, open dialog.
    const handleSave = async () => {
        if (sheets.length === 0) return;

        if (currentProjectId) {
            // Overwrite existing project
            try {
                const currentName = diagrams.find(d => d.id === currentProjectId)?.name || sheets[0]?.name || 'Untitled Project';
                await api.saveDiagram(sheets, currentName, currentProjectId);

                setToastMessage(`Project "${currentName}" saved successfully!`);
                setToastType('success');

                // Refresh list and ensure name consistency (optional, but good practice)
                const list = await api.getDiagrams();
                setDiagrams(list || []);
            } catch (error) {
                console.error('Save failed:', error);
                setToastMessage('Save failed. Check console for details.');
                setToastType('error');
            }
        } else {
            // Treat as "Save As" (new project)
            handleSaveAs();
        }
    };

    // Save As: Always open dialog to pick a name. Use null ID to force creation.
    const handleSaveAs = async () => {
        if (sheets.length === 0) return;
        try {
            const list = await api.getDiagrams();
            setDiagrams(list || []);
            setShowSaveDialog(true);
        } catch (error) {
            console.error('Failed to fetch diagrams:', error);
            setDiagrams([]);
            setShowSaveDialog(true);
        }
    };

    // Callback from Dialog
    const handleConfirmSave = async (projectName: string) => {
        if (sheets.length === 0) return;
        try {
            // NOTE: "Save As" logic implies creating a NEW project or overwriting a DIFFERENT one selected by name.
            // Since SaveProjectDialog currently enforces unique names (or effectively selects existing via name match),
            // we check if the name matches an existing project to get its ID, or pass null for a new one.
            // If the user picked a name that exists, we overwrite THAT project.
            // If the user picked a new name, we create a NEW project.

            const existing = diagrams.find(d => d.name.toLowerCase() === projectName.toLowerCase());
            const targetProjectId = existing ? existing.id : null;

            // API Call
            await api.saveDiagram(sheets, projectName, targetProjectId);

            setShowSaveDialog(false);
            setToastMessage(`Project "${projectName}" saved successfully!`);
            setToastType('success');

            // Refresh list
            const list = await api.getDiagrams();
            setDiagrams(list || []);

            // IMPORTANT: If we just saved successfully, this should become the "Current Project"
            // We need to find the ID of the project we just saved.
            if (targetProjectId) {
                setCurrentProjectId(targetProjectId);
            } else {
                // We created a new project. The API doesn't return the ID directly in all cases,
                // but we can find it by name in the refreshed list.
                const newList = list || [];
                const newProj = newList.find((d: { id: string; name: string }) => d.name.toLowerCase() === projectName.toLowerCase());
                if (newProj) {
                    setCurrentProjectId(newProj.id);
                }
            }

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
                    if (item.name === 'Portal' && !item.svgContent) {
                        // Regenerate Portal SVG based on properties
                        const meta = (item.properties?.[0] || {}) as Record<string, string>;
                        const dir = (meta['Direction'] || meta['direction'] || 'out').toLowerCase();

                        const w = item.size?.width || 60;
                        const h = item.size?.height || 40;

                        const arrow = dir === 'in'
                            ? `<path d="M ${w / 2} ${h * 0.7} L ${w / 2} ${h * 0.3} M ${w / 2} ${h * 0.3} L ${(w / 2) - 6} ${h * 0.3 + 6} M ${w / 2} ${h * 0.3} L ${(w / 2) + 6} ${h * 0.3 + 6}" stroke="#111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
                            : `<path d="M ${w / 2} ${h * 0.3} L ${w / 2} ${h * 0.7} M ${w / 2} ${h * 0.7} L ${(w / 2) - 6} ${h * 0.7 - 6} M ${w / 2} ${h * 0.7} L ${(w / 2) + 6} ${h * 0.7 - 6}" stroke="#111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

                        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="6" ry="6" fill="#fff" stroke="#111" stroke-width="2"/>
  ${arrow}
</svg>`;
                        return { ...item, svgContent: svg };
                    }

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
            setCurrentProjectId(id); // Set current project ID
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

    const handleAutoRate = async () => {
        try {
            console.log('Starting auto-rating...');
            const response = await api.autoRate(sheets);
            const { sheets: updatedSheets, log, success, message } = response;

            setAutoRatingLog(log);

            if (!success) {
                setAutoRatingSuccess(false);
                setAutoRatingMessage(message || 'Auto-rating validation failed.');
                setShowAutoRatingResult(true);
                return;
            }

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

            // USE NEW STORE ACTION TO PRESERVE UNDO HISTORY
            applyAutoRatingResults(updatedSheets);

            // calculateNetwork is called inside applyAutoRatingResults, but calling again doesn't hurt if logic differs.
            // The logic in applyAutoRatingResults calls calculateNetwork.

            setAutoRatingSuccess(true);
            setAutoRatingMessage(message || 'Component ratings have been successfully updated based on network analysis.');
            setShowAutoRatingResult(true);
        } catch (error: any) {
            console.error('Auto-rating failed:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
            const errorLog = error.response?.data?.log || '';
            setAutoRatingSuccess(false);
            setAutoRatingMessage(`Auto-rating failed: ${errorMsg}\n\nPlease ensure:\n1. Network analysis has been run\n2. Electrical components are connected\n3. Database is accessible`);
            setAutoRatingLog(errorLog);
            setShowAutoRatingResult(true);
        }
    };

    // Toolbar Handlers
    const handleZoomIn = () => canvasRef.current?.zoomIn();
    const handleZoomOut = () => canvasRef.current?.zoomOut();
    const handleSetZoom = (newScale: number) => canvasRef.current?.setZoom(newScale);
    const handleResetZoom = () => {
        if (canvasRef.current) {
            canvasRef.current.resetZoom();
        }
    };
    const handleFitContent = () => {
        if (canvasRef.current) {
            // @ts-ignore - fitView is newly added
            canvasRef.current.fitView();
        }
    };

    const handleAutoArrange = () => {
        const st = useStore.getState();
        const sheet = st.getCurrentSheet();
        if (!sheet) return;
        st.takeSnapshot();
        const newItems = applyAutoArrange(sheet.canvasItems, sheet.storedConnectors, ApplicationSettings.getSldDownstreamGapFactor());
        st.updateSheet({ canvasItems: newItems }, { recalcNetwork: false });
    };
    const handleSaveImage = () => {
        if (activeView === 'layout') {
            layoutRef.current?.saveImage();
            return;
        }
        canvasRef.current?.saveImage();
    };

    // =========================================================================
    // Local File Save/Load Handlers
    // =========================================================================

    const handleSaveLocal = async () => {
        if (sheets.length === 0) {
            setToastMessage('Nothing to save — add some components first.');
            setToastType('info');
            setToastDuration(3000);
            return;
        }

        try {
            const layoutState = useLayoutStore.getState();
            const projectName =
                diagrams.find(d => d.id === currentProjectId)?.name ||
                sheets[0]?.name ||
                'Untitled Project';

            await exportProjectToFile(
                sheets,
                layoutState.floorPlans,
                layoutState.activeFloorPlanId,
                layoutState.stagingComponents,
                Array.from(layoutState.placedStagingComponentIds),
                projectName
            );

            setToastMessage(`Project "${projectName}" saved to file!`);
            setToastType('success');
            setToastDuration(3000);
        } catch (error: any) {
            // User cancelled the save dialog — not a real error
            if (error?.message === 'CANCELLED') return;
            console.error('Local save failed:', error);
            setToastMessage('Failed to save project to file.');
            setToastType('error');
            setToastDuration(3000);
        }
    };

    const handleLoadLocal = async () => {
        try {
            const result = await importProjectFromFile();

            if (!result.success) {
                // User cancelled — don't show an error
                if (result.error === 'Cancelled') return;
                setToastMessage(result.error || 'Failed to load project file.');
                setToastType('error');
                setToastDuration(4000);
                return;
            }

            // 1. Set SLD sheets
            setSheets(result.sheets);

            // 2. Restore layout state if present
            const layoutData = (result as any).layoutData;
            if (layoutData) {
                useLayoutStore.getState().loadProject(
                    layoutData.floorPlans || [],
                    layoutData.activeFloorPlanId || null,
                    layoutData.stagingComponents || [],
                    layoutData.placedStagingComponentIds || []
                );
            }

            // 3. Clear cloud project association (local file is not tied to cloud)
            setCurrentProjectId(null);

            // 4. Trigger network analysis to regenerate computed values
            setTimeout(() => {
                console.log('[handleLoadLocal] Regenerating network analysis...');
                calculateNetwork();
            }, 500);

            setToastMessage(`Project "${result.projectName}" loaded from file!`);
            setToastType('success');
            setToastDuration(3000);
        } catch (error) {
            console.error('Local load failed:', error);
            setToastMessage('Failed to load project file.');
            setToastType('error');
            setToastDuration(3000);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden select-none bg-background text-foreground relative">
            <MobileDetector />

            {/* Full Screen Canvas - Conditional based on view mode */}
            {activeView === 'layout' ? (
                <LayoutDesigner
                    ref={layoutRef}
                    showLeftPanel={showLeftPanel}
                    showChat={isChatOpen}
                    onToggleChat={toggleChat}
                    showAgent={showAgentPanel}
                    onToggleAgent={() => setShowAgentPanel(prev => !prev)}
                    isMobile={isMobile}
                />
            ) : (
                <div className="absolute inset-0 z-0">
                    <Canvas
                        ref={canvasRef}
                        onScaleChange={setScale}
                        panMode={panMode}
                        isAddTextMode={isAddTextMode}
                        onAddTextComplete={() => setIsAddTextMode(false)}
                    />
                </div>
            )}

            {/* Master Studio Header (Extreme Top Bar - No Floating Toolbar) */}
            <header
                className={`relative z-50 flex ${isMobile ? 'h-11 px-2' : 'h-10 px-2'} w-full shrink-0 items-center justify-between border-b backdrop-blur-xl shadow-sm select-none`}
                style={{
                    backgroundColor: colors.panelBackground,
                    borderColor: colors.border,
                    color: colors.text
                }}
            >
                {/* Left Section: Brand, Menus & View Mode Toggle */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 mr-0.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-[11px] font-bold text-white shadow-sm shadow-blue-500/20 shrink-0">
                            ⚡
                        </div>
                        <div className="flex flex-col justify-center leading-none">
                            <span className="font-bold text-xs tracking-wider uppercase leading-none">
                                Sayanho
                            </span>
                            <span className="text-[9px] font-semibold text-blue-500 dark:text-blue-400 tracking-wider leading-none mt-0.5">
                                v2.0
                            </span>
                        </div>
                    </div>

                    <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-700 mx-0.5" />

                    {showMenu && (
                        <MenuBar
                            onLoad={handleOpen}
                            onSave={handleSave}
                            onSaveAs={handleSaveAs}
                            onSaveImage={handleSaveImage}
                            onSettings={() => setShowSettings(true)}
                            onGenerateEstimate={handleGenerateEstimate}
                            onOpenVoltageDrop={() => setShowVoltageDropDialog(true)}
                            onOpenNetworkMonitor={() => setShowNetworkMonitor(true)}
                            onSaveLocal={handleSaveLocal}
                            onLoadLocal={handleLoadLocal}
                            isMobile={isMobile}
                        />
                    )}

                    {!isMobile && (
                        <>
                            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-700 mx-0.5" />
                            <ViewModeToggle />
                        </>
                    )}
                </div>

                {/* Center Section: View Mode Toggle on Mobile, Contextual Tools on Desktop */}
                {isMobile ? (
                    <div className="flex items-center justify-center mx-auto">
                        <ViewModeToggle />
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 mx-auto">
                        {activeView === 'sld' ? (
                            // ================= SLD TOOLS =================
                            <div className="flex items-center gap-1 shrink-0">
                            {/* Select / Pan */}
                            <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-0.5 border border-border/50">
                                <button
                                    type="button"
                                    onClick={() => setPanMode(false)}
                                    title="Select Mode (V)"
                                    className={`p-1 rounded-md transition-all ${!panMode ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <MousePointer2 size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPanMode(true)}
                                    title="Pan Canvas Mode (H / Space)"
                                    className={`p-1 rounded-md transition-all ${panMode ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <Hand size={13} />
                                </button>
                            </div>

                            <div className="h-3.5 w-px bg-border/60 mx-0.5" />

                            {/* Zoom & Arrange Controls */}
                            <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-lg p-0.5 border border-border/50">
                                <button
                                    type="button"
                                    onClick={handleZoomOut}
                                    title="Zoom Out"
                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                                >
                                    <ZoomOut size={13} />
                                </button>
                                <div className="flex items-center px-0.5">
                                    <input
                                        type="number"
                                        value={Math.round(scale * 100)}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val) && val > 0 && val <= 500) {
                                                handleSetZoom(val / 100);
                                            }
                                        }}
                                        className="w-8 text-[11px] font-mono text-center bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded appearance-none"
                                        style={{ color: colors.text }}
                                        min="10"
                                        max="500"
                                    />
                                    <span className="text-[10px] font-mono opacity-50">%</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleZoomIn}
                                    title="Zoom In"
                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                                >
                                    <ZoomIn size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleResetZoom}
                                    title="Reset Zoom (65%)"
                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                                >
                                    <RotateCcw size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFitContent}
                                    title="Fit Content"
                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                                >
                                    <Maximize size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAutoArrange}
                                    title="Auto Arrange"
                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                                >
                                    <LayoutGrid size={13} />
                                </button>
                            </div>

                            <div className="h-3.5 w-px bg-border/60 mx-0.5" />

                            {/* Electrical Actions */}
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={handleAutoRate}
                                    title="Run Auto-Rating Analysis"
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all shadow-sm"
                                >
                                    <Zap size={13} className="fill-amber-500/30" />
                                    <span className="hidden xl:inline">Auto-Rate</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleShowCurrentValues}
                                    title={showCurrentValues ? "Hide Current Values" : "Show Calculated Current Values"}
                                    className={`p-1 rounded-lg border transition-all ${showCurrentValues ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-border/50 hover:bg-black/5 dark:hover:bg-white/10'}`}
                                >
                                    {showCurrentValues ? <Eye size={13} /> : <EyeOff size={13} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsAddTextMode(!isAddTextMode)}
                                    title="Add Text Label"
                                    className={`p-1 rounded-lg border transition-all ${isAddTextMode ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-border/50 hover:bg-black/5 dark:hover:bg-white/10'}`}
                                >
                                    <Type size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowLeftPanel(!showLeftPanel)}
                                    title={showLeftPanel ? "Hide Component Library" : "Show Component Library"}
                                    className={`p-1 rounded-lg border transition-all ${showLeftPanel ? 'bg-black/10 dark:bg-white/15 border-border' : 'border-border/50 opacity-60 hover:opacity-100'}`}
                                >
                                    {showLeftPanel ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        // ================= LAYOUT TOOLS =================
                        <div className="flex items-center gap-1 shrink-0">
                            {/* Select / Pan */}
                            <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-0.5 border border-border/50">
                                <button
                                    type="button"
                                    onClick={() => setActiveTool('select')}
                                    title="Select Tool (V)"
                                    className={`p-1 rounded-md transition-all ${activeTool === 'select' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <MousePointer2 size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTool('pan')}
                                    title="Pan Tool (Space)"
                                    className={`p-1 rounded-md transition-all ${activeTool === 'pan' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <Hand size={13} />
                                </button>
                            </div>

                            <div className="h-3.5 w-px bg-border/60 mx-0.5" />

                            {/* Drawing Tools */}
                            <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-lg p-0.5 border border-border/50 gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => setActiveTool('wall')}
                                    title="Draw Wall (W)"
                                    className={`p-1 rounded-md transition-all ${activeTool === 'wall' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <Pencil size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTool('room')}
                                    title="Draw Room (R)"
                                    className={`p-1 rounded-md transition-all ${activeTool === 'room' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <Square size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTool('door')}
                                    title="Add Door (D)"
                                    className={`p-1 rounded-md transition-all ${activeTool === 'door' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <DoorOpen size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTool('window')}
                                    title="Add Window (N)"
                                    className={`p-1 rounded-md transition-all ${activeTool === 'window' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <Grid3X3 size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTool('stair')}
                                    title="Add Stairs (S)"
                                    className={`p-1 rounded-md transition-all ${activeTool === 'stair' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70'}`}
                                >
                                    <ArrowUpFromLine size={13} />
                                </button>
                            </div>

                            {/* Wall Thickness sub-control when wall active */}
                            {activeTool === 'wall' && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs animate-fade-in">
                                    <span className="text-[10px] font-bold uppercase opacity-60">T:</span>
                                    <input
                                        type="number"
                                        min="2"
                                        max="80"
                                        value={drawingState.wallThickness}
                                        onChange={(e) => setWallThickness(parseInt(e.target.value) || 10)}
                                        className="w-7 bg-transparent text-center font-mono focus:outline-none text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setContinuousWallMode(!drawingState.continuousWallMode)}
                                        title={drawingState.continuousWallMode ? "Continuous Mode ON" : "Single Line Mode"}
                                        className={`p-0.5 rounded ${drawingState.continuousWallMode ? 'text-blue-500 font-bold' : 'opacity-40'}`}
                                    >
                                        <Sparkles size={11} />
                                    </button>
                                </div>
                            )}

                            <div className="h-3.5 w-px bg-border/60 mx-0.5" />

                            {/* Calibration, Layers, Connection */}
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => layoutRef.current?.calibrateScale()}
                                    title="Calibrate Scale"
                                    className={`p-1 rounded-lg border transition-all ${activeTool === 'calibrate' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-border/50 hover:bg-black/5 dark:hover:bg-white/10'}`}
                                >
                                    <Ruler size={13} />
                                </button>

                                {/* LAYER TOGGLE BUTTON - Triggers unclipped portal */}
                                <button
                                    ref={layersButtonRef}
                                    type="button"
                                    onClick={handleToggleLayersMenu}
                                    title="Toggle Architectural Layers Visibility"
                                    className={`p-1 rounded-lg border transition-all ${showLayersMenu ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-border/50 hover:bg-black/5 dark:hover:bg-white/10'}`}
                                >
                                    <Layers size={13} />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setActiveTool(activeTool === 'connection' ? 'select' : 'connection')}
                                    title="Connect Components Mode (C)"
                                    className={`p-1 rounded-lg border transition-all ${activeTool === 'connection' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'border-border/50 hover:bg-black/5 dark:hover:bg-white/10'}`}
                                >
                                    <GitBranch size={13} />
                                </button>

                                {/* Layout Zoom Controls */}
                                <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-lg p-0.5 border border-border/50">
                                    <button
                                        type="button"
                                        onClick={() => layoutRef.current?.zoomOut()}
                                        title="Zoom Out"
                                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                                    >
                                        <ZoomOut size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => layoutRef.current?.fitView()}
                                        title="Fit Floor Plan to Screen"
                                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                                    >
                                        <Maximize size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => layoutRef.current?.zoomIn()}
                                        title="Zoom In"
                                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
                                    >
                                        <ZoomIn size={13} />
                                    </button>
                                </div>

                                {/* Panel Toggles */}
                                <button
                                    type="button"
                                    onClick={() => setShowLeftPanel(!showLeftPanel)}
                                    title={showLeftPanel ? "Hide Layout Sidebar" : "Show Layout Sidebar"}
                                    className={`p-1 rounded-lg border transition-all ${showLeftPanel ? 'bg-black/10 dark:bg-white/15 border-border' : 'border-border/50 opacity-60 hover:opacity-100'}`}
                                >
                                    {showLeftPanel ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => layoutRef.current?.toggleInspector()}
                                    title="Toggle Properties Panel"
                                    className="p-1 rounded-lg border border-border/50 hover:bg-black/5 dark:hover:bg-white/10 transition-all"
                                >
                                    <PanelRight size={13} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                )}

                {/* Right Section: Undo/Redo, AI Chat, Agent, Theme, User Icon ONLY */}
                <div className="flex items-center gap-1 shrink-0">
                    {/* Quick Undo / Redo */}
                    <div className="flex items-center gap-0.5 mr-0.5">
                        <button
                            type="button"
                            onClick={() => {
                                if (activeView === 'layout') useLayoutStore.getState().undo();
                                else undo();
                            }}
                            title="Undo (Ctrl+Z)"
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            style={{ color: colors.text }}
                        >
                            <Undo size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (activeView === 'layout') useLayoutStore.getState().redo();
                                else redo();
                            }}
                            title="Redo (Ctrl+Y)"
                            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            style={{ color: colors.text }}
                        >
                            <Redo size={13} />
                        </button>
                    </div>

                    {/* AI Triggers: Mobile Header 1-tap Bot Trigger vs Desktop Slim Icons */}
                    {isMobile ? (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setShowAgentPanel(prev => !prev)}
                                title="Autonomous Design Agent"
                                aria-label="Autonomous Design Agent"
                                className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl transition-all active:scale-95 ${showAgentPanel ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'}`}
                            >
                                <Bot size={18} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-700 mx-0.5" />

                            {/* AI Chat & Agent Triggers (Desktop) */}
                            <button
                                type="button"
                                onClick={toggleChat}
                                title="AI Design Assistant"
                                className={`p-1 rounded-lg transition-all ${isChatOpen ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                                style={isChatOpen ? undefined : { color: colors.text }}
                            >
                                <MessageSquare size={13} />
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowAgentPanel(prev => !prev)}
                                title="Autonomous Design Agent"
                                className={`p-1 rounded-lg transition-all ${showAgentPanel ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                                style={showAgentPanel ? undefined : { color: colors.text }}
                            >
                                <Bot size={13} />
                            </button>
                        </>
                    )}

                    <div className="h-3.5 w-px bg-gray-300 dark:bg-gray-700 mx-0.5" />

                    {/* Theme Toggle (min 36x36px on mobile, p-1 on desktop) */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 p-1 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        style={{ color: colors.text }}
                    >
                        {theme === 'dark' ? <Sun size={isMobile ? 16 : 13} /> : <Moon size={isMobile ? 16 : 13} />}
                    </button>

                    {/* User Account Avatar ONLY (no full name in top bar) */}
                    {user && (
                        <div className="relative ml-0.5">
                            <button
                                ref={accountButtonRef}
                                type="button"
                                onClick={handleToggleAccountMenu}
                                className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg cursor-pointer"
                                title={`Account: ${user.displayName || user.email}`}
                                aria-expanded={showAccountMenu}
                                aria-label="Open account menu"
                            >
                                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-sm ring-2 ring-transparent hover:ring-blue-400 transition-all shrink-0">
                                    {(user.displayName || user.email).trim().charAt(0).toUpperCase()}
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Left Sidebar (SLD mode only - floating right below docked top bar, pushed outwards, Desktop only) */}
            {activeView === 'sld' && showLeftPanel && !isMobile && (
                <div className="absolute left-1.5 top-11 bottom-2 w-44 z-40 premium-glass rounded-xl overflow-hidden flex flex-col transition-all duration-300 animate-slide-in-left shadow-xl">
                    <Sidebar />
                </div>
            )}

            {/* Right Properties Panel (SLD mode only - floating right below docked top bar, pushed outwards, Desktop only) */}
            {activeView === 'sld' && !isMobile && (
                <div className={`absolute right-1.5 top-11 bottom-2 w-48 z-40 pointer-events-none transition-opacity duration-300 ${isPropertiesPanelOpen ? 'opacity-100' : 'opacity-0'}`}>
                    {isPropertiesPanelOpen && (
                        <div className="pointer-events-auto h-full premium-glass rounded-xl overflow-hidden flex flex-col animate-slide-in-right shadow-xl">
                            <PropertiesPanel />
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Tabs (SLD mode only - hugging bottom edge, moving outwards, Desktop only) */}
            {activeView === 'sld' && !isMobile && (
                <div className={`absolute bottom-1 z-30 premium-glass rounded-full px-2 py-0.5 animate-slide-in-bottom transition-all duration-300 ${showLeftPanel ? 'left-48' : 'left-2'} ${isPropertiesPanelOpen ? 'right-52' : 'right-2'}`}>
                    <CanvasTabs />
                </div>
            )}

            {/* Mobile Bottom Navigation Bar & Mobile Bottom Sheets */}
            {isMobile && (
                <>
                    {/* Floating Quick Zoom Pill (Large Male-Thumb Touch Friendly: 44-48px targets) */}
                    <div className="fixed bottom-[74px] right-3 z-30 flex items-center bg-slate-900/95 text-white border border-slate-700/80 rounded-full p-1 shadow-2xl backdrop-blur-md gap-1">
                        <button
                            type="button"
                            onClick={activeView === 'layout' ? () => layoutRef.current?.zoomOut() : handleZoomOut}
                            className="w-11 h-11 flex items-center justify-center hover:bg-white/10 active:bg-white/20 rounded-full text-slate-200 transition-all active:scale-95"
                            title="Zoom Out"
                            aria-label="Zoom Out"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={activeView === 'layout' ? () => layoutRef.current?.fitView() : handleFitContent}
                            className="h-11 px-3.5 flex items-center justify-center hover:bg-white/10 active:bg-white/20 rounded-full text-xs font-bold text-slate-200 tracking-wider transition-all active:scale-95 font-mono"
                            title="Fit View"
                            aria-label="Fit View"
                        >
                            FIT
                        </button>
                        <button
                            type="button"
                            onClick={activeView === 'layout' ? () => layoutRef.current?.zoomIn() : handleZoomIn}
                            className="w-11 h-11 flex items-center justify-center hover:bg-white/10 active:bg-white/20 rounded-full text-slate-200 transition-all active:scale-95"
                            title="Zoom In"
                            aria-label="Zoom In"
                        >
                            <ZoomIn size={18} />
                        </button>
                    </div>

                    <MobileNavBar
                        onOpenComponents={() => setActiveMobileSheet(prev => prev === 'components' ? null : 'components')}
                        onOpenProperties={() => setActiveMobileSheet(prev => prev === 'properties' ? null : 'properties')}
                        onOpenTools={() => setActiveMobileSheet(prev => prev === 'tools' ? null : 'tools')}
                        onOpenSheets={() => setActiveMobileSheet(prev => prev === 'sheets' ? null : 'sheets')}
                        onOpenAIStudio={() => setActiveMobileSheet(prev => prev === 'ai' ? null : 'ai')}
                        activeSheet={activeMobileSheet}
                        isAgentOpen={showAgentPanel}
                    />

                    {/* Mobile Bottom Sheets */}
                    <MobileBottomSheet
                        isOpen={activeMobileSheet === 'components'}
                        onClose={() => setActiveMobileSheet(null)}
                        title={activeView === 'sld' ? 'Component Library' : 'Layout Palette'}
                        icon={<LayoutGrid size={16} />}
                    >
                        {activeView === 'sld' ? (
                            <Sidebar onItemAdded={() => setActiveMobileSheet(null)} />
                        ) : (
                            <LayoutSidebar onComponentSelected={() => setActiveMobileSheet(null)} />
                        )}
                    </MobileBottomSheet>

                    <MobileBottomSheet
                        isOpen={activeMobileSheet === 'properties'}
                        onClose={() => setActiveMobileSheet(null)}
                        title={activeView === 'sld' ? 'Component Properties' : 'Element Properties'}
                        icon={<PanelRight size={16} />}
                    >
                        {activeView === 'sld' ? (
                            <div className="h-full">
                                <PropertiesPanel />
                            </div>
                        ) : (
                            <div className="h-full">
                                <LayoutInspector />
                            </div>
                        )}
                    </MobileBottomSheet>

                    <MobileBottomSheet
                        isOpen={activeMobileSheet === 'tools'}
                        onClose={() => setActiveMobileSheet(null)}
                        title={activeView === 'sld' ? 'SLD Tools' : 'Layout Drawing Tools'}
                        icon={<Zap size={16} />}
                    >
                        <MobileToolsSheet
                            onClose={() => setActiveMobileSheet(null)}
                            onZoomIn={handleZoomIn}
                            onZoomOut={handleZoomOut}
                            onResetZoom={handleResetZoom}
                            onFitContent={handleFitContent}
                            onAutoArrange={handleAutoArrange}
                            onAutoRate={handleAutoRate}
                            onCalibrateScale={() => layoutRef.current?.calibrateScale()}
                            onToggleLayersMenu={handleToggleLayersMenu}
                            onFitLayoutView={() => layoutRef.current?.fitView()}
                            onOpenAgent={() => setShowAgentPanel(true)}
                            panMode={panMode}
                            setPanMode={setPanMode}
                            isAddTextMode={isAddTextMode}
                            setIsAddTextMode={setIsAddTextMode}
                        />
                    </MobileBottomSheet>

                    <MobileBottomSheet
                        isOpen={activeMobileSheet === 'sheets'}
                        onClose={() => setActiveMobileSheet(null)}
                        title={activeView === 'sld' ? 'Manage Schematic Sheets' : 'Manage Floor Plans'}
                        icon={<Layers size={16} />}
                    >
                        <MobileSheetsSheet onClose={() => setActiveMobileSheet(null)} />
                    </MobileBottomSheet>

                    <MobileBottomSheet
                        isOpen={activeMobileSheet === 'ai'}
                        onClose={() => setActiveMobileSheet(null)}
                        title="AI Engineering Studio"
                        icon={<Sparkles size={16} />}
                    >
                        <MobileAISheet
                            onOpenAgent={() => setShowAgentPanel(true)}
                            onOpenChat={() => {
                                if (!isChatOpen) toggleChat();
                            }}
                            onClose={() => setActiveMobileSheet(null)}
                            isAgentActive={showAgentPanel}
                            isChatActive={isChatOpen}
                        />
                    </MobileBottomSheet>
                </>
            )}

            {/* Chat Panel - Floating */}
            <ChatPanel />

            {/* Design Agent Panel - Floating.
                Rendered at the app level (not inside LayoutDesigner) so a run
                survives switching between Layout and SLD views: the agent works
                across both, and unmounting the panel mid-run would orphan it. */}
            <AgentPanel
                isOpen={showAgentPanel}
                onClose={() => setShowAgentPanel(false)}
                showToast={(message, type) => {
                    setToastMessage(message);
                    setToastType(type);
                    setToastDuration(3500);
                }}
            />

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
                processLog={autoRatingLog}
            />

            {/* Save Project Dialog */}
            <SaveProjectDialog
                isOpen={showSaveDialog}
                onClose={() => setShowSaveDialog(false)}
                onSave={handleConfirmSave}
                existingNames={diagrams.map(d => d.name)}
                currentName={sheets[0]?.name || 'Untitled Project'}
            />

            {/* Network Monitor */}
            {showNetworkMonitor && (
                <NetworkMonitor onClose={() => setShowNetworkMonitor(false)} />
            )}

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

            {/* Layers Visibility Dropdown via Portal (immune to overflow clipping) */}
            {showLayersMenu && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setShowLayersMenu(false)}
                    />
                    <div
                        className="fixed z-[9999] w-52 rounded-xl shadow-2xl p-2.5 border backdrop-blur-2xl animate-slide-in-top flex flex-col gap-1"
                        style={{
                            top: `${layersMenuPos.top}px`,
                            left: `${layersMenuPos.left}px`,
                            backgroundColor: colors.panelBackground,
                            borderColor: colors.border,
                            color: colors.text
                        }}
                    >
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 px-2 pb-1.5 border-b mb-1" style={{ borderColor: colors.border }}>
                            Layer Visibility
                        </div>
                        {[
                            { label: 'Walls', icon: <Pencil size={13} className="text-blue-500" />, visible: showWalls, toggle: () => setLayoutVisibility('showWalls', !showWalls) },
                            { label: 'Doors', icon: <DoorOpen size={13} className="text-amber-500" />, visible: showDoors, toggle: () => setLayoutVisibility('showDoors', !showDoors) },
                            { label: 'Windows', icon: <Grid3X3 size={13} className="text-cyan-500" />, visible: showWindows, toggle: () => setLayoutVisibility('showWindows', !showWindows) },
                            { label: 'Rooms', icon: <Square size={13} className="text-emerald-500" />, visible: showRooms, toggle: () => setLayoutVisibility('showRooms', !showRooms) }
                        ].map(layer => (
                            <button
                                key={layer.label}
                                type="button"
                                onClick={layer.toggle}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                style={{ color: colors.text }}
                            >
                                <div className="flex items-center gap-2">
                                    {layer.icon}
                                    <span>{layer.label}</span>
                                </div>
                                <div className={`grid h-3.5 w-3.5 place-items-center rounded border transition-colors ${layer.visible ? 'border-blue-500 bg-blue-500 text-white' : 'border-current opacity-40'}`}>
                                    {layer.visible && <Check size={10} />}
                                </div>
                            </button>
                        ))}
                    </div>
                </>,
                document.body
            )}

            {/* User Account Menu Dropdown via Portal */}
            {showAccountMenu && user && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setShowAccountMenu(false)}
                    />
                    <div
                        className="fixed z-[9999] w-60 overflow-hidden rounded-xl border shadow-2xl animate-slide-in-top"
                        style={{
                            top: `${accountMenuPos.top}px`,
                            right: `${accountMenuPos.right}px`,
                            backgroundColor: colors.panelBackground,
                            borderColor: colors.border,
                            color: colors.text
                        }}
                    >
                        <div className="flex items-start gap-3 p-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-white font-bold text-sm">
                                {(user.displayName || user.email).trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-55">Signed in as</p>
                                <p className="truncate text-sm font-semibold">{user.displayName}</p>
                                <p className="truncate text-xs opacity-70">{user.email}</p>
                            </div>
                        </div>
                        <div className="border-t p-1.5" style={{ borderColor: colors.border }}>
                            <button
                                type="button"
                                onClick={handleLogout}
                                disabled={isSigningOut}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <LogOut size={16} />
                                {isSigningOut ? 'Signing out…' : 'Sign out'}
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <Toast
                    message={toastMessage}
                    type={toastType}
                    duration={toastDuration}
                    onClose={() => setToastMessage(null)}
                />
            )}
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            {/* Rendered outside <Routes> so cold-start feedback is visible on
                every page, including the landing page where the wake begins.
                Stacked in one container so the server and detection banners
                never overlap when both are waking. */}
            <div className="fixed left-1/2 top-4 z-[10000] flex -translate-x-1/2 flex-col items-center gap-2 px-4">
                <ServerStatusBanner />
                <DetectionStatusBanner />
            </div>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/design" element={<ProtectedDesignerRoute />} />
            </Routes>
        </BrowserRouter>
    );
}

function ProtectedDesignerRoute() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="min-h-screen grid place-items-center text-slate-600 dark:text-slate-200">Loading workspace…</div>;
    }

    return user ? <DesignerApp /> : <Navigate to="/auth" replace />;
}


export default App;
