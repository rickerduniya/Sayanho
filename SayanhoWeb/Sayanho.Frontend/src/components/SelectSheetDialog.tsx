import React from 'react';

interface SelectSheetDialogProps {
    sheets: { sheetId: string; name: string }[];
    excludeSheetId: string;
    onSelect: (sheetId: string) => void;
    onCancel: () => void;
}

export const SelectSheetDialog: React.FC<SelectSheetDialogProps> = ({ sheets, excludeSheetId, onSelect, onCancel }) => {
    const options = sheets.filter(s => s.sheetId !== excludeSheetId);

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-[360px] p-4">
                <h3 className="text-base font-semibold mb-3">Select Target Canvas</h3>
                <div className="max-h-64 overflow-auto divide-y">
                    {options.map(s => (
                        <button
                            key={s.sheetId}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100"
                            onClick={() => onSelect(s.sheetId)}
                        >
                            {s.name}
                        </button>
                    ))}
                    {options.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">No other canvases available.</div>
                    )}
                </div>
                <div className="mt-3 flex justify-end">
                    <button className="px-3 py-1 text-sm rounded border" onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
};
