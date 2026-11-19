import React from 'react';
import { LayoutGrid, Sliders, Wrench, Layers, Sparkles, Bot, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { useLayoutStore } from '../store/useLayoutStore';

interface MobileNavBarProps {
    onOpenComponents: () => void;
    onOpenProperties: () => void;
    onOpenTools: () => void;
    onOpenSheets: () => void;
    onOpenAIStudio: () => void;
    activeSheet: 'components' | 'properties' | 'tools' | 'sheets' | 'ai' | null;
    isAgentOpen?: boolean;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
    onOpenComponents,
    onOpenProperties,
    onOpenTools,
    onOpenSheets,
    onOpenAIStudio,
    activeSheet,
    isAgentOpen = false
}) => {
    const { colors, theme } = useTheme();
    const { selectedItemIds, selectedConnectorIndices, isChatOpen } = useStore();
    const { activeView, selectedElementIds } = useLayoutStore();

    const hasSelection = activeView === 'sld'
        ? (selectedItemIds.length > 0 || selectedConnectorIndices.length > 0)
        : (selectedElementIds.length > 0);

    const isAIActive = activeSheet === 'ai' || isChatOpen || isAgentOpen;

    return (
        <nav
            className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t select-none backdrop-blur-xl transition-all shadow-2xl"
            style={{
                backgroundColor: theme === 'dark' ? 'rgba(13, 19, 31, 0.98)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: colors.border,
                paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))',
                height: 'calc(60px + max(8px, env(safe-area-inset-bottom, 0px)))'
            }}
            aria-label="Mobile Navigation"
        >
            {/* 1. Component Library */}
            <button
                type="button"
                onClick={onOpenComponents}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 h-full min-h-[48px] min-w-[48px] active:scale-95 transition-all relative ${activeSheet === 'components' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                aria-label="Components Library"
            >
                <LayoutGrid size={21} />
                <span className="text-[11px] mt-1 leading-none font-medium">Library</span>
            </button>

            {/* 2. Quick CAD / SLD Tools */}
            <button
                type="button"
                onClick={onOpenTools}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 h-full min-h-[48px] min-w-[48px] active:scale-95 transition-all relative ${activeSheet === 'tools' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                aria-label="Drawing Tools"
            >
                <Wrench size={21} />
                <span className="text-[11px] mt-1 leading-none font-medium">Tools</span>
            </button>

            {/* 3. Sheets / Plans Manager */}
            <button
                type="button"
                onClick={onOpenSheets}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 h-full min-h-[48px] min-w-[48px] active:scale-95 transition-all relative ${activeSheet === 'sheets' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                aria-label="Sheets and Floor Plans"
            >
                <Layers size={21} />
                <span className="text-[11px] mt-1 leading-none font-medium">{activeView === 'sld' ? 'Sheets' : 'Plans'}</span>
            </button>

            {/* 4. Properties Inspector */}
            <button
                type="button"
                onClick={onOpenProperties}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 h-full min-h-[48px] min-w-[48px] active:scale-95 transition-all relative ${activeSheet === 'properties' ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                aria-label="Properties"
            >
                <div className="relative">
                    <Sliders size={21} />
                    {hasSelection && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 ring-2 ring-slate-900 animate-pulse" />
                    )}
                </div>
                <span className="text-[11px] mt-1 leading-none font-medium">Properties</span>
            </button>

            {/* 5. AI Studio (Chat & Autonomous Agent) */}
            <button
                type="button"
                onClick={onOpenAIStudio}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 h-full min-h-[48px] min-w-[48px] active:scale-95 transition-all relative ${isAIActive ? 'text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
                aria-label="AI Studio and Autonomous Agent"
            >
                <div className="relative">
                    <Sparkles size={21} />
                    <span className="absolute -top-1 -right-1.5 px-1 py-0.2 rounded-full text-[8px] font-black bg-indigo-600 text-white">
                        AI
                    </span>
                </div>
                <span className="text-[11px] mt-1 leading-none font-medium">AI Studio</span>
            </button>
        </nav>
    );
};
