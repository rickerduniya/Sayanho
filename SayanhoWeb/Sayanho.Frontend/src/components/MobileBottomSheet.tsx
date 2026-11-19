import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MobileBottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    maxHeightClass?: string;
    headerRight?: React.ReactNode;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
    isOpen,
    onClose,
    title,
    icon,
    children,
    maxHeightClass = 'max-h-[82vh]',
    headerRight
}) => {
    const { colors } = useTheme();

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Bottom Sheet Modal Container */}
            <div
                className={`relative z-10 w-full ${maxHeightClass} flex flex-col rounded-t-2xl border-t shadow-2xl transition-transform duration-300 animate-slide-in-bottom select-none`}
                style={{
                    backgroundColor: colors.panelBackground,
                    borderColor: colors.border,
                    color: colors.text
                }}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                {/* Pull Grab Handle */}
                <div className="pt-2 pb-1 flex justify-center cursor-pointer" onClick={onClose}>
                    <div className="w-12 h-1 rounded-full bg-slate-400/40 dark:bg-slate-600/60" />
                </div>

                {/* Sheet Header */}
                <div
                    className="flex items-center justify-between px-4 py-2 border-b shrink-0"
                    style={{ borderColor: colors.border }}
                >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                        {icon && <span className="text-blue-500">{icon}</span>}
                        <span>{title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        {headerRight}
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-100 transition-colors"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Sheet Body with Safe Area Inset */}
                <div
                    className="flex-1 overflow-y-auto overscroll-contain min-h-0"
                    style={{
                        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))'
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
};
