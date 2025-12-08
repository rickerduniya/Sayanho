import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface VoltageDropCalculatorDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CalculationResult {
    voltageDropVolts: number;
    voltageDropPercent: number;
    isCompliant: boolean;
    mvPerAmpPerMeter?: number; // camelCase from MVPerAmpPerMeter
    mVPerAmpPerMeter?: number; // Alternative casing
    MVPerAmpPerMeter?: number; // PascalCase (should not happen with camelCase policy)
    phaseMultiplier?: number;
    PhaseMultiplier?: number;
}

export const VoltageDropCalculatorDialog: React.FC<VoltageDropCalculatorDialogProps> = ({
    isOpen,
    onClose
}) => {
    const { colors } = useTheme();

    // Form state
    const [conductor, setConductor] = useState<string>('Copper');
    const [phaseType, setPhaseType] = useState<string>('single');
    const [cableSize, setCableSize] = useState<number>(2.5);
    const [current, setCurrent] = useState<number>(10);
    const [length, setLength] = useState<number>(10);
    const [supplyVoltage, setSupplyVoltage] = useState<number>(230);

    // Result state
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Cable size options (common sizes in mm²)
    const cableSizes = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185];

    const handleCalculate = async () => {
        setIsCalculating(true);
        setError(null);
        setResult(null);

        try {
            const isThreePhase = phaseType === 'three';

            // Default voltage based on phase
            const voltage = phaseType === 'three' ? 415 : supplyVoltage;

            const response = await fetch(`/api/tools/voltage-drop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conductor,
                    cableSize,
                    current,
                    length,
                    isThreePhase,
                    supplyVoltage: voltage
                }),
            });

            if (!response.ok) {
                throw new Error(`Calculation failed: ${response.statusText}`);
            }

            const data = await response.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Calculation failed');
        } finally {
            setIsCalculating(false);
        }
    };

    const handleReset = () => {
        setConductor('Copper');
        setPhaseType('single');
        setCableSize(2.5);
        setCurrent(10);
        setLength(10);
        setSupplyVoltage(230);
        setResult(null);
        setError(null);
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
                className="relative bg-white rounded-lg shadow-2xl w-[500px] max-h-[90vh] overflow-y-auto"
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
                    <h2 className="text-lg font-semibold">Voltage Drop Calculator</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Conductor Material */}
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-sm font-medium">Conductor:</label>
                        <select
                            value={conductor}
                            onChange={(e) => setConductor(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                                backgroundColor: colors.canvasBackground,
                                borderColor: colors.border,
                                color: colors.text
                            }}
                        >
                            <option value="Copper">Copper</option>
                            <option value="Aluminium">Aluminium</option>
                        </select>
                    </div>

                    {/* Phase Type */}
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-sm font-medium">Phase Type:</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="phaseType"
                                    value="single"
                                    checked={phaseType === 'single'}
                                    onChange={(e) => {
                                        setPhaseType(e.target.value);
                                        setSupplyVoltage(230);
                                    }}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">Single Phase (230V)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="phaseType"
                                    value="three"
                                    checked={phaseType === 'three'}
                                    onChange={(e) => {
                                        setPhaseType(e.target.value);
                                        setSupplyVoltage(415);
                                    }}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">3-Phase (415V)</span>
                            </label>
                        </div>
                    </div>

                    {/* Cable Size */}
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-sm font-medium">Cable Size:</label>
                        <select
                            value={cableSize}
                            onChange={(e) => setCableSize(parseFloat(e.target.value))}
                            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            style={{
                                backgroundColor: colors.canvasBackground,
                                borderColor: colors.border,
                                color: colors.text
                            }}
                        >
                            {cableSizes.map(size => (
                                <option key={size} value={size}>{size} sq.mm</option>
                            ))}
                        </select>
                    </div>

                    {/* Current */}
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-sm font-medium">Load Current:</label>
                        <div className="flex items-center gap-2 flex-1">
                            <input
                                type="number"
                                value={current}
                                onChange={(e) => setCurrent(parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.1"
                                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{
                                    backgroundColor: colors.canvasBackground,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                            />
                            <span className="text-sm text-gray-500">A</span>
                        </div>
                    </div>

                    {/* Length */}
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-sm font-medium">Cable Length:</label>
                        <div className="flex items-center gap-2 flex-1">
                            <input
                                type="number"
                                value={length}
                                onChange={(e) => setLength(parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.1"
                                className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{
                                    backgroundColor: colors.canvasBackground,
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                            />
                            <span className="text-sm text-gray-500">m</span>
                        </div>
                    </div>

                    {/* Supply Voltage (hidden, implied by phase) */}
                    {/* <div className="flex items-center gap-4">
                        <label className="w-32 text-sm font-medium">Supply Voltage:</label>
                        <div className="flex items-center gap-2 flex-1">
                            <input
                                type="number"
                                value={supplyVoltage}
                                readOnly
                                className="flex-1 px-3 py-2 border rounded-md bg-gray-100"
                                style={{
                                    borderColor: colors.border,
                                    color: colors.text
                                }}
                            />
                            <span className="text-sm text-gray-500">V</span>
                        </div>
                    </div> */}

                    {/* Calculate Button */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleCalculate}
                            disabled={isCalculating}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                            {isCalculating ? 'Calculating...' : 'Calculate'}
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 border rounded-md hover:bg-gray-100"
                            style={{ borderColor: colors.border }}
                        >
                            Reset
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div
                            className="p-4 rounded-md border"
                            style={{
                                backgroundColor: result.isCompliant ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                borderColor: result.isCompliant ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                            }}
                        >
                            <h3 className="font-semibold mb-3">Calculation Result</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>mV/A/m (from database):</span>
                                    <span className="font-mono font-medium">{(result.mvPerAmpPerMeter ?? result.mVPerAmpPerMeter ?? result.MVPerAmpPerMeter ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Voltage Drop:</span>
                                    <span className="font-mono font-medium">{result.voltageDropVolts.toFixed(3)} V</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Voltage Drop %:</span>
                                    <span className="font-mono font-medium">{result.voltageDropPercent.toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t" style={{ borderColor: colors.border }}>
                                    <span>Status:</span>
                                    <span
                                        className={`font-semibold ${result.isCompliant ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                        {result.isCompliant ? '✓ Within Limits' : '⚠ Exceeds Limit'}
                                    </span>
                                </div>
                            </div>

                            {/* Formula explanation */}
                            <div className="mt-3 pt-3 border-t text-xs text-gray-500" style={{ borderColor: colors.border }}>
                                <p>Formula: V<sub>drop</sub> = {phaseType === 'three' ? '√3' : '2'} × (mV/A/m) × Current × Length / 1000</p>
                                <p className="mt-1">
                                    = {(result.phaseMultiplier ?? result.PhaseMultiplier ?? (phaseType === 'three' ? 1.732 : 2)).toFixed(3)} × {(result.mvPerAmpPerMeter ?? result.mVPerAmpPerMeter ?? result.MVPerAmpPerMeter ?? 0).toFixed(2)} × {current} × {length} / 1000
                                    = {result.voltageDropVolts.toFixed(3)} V
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="flex justify-end px-4 py-3 border-t"
                    style={{ borderColor: colors.border }}
                >
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-md hover:bg-gray-100"
                        style={{ borderColor: colors.border }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
