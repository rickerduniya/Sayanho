const SETTINGS_KEY = 'sayanho_app_settings';

export interface AppSettings {
    safetyMarginPercentage: number;
    voltageDropEnabled: boolean;
    maxVoltageDropPercentage: number;
    diversificationFactors: Record<string, number>;
    saveImageInColor: boolean;
    showCurrentValues: boolean;
    showCableSpecs: boolean;
    connectorSpecTextFontSize: number;
    aiSettings: {
        apiKey: string;
        modelName: string;
        baseUrl: string;
    };
}

const DEFAULT_SETTINGS: AppSettings = {
    safetyMarginPercentage: 25.0,
    voltageDropEnabled: true,
    maxVoltageDropPercentage: 3.0,
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
        modelName: 'gemini-2.5-flash',
        baseUrl: ''
    }
};

export class ApplicationSettings {
    static load(): AppSettings {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);

                // Migration: Auto-update legacy/invalid model names
                let modelName = parsed.aiSettings?.modelName;
                if (modelName === 'gemini-1.5-flash' || modelName === 'gemini-1.5-flash-latest') {
                    if (parsed.aiSettings) {
                        parsed.aiSettings.modelName = 'gemini-2.5-flash';
                    }
                }

                // Merge with defaults to ensure all keys exist
                return {
                    ...DEFAULT_SETTINGS,
                    ...parsed,
                    diversificationFactors: {
                        ...DEFAULT_SETTINGS.diversificationFactors,
                        ...(parsed.diversificationFactors || {})
                    },
                    aiSettings: {
                        ...DEFAULT_SETTINGS.aiSettings,
                        ...(parsed.aiSettings || {})
                    }
                };
            }
        } catch (e) {
            console.error("Failed to load settings", e);
        }
        return { ...DEFAULT_SETTINGS };
    }

    static save(settings: AppSettings): void {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {
            console.error("Failed to save settings", e);
        }
    }

    static getSafetyMarginPercentage(): number {
        return this.load().safetyMarginPercentage;
    }

    static getDiversificationFactor(loadType: string): number {
        const settings = this.load();
        return settings.diversificationFactors[loadType] || 1.0;
    }

    static getVoltageDropEnabled(): boolean {
        return this.load().voltageDropEnabled;
    }

    static getMaxVoltageDropPercentage(): number {
        return this.load().maxVoltageDropPercentage;
    }

    static getSaveImageInColor(): boolean {
        return this.load().saveImageInColor;
    }

    static getShowCurrentValues(): boolean {
        return this.load().showCurrentValues;
    }

    static getShowCableSpecs(): boolean {
        return this.load().showCableSpecs;
    }

    static getConnectorSpecTextFontSize(): number {
        return this.load().connectorSpecTextFontSize;
    }

    static getAiSettings() {
        return this.load().aiSettings;
    }
}

