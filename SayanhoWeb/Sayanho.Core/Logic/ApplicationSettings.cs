using System.Text.Json;

namespace Sayanho.Core.Logic
{
    public class ApplicationSettings
    {
        public double SafetyMarginPercentage { get; set; } = 25.0;
        public bool VoltageDropEnabled { get; set; } = true;
        public double MaxVoltageDropPercentage { get; set; } = 7.0;
        public Dictionary<string, double> DiversificationFactors { get; set; } = new Dictionary<string, double>();
        
        // Save Image settings
        public bool SaveImageInColor { get; set; } = true;
        public bool ShowCurrentValues { get; set; } = true;
        public bool ShowCableSpecs { get; set; } = true;

        // In a web app, we might store this in a database or a config file in a different location.
        // For now, we'll keep the static Load/Save logic but point to a relative path or let the API handle persistence.
        // We will make it a simple POCO for now and let the API Controller manage loading/saving.

        public ApplicationSettings()
        {
            var defaultLoadTypes = new[] {
                "Bulb", "Tube Light", "Ceiling Fan", "Exhaust Fan", 
                "Split AC", "Geyser", "Call Bell"
            };

            foreach (string loadType in defaultLoadTypes)
            {
                DiversificationFactors[loadType] = 1.0;
            }
        }
        
        // Static helper to simulate the global access pattern from the desktop app, 
        // but in a real web app this should be injected via DI.
        private static ApplicationSettings _current = new ApplicationSettings();
        
        public static ApplicationSettings Instance => _current;

        public static void SetCurrent(ApplicationSettings settings)
        {
            _current = settings;
        }

        public static double GetDiversificationFactor(string loadType)
        {
            return _current.DiversificationFactors.ContainsKey(loadType) 
                ? _current.DiversificationFactors[loadType] 
                : 1.0;
        }
    }
}
