import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface MaterialSelectionDialogProps {
    onSelect: (material: 'Cable' | 'Wiring') => void;
    onCancel: () => void;
}

export const MaterialSelectionDialog: React.FC<MaterialSelectionDialogProps> = ({ onSelect, onCancel }) => {
    const [selectedMaterial, setSelectedMaterial] = useState<'Cable' | 'Wiring'>('Cable');
    const { colors } = useTheme();

    const handleOk = () => {
        onSelect(selectedMaterial);
    };

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onCancel}
        >
            <div
                className="rounded-lg shadow-xl p-6 w-80"
                style={{ backgroundColor: colors.panelBackground }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>
                    Select Connection Material
                </h2>

                <p className="text-sm mb-4" style={{ color: colors.text }}>
                    Choose the conducting material for this connection:
                </p>

                <div className="space-y-3 mb-6">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="material"
                            value="Cable"
                            checked={selectedMaterial === 'Cable'}
                            onChange={() => setSelectedMaterial('Cable')}
                            className="mr-2"
                        />
                        <span style={{ color: colors.text }}>Cable</span>
                    </label>

                    <label className="flex items-center cursor-pointer">
                        <input
                            type="radio"
                            name="material"
                            value="Wiring"
                            checked={selectedMaterial === 'Wiring'}
                            onChange={() => setSelectedMaterial('Wiring')}
                            className="mr-2"
                        />
                        <span style={{ color: colors.text }}>Wiring</span>
                    </label>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded border hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        style={{ borderColor: colors.border, color: colors.text }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleOk}
                        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};
