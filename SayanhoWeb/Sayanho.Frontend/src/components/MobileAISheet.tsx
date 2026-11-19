import React from 'react';
import { Bot, MessageSquare, Zap, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MobileAISheetProps {
    onOpenAgent: () => void;
    onOpenChat: () => void;
    onClose: () => void;
    isAgentActive: boolean;
    isChatActive: boolean;
}

export const MobileAISheet: React.FC<MobileAISheetProps> = ({
    onOpenAgent,
    onOpenChat,
    onClose,
    isAgentActive,
    isChatActive
}) => {
    const { colors } = useTheme();

    return (
        <div className="p-4 space-y-3.5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                AI Engineering Tools
            </div>

            {/* 1. Autonomous Design Agent */}
            <button
                type="button"
                onClick={() => {
                    onOpenAgent();
                    onClose();
                }}
                className={`w-full text-left p-4 rounded-2xl border cursor-pointer transition-all active:scale-98 shadow-lg flex items-center justify-between gap-3 ${isAgentActive ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/30' : 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/80'}`}
                aria-label="Launch Autonomous Design Agent"
            >
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                        <Bot size={26} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">Autonomous Design Agent</span>
                            {isAgentActive && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/30">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                    Active
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                            Autonomous CAD rules, cable sizing, automatic routing & multi-step layout logic.
                        </p>
                    </div>
                </div>
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300">
                    <ChevronRight size={18} />
                </div>
            </button>

            {/* 2. AI Assistant Chat */}
            <button
                type="button"
                onClick={() => {
                    onOpenChat();
                    onClose();
                }}
                className={`w-full text-left p-4 rounded-2xl border cursor-pointer transition-all active:scale-98 shadow-lg flex items-center justify-between gap-3 ${isChatActive ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500/30' : 'bg-slate-800/40 border-slate-700/80 hover:bg-slate-800/80'}`}
                aria-label="Launch AI Design Assistant Chat"
            >
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <MessageSquare size={26} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">AI Design Assistant (Chat)</span>
                            {isChatActive && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/30">
                                    Open
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 leading-snug">
                            Interactive engineering dialogue, component query, voltage drop and calculations.
                        </p>
                    </div>
                </div>
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-300">
                    <ChevronRight size={18} />
                </div>
            </button>
        </div>
    );
};
