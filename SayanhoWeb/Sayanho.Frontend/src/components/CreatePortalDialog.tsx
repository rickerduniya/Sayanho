import React, { useState } from 'react';

export type PortalDirection = 'in' | 'out';

interface CreatePortalDialogProps {
    initialDirection?: PortalDirection;
    onCreate: (direction: PortalDirection) => void;
    onCancel: () => void;
}

export const CreatePortalDialog: React.FC<CreatePortalDialogProps> = ({
    initialDirection = 'out',
    onCreate,
    onCancel
}) => {
    const [direction, setDirection] = useState<PortalDirection>(initialDirection);

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-xl w-[320px] p-4">
                <h3 className="text-base font-semibold mb-3">Create Portal</h3>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                        <select
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={direction}
                            onChange={(e) => setDirection(e.target.value as PortalDirection)}
                        >
                            <option value="in">In</option>
                            <option value="out">Out</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                    <button className="px-3 py-1 text-sm rounded border" onClick={onCancel}>Cancel</button>
                    <button
                        className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
                        onClick={() => onCreate(direction)}
                    >Create</button>
                </div>
            </div>
        </div>
    );
};
