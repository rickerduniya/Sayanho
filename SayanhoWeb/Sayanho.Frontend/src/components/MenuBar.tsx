import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Menu, FolderKanban } from 'lucide-react';

interface MenuBarProps {
    onLoad: () => void;
    onSave: () => void;
    onSaveAs: () => void;
    onSaveImage: () => void;
    onSettings: () => void;
    onGenerateEstimate: () => void;
    onOpenVoltageDrop: () => void;
    onOpenNetworkMonitor: () => void;
    onSaveLocal: () => void;
    onLoadLocal: () => void;
    isMobile?: boolean;
}

export const MenuBar: React.FC<MenuBarProps> = ({
    onLoad, onSave, onSaveAs, onSaveImage,
    onSettings, onGenerateEstimate, onOpenVoltageDrop, onOpenNetworkMonitor,
    onSaveLocal, onLoadLocal, isMobile = false
}) => {
    const { colors } = useTheme();
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleMenuClick = (menuName: string) => {
        setActiveMenu(activeMenu === menuName ? null : menuName);
    };

    const MenuItem: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
        <div
            className={`px-3.5 py-2.5 sm:py-1.5 mx-1 rounded-xl sm:rounded-lg hover:bg-blue-600 hover:text-white cursor-pointer ${isMobile ? 'min-h-[44px] flex items-center text-sm' : 'text-xs'} font-medium whitespace-nowrap transition-colors`}
            onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick();
                setActiveMenu(null);
            }}
            style={{ color: colors.text }}
        >
            {label}
        </div>
    );

    const MenuSeparator = () => (
        <div className="h-px bg-gray-200 dark:bg-gray-700/60 my-1 mx-2" />
    );

    if (isMobile) {
        return (
            <div
                className="flex items-center select-none z-50 relative"
                style={{ color: colors.menuText }}
                ref={menuRef}
            >
                <button
                    type="button"
                    className={`min-w-[38px] min-h-[38px] flex items-center justify-center text-xs font-medium rounded-xl transition-all active:scale-95 ${activeMenu === 'MobileMenu' ? 'bg-blue-500/15 text-blue-500' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                    onClick={() => handleMenuClick('MobileMenu')}
                    title="Project Menu & Tools"
                    aria-label="Project Menu & Tools"
                >
                    <Menu size={18} />
                </button>

                {activeMenu === 'MobileMenu' && (
                    <div
                        className="fixed left-2 top-11 min-w-[220px] max-w-[calc(100vw-1rem)] rounded-xl shadow-2xl border py-2 z-50 backdrop-blur-xl animate-slide-in-top"
                        style={{ backgroundColor: colors.panelBackground, borderColor: colors.border }}
                    >
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Project</div>
                        <MenuItem label="Load Project" onClick={onLoad} />
                        <MenuItem label="Save Project" onClick={onSave} />
                        <MenuItem label="Save Project As..." onClick={onSaveAs} />
                        <MenuItem label="Save to Local File" onClick={onSaveLocal} />
                        <MenuItem label="Load from Local File" onClick={onLoadLocal} />
                        <MenuItem label="Save as Image" onClick={onSaveImage} />
                        <MenuItem label="Generate Estimate" onClick={onGenerateEstimate} />
                        <MenuItem label="Settings" onClick={onSettings} />

                        <MenuSeparator />
                        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tools</div>
                        <MenuItem label="Calculate Voltage Drop" onClick={onOpenVoltageDrop} />
                        <MenuItem label="Network Monitor" onClick={onOpenNetworkMonitor} />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-1 select-none z-50 relative"
            style={{ color: colors.menuText }}
            ref={menuRef}
        >
            {/* File Menu */}
            <div className="relative">
                <button
                    type="button"
                    className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${activeMenu === 'File' ? 'bg-blue-500/15 text-blue-500' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                    onClick={() => handleMenuClick('File')}
                    style={{ color: activeMenu === 'File' ? undefined : colors.menuText }}
                >
                    File
                </button>
                {activeMenu === 'File' && (
                    <div
                        className="absolute left-0 top-full mt-1.5 min-w-[210px] rounded-xl shadow-2xl border py-1.5 z-50 backdrop-blur-xl animate-slide-in-top"
                        style={{ backgroundColor: colors.panelBackground, borderColor: colors.border }}
                    >
                        <MenuItem label="Load Project" onClick={onLoad} />
                        <MenuItem label="Save Project" onClick={onSave} />
                        <MenuItem label="Save Project As..." onClick={onSaveAs} />
                        <MenuSeparator />
                        <MenuItem label="Save to File" onClick={onSaveLocal} />
                        <MenuItem label="Load from File" onClick={onLoadLocal} />
                        <MenuSeparator />
                        <MenuItem label="Save as Image" onClick={onSaveImage} />
                        <MenuSeparator />
                        <MenuItem label="Generate Estimate" onClick={onGenerateEstimate} />
                        <MenuSeparator />
                        <MenuItem label="Settings" onClick={onSettings} />
                    </div>
                )}
            </div>

            {/* Tools Menu */}
            <div className="relative">
                <button
                    type="button"
                    className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${activeMenu === 'Tools' ? 'bg-blue-500/15 text-blue-500' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                    onClick={() => handleMenuClick('Tools')}
                    style={{ color: activeMenu === 'Tools' ? undefined : colors.menuText }}
                >
                    Tools
                </button>
                {activeMenu === 'Tools' && (
                    <div
                        className="absolute left-0 top-full mt-1.5 min-w-[210px] rounded-xl shadow-2xl border py-1.5 z-50 backdrop-blur-xl animate-slide-in-top"
                        style={{ backgroundColor: colors.panelBackground, borderColor: colors.border }}
                    >
                        <MenuItem
                            label="Calculate Voltage Drop"
                            onClick={onOpenVoltageDrop}
                        />
                        <MenuItem
                            label="Network Monitor"
                            onClick={onOpenNetworkMonitor}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

