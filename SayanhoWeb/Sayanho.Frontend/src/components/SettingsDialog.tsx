import React, { useState, useEffect } from 'react';
import { ApplicationSettings, AppSettings } from '../utils/ApplicationSettings';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';

interface SettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, onSave }) => {
    const { colors } = useTheme();
    const { settings: storeSettings, updateSettings } = useStore();
    const [activeTab, setActiveTab] = useState<'calculation' | 'image' | 'ai'>('calculation');
    const [settings, setSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Load from local storage first to get full settings object (including AI, diversification, etc.)
            // Then overlay store settings to ensure sync
            const loaded = ApplicationSettings.load();
            setSettings({
                ...loaded,
                maxVoltageDropPercentage: storeSettings.maxVoltageDropPercentage,
                safetyMarginPercentage: storeSettings.safetyMarginPercentage,
                voltageDropEnabled: storeSettings.voltageDropEnabled
            });
        }
    }, [isOpen, storeSettings]);

    if (!isOpen || !settings) return null;

    const handleSave = () => {
        if (settings) {
            ApplicationSettings.save(settings);
            // Update store with relevant settings
            updateSettings({
                maxVoltageDropPercentage: settings.maxVoltageDropPercentage,
                safetyMarginPercentage: settings.safetyMarginPercentage,
                voltageDropEnabled: settings.voltageDropEnabled
            });
            onSave();
            onClose();
        }
    };

    const handleReset = () => {
        if (confirm("Reset all settings to default values?")) {
            // Re-load defaults by clearing storage or just creating a new default object
            // Since ApplicationSettings.load() handles defaults if storage is empty, 
            // we can just manually set defaults here or clear storage. 
            // Let's use the default object structure directly.
            const defaults: AppSettings = {
                safetyMarginPercentage: 25.0,
                voltageDropEnabled: true,
                maxVoltageDropPercentage: 7.0,
                diversificationFactors: {
                    "Bulb": 1.0,
                    "Tube Light": 1.0,
                    "Ceiling Fan": 1.0,
                    "Exhaust Fan": 1.0,
                    "Split AC": 1.0,
                    "Geyser": 1.0,
                    "Call Bell": 1.0
                },
                saveImageInColor: true,
                showCurrentValues: true,
                showCableSpecs: true,
                connectorSpecTextFontSize: 10,
                aiSettings: {
                    apiKey: '',
                    modelName: 'gpt-4o',
                    baseUrl: ''
                }
            };
            setSettings(defaults);
        }
    };

    const updateDiversificationFactor = (key: string, value: number) => {
        setSettings(prev => prev ? ({
            ...prev,
            diversificationFactors: {
                ...prev.diversificationFactors,
                [key]: value
            }
        }) : null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="w-[500px] rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
                style={{ backgroundColor: colors.panelBackground, color: colors.text }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: colors.border }}>
                    <h2 className="font-semibold text-lg">Application Settings</h2>
                    <button onClick={onClose} className="opacity-60 hover:opacity-100">&times;</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: colors.border }}>
                    <button
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'calculation' ? 'border-b-2 border-blue-500 text-blue-500' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => setActiveTab('calculation')}
                    >
                        Calculation Settings
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'image' ? 'border-b-2 border-blue-500 text-blue-500' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => setActiveTab('image')}
                    >
                        Save Image Settings
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium ${activeTab === 'ai' ? 'border-b-2 border-blue-500 text-blue-500' : 'opacity-70 hover:opacity-100'}`}
                        onClick={() => setActiveTab('ai')}
                    >
                        AI Settings
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'calculation' ? (
                        <div className="space-y-6">
                            {/* Safety Margin */}
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-sm">Safety Margin (%):</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={settings.safetyMarginPercentage}
                                    onChange={e => setSettings({ ...settings, safetyMarginPercentage: parseFloat(e.target.value) })}
                                    className="w-24 px-2 py-1 rounded border text-right"
                                    style={{ backgroundColor: colors.canvasBackground, borderColor: colors.border, color: colors.text }}
                                />
                            </div>

                            {/* Voltage Drop */}
                            <div className="space-y-3">
                                <label className="font-bold text-sm block">Voltage Drop Consideration:</label>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={settings.voltageDropEnabled}
                                        onChange={e => setSettings({ ...settings, voltageDropEnabled: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">Enable voltage drop calculation</span>
                                </div>
                                <div className="flex items-center justify-between ml-6">
                                    <span className="text-sm">Max Voltage Drop (%):</span>
                                    <input
                                        type="number"
                                        min="0.1"
                                        max="10"
                                        step="0.1"
                                        value={settings.maxVoltageDropPercentage}
                                        onChange={e => setSettings({ ...settings, maxVoltageDropPercentage: parseFloat(e.target.value) })}
                                        className="w-24 px-2 py-1 rounded border text-right"
                                        style={{ backgroundColor: colors.canvasBackground, borderColor: colors.border, color: colors.text }}
                                    />
                                </div>
                            </div>

                            {/* Diversification Factors */}
                            <div className="space-y-3">
                                <label className="font-bold text-sm block">Diversification Factors:</label>
                                <div className="grid grid-cols-1 gap-2 pl-4">
                                    {Object.entries(settings.diversificationFactors).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between">
                                            <span className="text-sm">{key}:</span>
                                            <input
                                                type="number"
                                                min="0.1"
                                                max="2.0"
                                                step="0.05"
                                                value={value}
                                                onChange={e => updateDiversificationFactor(key, parseFloat(e.target.value))}
                                                className="w-24 px-2 py-1 rounded border text-right"
                                                style={{ backgroundColor: colors.canvasBackground, borderColor: colors.border, color: colors.text }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    ) : activeTab === 'ai' ? (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="font-bold text-sm block">API Key:</label>
                                <input
                                    type="password"
                                    value={settings.aiSettings?.apiKey || ''}
                                    onChange={e => setSettings({
                                        ...settings,
                                        aiSettings: { ...settings.aiSettings, apiKey: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 rounded border"
                                    style={{ backgroundColor: colors.canvasBackground, borderColor: colors.border, color: colors.text }}
                                    placeholder="sk-..."
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="font-bold text-sm block">Model Name:</label>
                                <input
                                    type="text"
                                    value={settings.aiSettings?.modelName || 'gemini-2.5-flash'}
                                    onChange={e => setSettings({
                                        ...settings,
                                        aiSettings: { ...settings.aiSettings, modelName: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 rounded border"
                                    style={{ backgroundColor: colors.canvasBackground, borderColor: colors.border, color: colors.text }}
                                    placeholder="e.g. gemini-2.5-flash, gemini-2.0-flash-exp"
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="font-bold text-sm block">Base URL (Optional):</label>
                                <input
                                    type="text"
                                    value={settings.aiSettings?.baseUrl || ''}
                                    onChange={e => setSettings({
                                        ...settings,
                                        aiSettings: { ...settings.aiSettings, baseUrl: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 rounded border"
                                    style={{ backgroundColor: colors.canvasBackground, borderColor: colors.border, color: colors.text }}
                                    placeholder="https://api.openai.com/v1"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Color Mode */}
                            <div className="space-y-3">
                                <label className="font-bold text-sm block">Image Color Mode:</label>
                                <div className="pl-4 space-y-2">
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            name="colorMode"
                                            checked={settings.saveImageInColor}
                                            onChange={() => setSettings({ ...settings, saveImageInColor: true })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Color</span>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            name="colorMode"
                                            checked={!settings.saveImageInColor}
                                            onChange={() => setSettings({ ...settings, saveImageInColor: false })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Black and White</span>
                                    </div>
                                </div>
                            </div>

                            {/* Display Options */}
                            <div className="space-y-3">
                                <label className="font-bold text-sm block">Display Options:</label>
                                <div className="pl-4 space-y-2">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.showCurrentValues}
                                            onChange={e => setSettings({ ...settings, showCurrentValues: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Show current values</span>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={settings.showCableSpecs}
                                            onChange={e => setSettings({ ...settings, showCableSpecs: e.target.checked })}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">Show cable specifications</span>
                                    </div>
                                </div>
                            </div>

                            {/* Connector Spec Text Font Size */}
                            <div className="flex items-center justify-between">
                                <label className="font-bold text-sm">Connector Spec Text Font Size:</label>
                                <input
                                    type="number"
                                    min="6"
                                    max="20"
                                    step="1"
                                    value={settings.connectorSpecTextFontSize}
                                    onChange={e => setSettings({ ...settings, connectorSpecTextFontSize: parseInt(e.target.value) })}
                                    className="w-24 px-2 py-1 rounded border text-right"
                                    style={{ backgroundColor: colors.canvasBackground, borderColor: colors.border, color: colors.text }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t flex justify-end space-x-3" style={{ borderColor: colors.border, backgroundColor: colors.panelBackground }}>
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700 mr-auto"
                        style={{ color: colors.text }}
                    >
                        Reset to Defaults
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        style={{ color: colors.text }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                        OK
                    </button>
                </div>
            </div>

        </div>
    );
};
