import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface SaveProjectDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (projectName: string) => void;
    existingNames: string[];
    currentName: string;
}

export const SaveProjectDialog: React.FC<SaveProjectDialogProps> = ({
    isOpen,
    onClose,
    onSave,
    existingNames,
    currentName
}) => {
    const { colors } = useTheme();
    const [projectName, setProjectName] = useState(currentName);
    const [error, setError] = useState<string | null>(null);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setProjectName(currentName);
            setError(null);
        }
    }, [isOpen, currentName]);

    const handleSave = () => {
        const trimmedName = projectName.trim();

        if (!trimmedName) {
            setError('Project name cannot be empty');
            return;
        }

        // Check for duplicate names (case-insensitive), excluding the current name
        const isDuplicate = existingNames.some(
            name => name.toLowerCase() === trimmedName.toLowerCase() &&
                name.toLowerCase() !== currentName.toLowerCase()
        );

        if (isDuplicate) {
            setError('A project with this name already exists. Please choose a different name.');
            return;
        }

        onSave(trimmedName);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />

            {/* Dialog */}
            <div
                className="relative rounded-lg shadow-2xl w-[400px] animate-fade-in"
                style={{
                    backgroundColor: colors.panelBackground,
                    color: colors.text,
                    border: `1px solid ${colors.border}`
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: colors.border }}
                >
                    <h2 className="text-lg font-semibold">Save Project</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => {
                                setProjectName(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter project name..."
                            autoFocus
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                                backgroundColor: colors.canvasBackground,
                                borderColor: error ? '#ef4444' : colors.border,
                                color: colors.text
                            }}
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-500">{error}</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div
                    className="flex justify-end gap-2 px-4 py-3 border-t"
                    style={{ borderColor: colors.border }}
                >
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        style={{ borderColor: colors.border }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};
