import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Download, CheckCircle, AlertTriangle } from 'lucide-react';

interface AutoRatingResultDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onDownloadReport: () => void;
    success: boolean;
    message?: string;
}

export const AutoRatingResultDialog: React.FC<AutoRatingResultDialogProps> = ({
    isOpen,
    onClose,
    onDownloadReport,
    success,
    message
}) => {
    const { colors } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onClose}>
            <div
                className="rounded-lg shadow-xl border w-[400px] p-6 animate-slide-in-top"
                style={{ backgroundColor: colors.panelBackground, borderColor: colors.border }}
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center gap-4">
                    {success ? (
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle size={32} className="text-green-600" />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle size={32} className="text-red-600" />
                        </div>
                    )}

                    <h2 className="text-xl font-bold" style={{ color: colors.text }}>
                        {success ? 'Auto-Rating Complete' : 'Auto-Rating Failed'}
                    </h2>

                    <p className="text-sm opacity-80" style={{ color: colors.text }}>
                        {message || (success
                            ? 'Component ratings have been successfully updated based on network analysis.'
                            : 'An error occurred during auto-rating.')}
                    </p>

                    {success && (
                        <button
                            onClick={onDownloadReport}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors w-full justify-center mt-2"
                        >
                            <Download size={18} />
                            Download Comprehensive Report
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="text-sm hover:underline mt-2"
                        style={{ color: colors.text }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
