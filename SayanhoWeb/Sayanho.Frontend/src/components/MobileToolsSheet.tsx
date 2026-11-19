import React from 'react';
import {
    MousePointer2, Hand, ZoomIn, ZoomOut, RotateCcw, Maximize,
    LayoutGrid, Zap, Eye, EyeOff, Type, Pencil, Square, DoorOpen,
    Grid3X3, ArrowUpFromLine, Ruler, Layers, GitBranch, Sparkles, Bot
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useLayoutStore } from '../store/useLayoutStore';
import { useTheme } from '../context/ThemeContext';

interface MobileToolsSheetProps {
    onClose: () => void;
    // SLD handlers
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onFitContent: () => void;
    onAutoArrange: () => void;
    onAutoRate: () => void;
    // Layout handlers
    onCalibrateScale?: () => void;
    onToggleLayersMenu?: () => void;
    onFitLayoutView?: () => void;
    onOpenAgent?: () => void;
    panMode: boolean;
    setPanMode: (pan: boolean) => void;
    isAddTextMode: boolean;
    setIsAddTextMode: (val: boolean) => void;
}

export const MobileToolsSheet: React.FC<MobileToolsSheetProps> = ({
    onClose,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitContent,
    onAutoArrange,
    onAutoRate,
    onCalibrateScale,
    onToggleLayersMenu,
    onFitLayoutView,
    onOpenAgent,
    panMode,
    setPanMode,
    isAddTextMode,
    setIsAddTextMode
}) => {
    const { colors } = useTheme();
    const { showCurrentValues, toggleShowCurrentValues } = useStore();
    const {
        activeView,
        drawingState,
        setActiveTool,
        setWallThickness,
        setContinuousWallMode
    } = useLayoutStore();

    const activeLayoutTool = drawingState.activeTool;

    return (
        <div className="p-4 space-y-4">
            {/* Quick Autonomous Agent Trigger Banner */}
            {onOpenAgent && (
                <button
                    type="button"
                    onClick={() => {
                        onOpenAgent();
                        onClose();
                    }}
                    className="w-full text-left p-3.5 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 text-white cursor-pointer active:scale-98 transition-all shadow-md flex items-center justify-between"
                    aria-label="Launch Autonomous Design Agent"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0">
                            <Bot size={22} />
                        </div>
                        <div>
                            <span className="font-bold text-sm block leading-none">Autonomous Design Agent</span>
                            <span className="text-[11px] text-slate-300 mt-1 block">Auto-wire, validate & run engineering rules</span>
                        </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-600 text-white font-bold shrink-0">
                        Launch
                    </span>
                </button>
            )}

            {activeView === 'sld' ? (
                // SLD Mode Tools
                <>
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Interaction Mode</div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => { setPanMode(false); onClose(); }}
                                className={`flex items-center gap-2.5 p-3.5 min-h-[50px] rounded-xl border text-sm font-medium transition-all active:scale-95 ${!panMode ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <MousePointer2 size={18} />
                                <span>Select Mode (V)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setPanMode(true); onClose(); }}
                                className={`flex items-center gap-2.5 p-3.5 min-h-[50px] rounded-xl border text-sm font-medium transition-all active:scale-95 ${panMode ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <Hand size={18} />
                                <span>Pan Canvas (H)</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Canvas View</div>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                type="button"
                                onClick={onZoomOut}
                                className="flex flex-col items-center justify-center p-3 min-h-[54px] rounded-xl border border-border/60 hover:bg-white/5 text-xs font-medium gap-1 active:scale-95"
                            >
                                <ZoomOut size={18} />
                                <span>Zoom -</span>
                            </button>
                            <button
                                type="button"
                                onClick={onZoomIn}
                                className="flex flex-col items-center justify-center p-3 min-h-[54px] rounded-xl border border-border/60 hover:bg-white/5 text-xs font-medium gap-1 active:scale-95"
                            >
                                <ZoomIn size={18} />
                                <span>Zoom +</span>
                            </button>
                            <button
                                type="button"
                                onClick={onResetZoom}
                                className="flex flex-col items-center justify-center p-3 min-h-[54px] rounded-xl border border-border/60 hover:bg-white/5 text-xs font-medium gap-1 active:scale-95"
                            >
                                <RotateCcw size={18} />
                                <span>Reset</span>
                            </button>
                            <button
                                type="button"
                                onClick={onFitContent}
                                className="flex flex-col items-center justify-center p-3 min-h-[54px] rounded-xl border border-border/60 hover:bg-white/5 text-xs font-medium gap-1 active:scale-95"
                            >
                                <Maximize size={18} />
                                <span>Fit View</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Electrical Actions</div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => { onAutoArrange(); onClose(); }}
                                className="flex items-center gap-2.5 p-3.5 min-h-[50px] rounded-xl border border-border/60 hover:bg-white/5 text-sm font-medium active:scale-95"
                            >
                                <LayoutGrid size={18} className="text-blue-500" />
                                <span>Auto Arrange</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { onAutoRate(); onClose(); }}
                                className="flex items-center gap-2.5 p-3.5 min-h-[50px] rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-sm font-medium active:scale-95"
                            >
                                <Zap size={18} />
                                <span>Auto-Rate Net</span>
                            </button>
                            <button
                                type="button"
                                onClick={toggleShowCurrentValues}
                                className={`flex items-center gap-2.5 p-3.5 min-h-[50px] rounded-xl border text-sm font-medium transition-all active:scale-95 ${showCurrentValues ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                {showCurrentValues ? <Eye size={18} /> : <EyeOff size={18} />}
                                <span>{showCurrentValues ? 'Hide Currents' : 'Show Currents'}</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsAddTextMode(!isAddTextMode); onClose(); }}
                                className={`flex items-center gap-2.5 p-3.5 min-h-[50px] rounded-xl border text-sm font-medium transition-all active:scale-95 ${isAddTextMode ? 'bg-blue-600 text-white border-blue-600' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <Type size={18} />
                                <span>Add Text Label</span>
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                // Layout Mode Tools
                <>
                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Pointer Mode</div>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => { setActiveTool('select'); onClose(); }}
                                className={`flex items-center gap-2.5 p-3.5 min-h-[50px] rounded-xl border text-sm font-medium transition-all active:scale-95 ${activeLayoutTool === 'select' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <MousePointer2 size={18} />
                                <span>Select Tool (V)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTool('pan'); onClose(); }}
                                className={`flex items-center gap-2.5 p-3.5 min-h-[50px] rounded-xl border text-sm font-medium transition-all active:scale-95 ${activeLayoutTool === 'pan' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <Hand size={18} />
                                <span>Pan Canvas</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Architectural Drawing</div>
                        <div className="grid grid-cols-3 gap-2.5">
                            <button
                                type="button"
                                onClick={() => { setActiveTool('wall'); onClose(); }}
                                className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-xl border text-xs font-medium gap-1.5 transition-all active:scale-95 ${activeLayoutTool === 'wall' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <Pencil size={20} />
                                <span>Wall</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTool('room'); onClose(); }}
                                className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-xl border text-xs font-medium gap-1.5 transition-all active:scale-95 ${activeLayoutTool === 'room' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <Square size={20} />
                                <span>Room</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTool('door'); onClose(); }}
                                className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-xl border text-xs font-medium gap-1.5 transition-all active:scale-95 ${activeLayoutTool === 'door' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <DoorOpen size={20} />
                                <span>Door</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTool('window'); onClose(); }}
                                className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-xl border text-xs font-medium gap-1.5 transition-all active:scale-95 ${activeLayoutTool === 'window' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <Grid3X3 size={20} />
                                <span>Window</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { setActiveTool('stair'); onClose(); }}
                                className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-xl border text-xs font-medium gap-1.5 transition-all active:scale-95 ${activeLayoutTool === 'stair' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <ArrowUpFromLine size={20} />
                                <span>Stairs</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setActiveTool(activeLayoutTool === 'connection' ? 'select' : 'connection');
                                    onClose();
                                }}
                                className={`flex flex-col items-center justify-center p-3.5 min-h-[56px] rounded-xl border text-xs font-medium gap-1.5 transition-all active:scale-95 ${activeLayoutTool === 'connection' ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'border-border/60 hover:bg-white/5'}`}
                            >
                                <GitBranch size={20} />
                                <span>Wire Mode</span>
                            </button>
                        </div>
                    </div>

                    {/* Wall Thickness Settings */}
                    {activeLayoutTool === 'wall' && (
                        <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                            <div className="flex items-center justify-between text-xs font-medium">
                                <span>Wall Thickness: {drawingState.wallThickness}px</span>
                                <button
                                    type="button"
                                    onClick={() => setContinuousWallMode(!drawingState.continuousWallMode)}
                                    className={`px-3 py-1 min-h-[36px] rounded-lg text-xs font-bold active:scale-95 ${drawingState.continuousWallMode ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}
                                >
                                    {drawingState.continuousWallMode ? 'Continuous ON' : 'Single Line'}
                                </button>
                            </div>
                            <input
                                type="range"
                                min="2"
                                max="60"
                                value={drawingState.wallThickness}
                                onChange={(e) => setWallThickness(parseInt(e.target.value) || 10)}
                                className="w-full accent-blue-500 h-6 cursor-pointer"
                            />
                        </div>
                    )}

                    <div>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Utilities & View</div>
                        <div className="grid grid-cols-3 gap-2.5">
                            <button
                                type="button"
                                onClick={() => { if (onCalibrateScale) onCalibrateScale(); onClose(); }}
                                className="flex flex-col items-center justify-center p-3.5 min-h-[54px] rounded-xl border border-border/60 hover:bg-white/5 text-xs font-medium gap-1 active:scale-95"
                            >
                                <Ruler size={18} />
                                <span>Calibrate</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { if (onToggleLayersMenu) onToggleLayersMenu(); onClose(); }}
                                className="flex flex-col items-center justify-center p-3.5 min-h-[54px] rounded-xl border border-border/60 hover:bg-white/5 text-xs font-medium gap-1 active:scale-95"
                            >
                                <Layers size={18} />
                                <span>Layers</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { if (onFitLayoutView) onFitLayoutView(); onClose(); }}
                                className="flex flex-col items-center justify-center p-3.5 min-h-[54px] rounded-xl border border-border/60 hover:bg-white/5 text-xs font-medium gap-1 active:scale-95"
                            >
                                <Maximize size={18} />
                                <span>Fit View</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
