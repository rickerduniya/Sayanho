import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Trash, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PanelRenderer } from '../utils/PanelRenderer';
import { CanvasItem } from '../types';

interface PanelDesignerProps {
    isOpen: boolean;
    onClose: () => void;
    item: CanvasItem;
    onSave: (updatedItem: CanvasItem) => void;
    availableDevices: { mccb: any[], acb: any[], sfu: any[], mcb: any[] };
}

export const PanelDesignerDialog: React.FC<PanelDesignerProps> = ({
    isOpen, onClose, item, onSave, availableDevices
}) => {
    const { colors } = useTheme();
    const [localItem, setLocalItem] = useState<CanvasItem>(JSON.parse(JSON.stringify(item)));
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [clipboard, setClipboard] = useState<any[]>([]);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, section: number, index: number | null } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalItem(JSON.parse(JSON.stringify(item)));
            setSelectedIds([]);
        }
    }, [isOpen, item]);

    if (!isOpen) return null;

    const properties = localItem.properties[0] || {};
    const incomerCount = Math.max(parseInt(properties["Incomer Count"] || "1", 10), 1);
    const outgoings = localItem.outgoing || [];

    // Helper to find specific rows in the loaded database data
    const findDeviceRow = (type: string, pole: string, rating: string, company: string) => {
        let dataset: any[] = [];
        const normType = type.toLowerCase().replace(/\s+/g, "");

        if (normType.includes("mccb")) dataset = availableDevices.mccb;
        else if (normType.includes("mcb")) dataset = availableDevices.mcb;
        else if (normType.includes("mainswitch") || normType.includes("sfu")) dataset = availableDevices.sfu;

        return dataset.find(d => {
            const matchesType = d["Item"] === "Main Switch Open" ? d["Type"] === "TPN SFU" : true; // SFU check
            const matchesPole = d["Pole"] ? d["Pole"] === pole : true; // Main Switch Open usually has no pole col
            const matchesRating = d["Current Rating"] === rating;
            const matchesCompany = d["Company"] === company;
            return matchesType && matchesPole && matchesRating && matchesCompany;
        });
    };

    // Generic helper to get options based on filters
    const getOptions = (datasetKey: 'mccb' | 'mcb' | 'sfu', filters: { pole?: string, rating?: string } = {}) => {
        let data = availableDevices[datasetKey] || [];

        // Filter for Main Switch Open specific type
        if (datasetKey === 'sfu') {
            data = data.filter(d => d["Type"] === "TPN SFU");
        }

        if (filters.pole) {
            data = data.filter(d => d["Pole"] === filters.pole);
        }
        if (filters.rating) {
            data = data.filter(d => d["Current Rating"] === filters.rating);
        }
        return data;
    };

    // Get unique values for dropdowns
    const getUniqueValues = (data: any[], key: string) => {
        return [...new Set(data.map(d => d[key]).filter(Boolean))].sort((a, b) => {
            // Try numeric sort for ratings
            const numA = parseInt(a);
            const numB = parseInt(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.localeCompare(b);
        });
    };

    const handleUpdateProperty = (key: string, value: string) => {
        const newProps = { ...properties, [key]: value };

        // Auto-populate other fields if we have a full selection
        // Logic depends on what changed. 
        // We handle the strict Type->Pole->Rating->Company flow in the UI render mostly, 
        // ensuring invalid downstream options are cleared.

        setLocalItem({ ...localItem, properties: [newProps] });
    };

    const handleUpdateIncomer = (section: string, field: string, value: string) => {
        const prefix = `Incomer${section}_`;
        let newProps = { ...properties, [prefix + field]: value };

        // Clear downstream if upstream changes
        if (field === 'Type') {
            newProps[prefix + 'Pole'] = "";
            newProps[prefix + 'Rating'] = "";
            newProps[prefix + 'Company'] = "";
        } else if (field === 'Pole') {
            newProps[prefix + 'Rating'] = "";
            newProps[prefix + 'Company'] = "";
        } else if (field === 'Rating') {
            newProps[prefix + 'Company'] = "";
        } else if (field === 'Company') {
            // Full selection made, find and populate Rate/Desc/GS
            const type = newProps[prefix + 'Type'];
            const pole = newProps[prefix + 'Pole'] || (type === "Main Switch Open" ? "TPN" : "");
            const rating = newProps[prefix + 'Rating'];

            const row = findDeviceRow(type, pole, rating, value);
            if (row) {
                newProps[prefix + 'Rate'] = row['Rate'];
                newProps[prefix + 'Description'] = row['Description'];
                newProps[prefix + 'GS'] = row['GS'];
            }
        }

        setLocalItem({ ...localItem, properties: [newProps] });
    };

    const handleUpdateOutgoing = (index: number, field: string, value: string) => {
        const newOut = [...outgoings];
        const item = { ...newOut[index] };
        item[field] = value;

        // Clear downstream
        if (field === 'Type') {
            item['Pole'] = "";
            item['Current Rating'] = "";
            item['Company'] = "";
        } else if (field === 'Pole') {
            item['Current Rating'] = "";
            item['Company'] = "";
        } else if (field === 'Current Rating') {
            item['Company'] = "";
        } else if (field === 'Company') {
            // Full selection
            const type = item['Type'];
            const pole = item['Pole'] || (type === "Main Switch Open" ? "TPN" : "");
            const rating = item['Current Rating'];
            const row = findDeviceRow(type, pole, rating, value);
            if (row) {
                item['Rate'] = row['Rate'];
                item['Description'] = row['Description'];
                item['GS'] = row['GS'];
            }
        }

        newOut[index] = item;
        setLocalItem({ ...localItem, outgoing: newOut });
    };


    const handleAddOutgoing = (section: number) => {
        const newOut = [...outgoings, {
            "Section": section.toString(),
            "Type": "MCB", // Default
            "Pole": "",
            "Current Rating": "",
            "Company": "",
            "Rate": "",
            "Description": "",
            "GS": ""
        }];
        setLocalItem({ ...localItem, outgoing: newOut });
    };

    const handleDeleteSelected = () => {
        if (selectedIds[0]?.startsWith("Incomer")) {
            const section = parseInt(selectedIds[0].split(":")[1]);
            if (incomerCount <= 1) {
                alert("Cannot delete the last incomer. At least one is required.");
                return;
            }
            handleUpdateProperty("Incomer Count", (incomerCount - 1).toString());
            // Remove incomer properties for this section to clean up
            const newProps = { ...properties };
            Object.keys(newProps).forEach(k => {
                if (k.startsWith(`Incomer${section}_`)) delete newProps[k];
            });

            const newOut = outgoings.filter((o: any) => o["Section"] !== section.toString());
            setLocalItem({ ...localItem, properties: [newProps], outgoing: newOut });
            setSelectedIds([]);
        } else {
            const newOut = outgoings.filter((_, idx) => !selectedIds.includes(idx.toString()));
            setLocalItem({ ...localItem, outgoing: newOut });
            setSelectedIds([]);
        }
    };

    const handleAddIncomer = () => {
        if (incomerCount >= 3) {
            alert("Maximum 3 incomers allowed.");
            return;
        }
        handleUpdateProperty("Incomer Count", (incomerCount + 1).toString());
    };
    const handleCopy = () => {
        if (selectedIds[0]?.startsWith("Incomer")) return;
        const selectedItems = outgoings.filter((_, idx) => selectedIds.includes(idx.toString()));
        setClipboard(selectedItems);
        setContextMenu(null);
    };

    const handlePaste = (section: number, targetIndex: number | null) => {
        if (clipboard.length === 0) return;
        let newOutgoings = [...outgoings];

        if (targetIndex !== null) {
            clipboard.forEach((clipItem, i) => {
                const destIdx = targetIndex + i;
                const newItem = { ...clipItem, "Section": section.toString() };
                if (destIdx < newOutgoings.length) {
                    newOutgoings[destIdx] = newItem;
                } else {
                    newOutgoings.push(newItem);
                }
            });
        } else {
            const newItems = clipboard.map(item => ({ ...item, "Section": section.toString() }));
            newOutgoings = [...newOutgoings, ...newItems];
        }

        setLocalItem({ ...localItem, outgoing: newOutgoings });
        setContextMenu(null);
    };

    const handleSlotClick = (e: React.MouseEvent, section: number, index: number | null, globalIndex: number = -1) => {
        e.stopPropagation();
        if (index === null) return;

        if (e.ctrlKey || e.shiftKey) {
            if (selectedIds.includes(globalIndex.toString())) {
                setSelectedIds(selectedIds.filter(id => id !== globalIndex.toString()));
            } else {
                setSelectedIds([...selectedIds, globalIndex.toString()]);
            }
        } else {
            setSelectedIds([globalIndex.toString()]);
        }
    };

    // Rendering Logic
    const margin = 5;
    const topSpace = 85;
    const busbarY = margin + topSpace;
    const busbarHeight = 10;
    const outgoingTopY = busbarY + busbarHeight;
    const outgoingLength = 60;
    const outgoingSpacing = 65;
    const minSectionWidth = 140;
    const couplerWidth = 80;

    const sectionWidths: number[] = [];
    for (let i = 1; i <= incomerCount; i++) {
        const sectionOutgoings = (outgoings || []).filter((o: any) => o["Section"] === i.toString());
        const count = Math.max(sectionOutgoings.length, 1);
        let width = count * outgoingSpacing;
        if (width < minSectionWidth) width = minSectionWidth;
        sectionWidths.push(width);
    }

    // --- Render Dropdowns Components ---

    // --- Render Dropdowns Components ---

    const RenderDeviceConfig = ({ type, pole, rating, company, rate, onChange, canDelete, onDelete, title }: any) => {
        // Determine dataset
        const isSfu = type === "Main Switch Open";
        const isMccb = type === "MCCB";
        const isMcb = type === "MCB";

        let datasetKey: 'mccb' | 'mcb' | 'sfu' | null = null;
        if (isSfu) datasetKey = 'sfu';
        if (isMccb) datasetKey = 'mccb';
        if (isMcb) datasetKey = 'mcb';

        const poles = datasetKey ? getUniqueValues(getOptions(datasetKey), "Pole") : [];
        if (isSfu && poles.length === 0) poles.push("TPN"); // SFU usually implies TPN if no column

        const ratings = datasetKey ? getUniqueValues(getOptions(datasetKey, { pole: isSfu ? undefined : pole }), "Current Rating") : [];

        const companies = datasetKey ? getUniqueValues(getOptions(datasetKey, { pole: isSfu ? undefined : pole, rating }), "Company") : [];

        // Check if rate is logically valid (requires full selection)
        const showRate = rate && type && (isSfu || pole) && rating && company;

        return (
            <div className="space-y-2">
                <div className="text-xs opacity-70">{title}</div>
                <select
                    value={type || ""}
                    onChange={(e) => onChange("Type", e.target.value)}
                    className="w-full text-xs p-1 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                >
                    <option value="" disabled>Select Type...</option>
                    <option value="MCCB">MCCB</option>
                    <option value="Main Switch Open">Main Switch (SFU)</option>
                    <option value="MCB">MCB</option>
                </select>

                <select
                    value={pole || ""}
                    onChange={(e) => onChange("Pole", e.target.value)}
                    className="w-full text-xs p-1 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                    disabled={!type || (isSfu && poles.length <= 1)}
                >
                    <option value="">Select Pole...</option>
                    {poles.map((p: string) => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                    value={rating || ""}
                    onChange={(e) => onChange("Current Rating", e.target.value)}
                    className="w-full text-xs p-1 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                    disabled={!type || (!isSfu && !pole)}
                >
                    <option value="">Select Rating...</option>
                    {ratings.map((r: string) => <option key={r} value={r}>{r}</option>)}
                </select>

                <select
                    value={company || ""}
                    onChange={(e) => onChange("Company", e.target.value)}
                    className="w-full text-xs p-1 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                    disabled={!rating}
                >
                    <option value="">Select Company...</option>
                    {companies.map((c: string) => <option key={c} value={c}>{c}</option>)}
                </select>

                {showRate && (
                    <div className="text-[10px] text-green-600 dark:text-green-400 font-medium px-1">
                        Rate: ₹{rate}
                    </div>
                )}

                {canDelete && (
                    <button onClick={onDelete} className="w-full py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
                        Delete
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-[95vw] h-[90vh] rounded-xl shadow-2xl flex flex-col border border-white/10 overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-900/50">
                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: colors.text }}>
                        <span>Visual Panel Designer</span>
                        <span className="text-sm font-normal opacity-50 px-2 py-0.5 border rounded-full">LT Cubical Panel</span>
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                const finalItem = { ...localItem, svgContent: PanelRenderer.generateSvg(localItem) };
                                onSave(finalItem);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <X size={20} style={{ color: colors.text }} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-64 border-r border-gray-200 dark:border-gray-800 p-4 space-y-6 overflow-y-auto bg-gray-50/50 dark:bg-black/20">
                        {/* Global Settings */}
                        <div>
                            <label className="text-xs font-bold uppercase opacity-60 mb-1 block">Incomers</label>
                            <select
                                value={properties["Incomer Count"]}
                                onChange={(e) => handleUpdateProperty("Incomer Count", e.target.value)}
                                className="w-full p-2 text-sm rounded border bg-transparent"
                            >
                                <option value="1">1 Incomer</option>
                                <option value="2">2 Incomers</option>
                                <option value="3">3 Incomers</option>
                            </select>
                        </div>

                        {/* Selection Logic */}
                        {selectedIds.length > 0 && selectedIds[0].startsWith("Incomer") ? (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-800">
                                <h3 className="text-sm font-bold text-green-700 dark:text-green-300 mb-2">Incomer Config</h3>
                                {(() => {
                                    const section = selectedIds[0].split(":")[1];
                                    return (
                                        <RenderDeviceConfig
                                            type={properties[`Incomer${section}_Type`]}
                                            pole={properties[`Incomer${section}_Pole`] || (properties[`Incomer${section}_Type`] === "Main Switch Open" ? "TPN" : "")}
                                            rating={properties[`Incomer${section}_Rating`]}
                                            company={properties[`Incomer${section}_Company`]}
                                            rate={properties[`Incomer${section}_Rate`]}
                                            onChange={(field: string, val: string) => {
                                                if (field === "Current Rating") handleUpdateIncomer(section, "Rating", val); // Remap
                                                else handleUpdateIncomer(section, field, val);
                                            }}
                                            canDelete={incomerCount > 1}
                                            onDelete={handleDeleteSelected}
                                            title={`Incomer for Section ${section}`}
                                        />
                                    );
                                })()}
                            </div>
                        ) : selectedIds.length > 0 && selectedIds[0].startsWith("Coupler") ? (
                            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-800">
                                <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-2">Coupler Config</h3>
                                {(() => {
                                    const section = selectedIds[0].split(":")[1];
                                    return (
                                        <div className="space-y-2">
                                            <div className="text-xs opacity-70">Bus Coupler for Sec {section}</div>
                                            <select
                                                value={properties[`BusCoupler${section}_Type`] || "MCCB"}
                                                onChange={(e) => handleUpdateProperty(`BusCoupler${section}_Type`, e.target.value)}
                                                className="w-full text-xs p-1 rounded border border-gray-300 dark:border-gray-700 bg-transparent"
                                            >
                                                <option value="MCCB">Standard Coupler (Switch)</option>
                                                <option value="Direct">Direct Link (Solid)</option>
                                                <option value="None">None (Gap)</option>
                                            </select>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : selectedIds.length > 0 && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800">
                                <h3 className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">{selectedIds.length} Items Selected</h3>
                                {selectedIds.length === 1 ? (
                                    (() => {
                                        const idx = parseInt(selectedIds[0]);
                                        const item = outgoings[idx];
                                        if (!item) return null;
                                        return (
                                            <RenderDeviceConfig
                                                type={item["Type"]}
                                                pole={item["Pole"] || (item["Type"] === "Main Switch Open" ? "TPN" : "")}
                                                rating={item["Current Rating"]}
                                                company={item["Company"]}
                                                rate={item["Rate"]}
                                                onChange={(field: string, val: string) => handleUpdateOutgoing(idx, field, val)}
                                                canDelete={true}
                                                onDelete={handleDeleteSelected}
                                                title={`Circuit ${idx + 1}`}
                                            />
                                        );
                                    })()
                                ) : (
                                    <div className="space-y-2">
                                        <div className="text-xs opacity-70">Bulk edit not supported yet.</div>
                                        <button onClick={handleDeleteSelected} className="w-full py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
                                            Delete Selected
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-xs text-gray-500">
                            Hold Shift to select multiple.<br />
                            Right-click for options.
                        </div>
                    </div>

                    {/* Visualizer Area */}
                    <div className="flex-1 overflow-auto p-8 bg-slate-100 dark:bg-slate-900 flex justify-center items-start relative"
                        onClick={() => { setSelectedIds([]); setContextMenu(null); }}
                        onContextMenu={(e) => { e.preventDefault(); }}
                    >
                        <div dangerouslySetInnerHTML={{ __html: PanelRenderer.generateSvg(localItem) }} className="pointer-events-none" />

                        <div
                            className="absolute"
                            style={{
                                width: PanelRenderer.generateSvg(localItem).match(/width="(\d+)"/)?.[1] + "px" || "auto",
                                height: PanelRenderer.generateSvg(localItem).match(/height="(\d+)"/)?.[1] + "px" || "auto",
                            }}
                        >
                            {(() => {
                                let currentX = margin;
                                return [...Array(incomerCount)].map((_, i) => {
                                    const section = i + 1;
                                    const width = sectionWidths[i];
                                    const sectionCenter = currentX + (width / 2);
                                    const sectionOutgoings = outgoings.map((o, idx) => ({ ...o, globalIdx: idx } as any))
                                        .filter(o => o["Section"] === section.toString());
                                    const outCount = Math.max(sectionOutgoings.length, 1);
                                    const totalOutWidth = (outCount - 1) * outgoingSpacing;
                                    const startOutX = sectionCenter - (totalOutWidth / 2);

                                    const result = (
                                        <React.Fragment key={section}>
                                            {/* Incomer Click Zone */}
                                            <div
                                                className={`absolute cursor-pointer border-2 hover:border-blue-400 rounded ${selectedIds.includes(`Incomer:${section}`) ? "border-blue-600 bg-blue-500/20" : "border-transparent"}`}
                                                style={{ left: sectionCenter - 25, top: margin + 10, width: 50, height: 60 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedIds([`Incomer:${section}`]);
                                                }}
                                                title={`Incomer ${section}`}
                                            />

                                            {sectionOutgoings.map((out, idx) => {
                                                const itemX = startOutX + (idx * outgoingSpacing);
                                                const isSelected = selectedIds.includes(out.globalIdx.toString());

                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`absolute cursor-pointer transition-all border-2 ${isSelected ? "border-blue-500 bg-blue-500/10" : "border-transparent hover:border-blue-300/50"}`}
                                                        style={{
                                                            left: itemX - 20,
                                                            top: outgoingTopY + 10,
                                                            width: 40,
                                                            height: outgoingLength,
                                                            borderRadius: '4px'
                                                        }}
                                                        draggable={true}
                                                        onDragStart={(e) => {
                                                            e.stopPropagation();
                                                            e.dataTransfer.effectAllowed = "move";
                                                            e.dataTransfer.setData("text/plain", out.globalIdx.toString());
                                                        }}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = "move";
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const sourceIdx = parseInt(e.dataTransfer.getData("text/plain"));
                                                            const targetIdx = out.globalIdx;

                                                            if (!isNaN(sourceIdx) && sourceIdx !== targetIdx) {
                                                                const newOut = [...outgoings];
                                                                const [movedItem] = newOut.splice(sourceIdx, 1);
                                                                movedItem["Section"] = section.toString();
                                                                let adjustedTarget = targetIdx;
                                                                if (sourceIdx < targetIdx) adjustedTarget -= 1;
                                                                newOut.splice(adjustedTarget, 0, movedItem);
                                                                setLocalItem({ ...localItem, outgoing: newOut });
                                                            }
                                                        }}
                                                        onClick={(e) => handleSlotClick(e, section, idx, out.globalIdx)}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault(); e.stopPropagation();
                                                            if (!selectedIds.includes(out.globalIdx.toString())) {
                                                                setSelectedIds([out.globalIdx.toString()]);
                                                            }
                                                            setContextMenu({ x: e.clientX, y: e.clientY, section, index: out.globalIdx });
                                                        }}
                                                    />
                                                );
                                            })}

                                            {/* Add Outgoing Button */}
                                            <div
                                                className="absolute cursor-pointer hover:bg-green-500/20 flex items-center justify-center group rounded-full border border-dashed border-gray-400"
                                                style={{
                                                    left: startOutX + (sectionOutgoings.length * outgoingSpacing) - 15,
                                                    top: outgoingTopY + 20,
                                                    width: 30,
                                                    height: 30
                                                }}
                                                onClick={(e) => { e.stopPropagation(); handleAddOutgoing(section); }}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = "move";
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const sourceIdx = parseInt(e.dataTransfer.getData("text/plain"));
                                                    if (!isNaN(sourceIdx)) {
                                                        const newOut = [...outgoings];
                                                        const [movedItem] = newOut.splice(sourceIdx, 1);
                                                        movedItem["Section"] = section.toString();
                                                        let lastSectionIdx = -1;
                                                        newOut.forEach((o, i) => {
                                                            if (o["Section"] === section.toString()) lastSectionIdx = i;
                                                        });
                                                        if (lastSectionIdx !== -1) {
                                                            newOut.splice(lastSectionIdx + 1, 0, movedItem);
                                                        } else {
                                                            newOut.push(movedItem);
                                                        }
                                                        setLocalItem({ ...localItem, outgoing: newOut });
                                                    }
                                                }}
                                                onContextMenu={(e) => {
                                                    e.preventDefault(); e.stopPropagation();
                                                    setContextMenu({ x: e.clientX, y: e.clientY, section, index: null });
                                                }}
                                                title="Add New Circuit"
                                            >
                                                <Plus size={16} className="opacity-50 group-hover:opacity-100" />
                                            </div>

                                            {/* Coupler Zone */}
                                            {i < incomerCount - 1 && (
                                                <div
                                                    className={`absolute cursor-pointer border-2 hover:border-purple-400 rounded ${selectedIds.includes(`Coupler:${section}`) ? "border-purple-600 bg-purple-500/20" : "border-transparent"}`}
                                                    style={{
                                                        left: currentX + width + 10,
                                                        top: busbarY - 10,
                                                        width: couplerWidth - 20,
                                                        height: 40
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedIds([`Coupler:${section}`]);
                                                    }}
                                                    title={`Bus Coupler ${section}`}
                                                />
                                            )}
                                        </React.Fragment>
                                    );

                                    currentX += width + (i < incomerCount - 1 ? couplerWidth : 0);
                                    return result;
                                });
                            })()}

                            {/* Add Incomer Button */}
                            {incomerCount < 3 && (
                                <div
                                    className="absolute cursor-pointer hover:bg-blue-500/20 flex items-center justify-center group rounded-full border border-dashed border-blue-400"
                                    style={{
                                        left: margin + sectionWidths.reduce((a, b) => a + b, 0) + (incomerCount - 1) * couplerWidth + 15,
                                        top: margin + 20,
                                        width: 35,
                                        height: 35
                                    }}
                                    onClick={(e) => { e.stopPropagation(); handleAddIncomer(); }}
                                    title="Add Incomer Section"
                                >
                                    <Plus size={18} className="opacity-50 group-hover:opacity-100" style={{ color: colors.text }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {contextMenu && (
                <div
                    className="fixed z-[60] bg-white dark:bg-slate-800 shadow-xl rounded-lg py-1 border border-gray-200 dark:border-gray-700 min-w-[150px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    {contextMenu.index !== null ? (
                        <>
                            <button onClick={handleCopy} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
                                <Copy size={14} /> Copy {selectedIds.length > 1 ? `(${selectedIds.length})` : ''}
                            </button>
                            <button onClick={() => handlePaste(contextMenu.section, contextMenu.index)} disabled={clipboard.length === 0} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 border-t border-gray-100 dark:border-gray-800">
                                Paste Here
                            </button>
                            <button onClick={() => { handleDeleteSelected(); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 flex items-center gap-2 border-t border-gray-100 dark:border-gray-800">
                                <Trash size={14} /> Delete
                            </button>
                        </>
                    ) : (
                        <button onClick={() => handlePaste(contextMenu.section, null)} disabled={clipboard.length === 0} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
                            Paste ({clipboard.length})
                        </button>
                    )}
                    <button onClick={() => setContextMenu(null)} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-t mt-1">
                        Cancel
                    </button>
                </div>
            )}

            {contextMenu && (
                <div className="fixed inset-0 z-[55] bg-transparent" onClick={() => setContextMenu(null)} />
            )}
        </div>
    );
};
