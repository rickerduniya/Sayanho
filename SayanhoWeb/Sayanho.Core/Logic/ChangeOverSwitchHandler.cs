using Sayanho.Core.Models;

namespace Sayanho.Core.Logic
{
    public class ChangeOverSwitchHandler
    {
        // Method to determine phase based on Voltage property
        public static (float voltage, string phase) DeterminePhaseAndVoltage(CanvasItem item)
        {
            float voltage = 415f; // Default to three phase
            string phase = "ALL"; // Default phase

            // Check if properties exist and contain Voltage information
            if (item.Properties != null && 
                item.Properties.Any() && 
                item.Properties.First().ContainsKey("Voltage"))
            {
                string voltageInfo = item.Properties.First()["Voltage"];
                
                if (voltageInfo.Contains("DP") || voltageInfo.Contains("230V"))
                {
                    voltage = 230f;
                    phase = "R"; // Default to R phase for single phase
                }
            }

            return (voltage, phase);
        }
    }
}
