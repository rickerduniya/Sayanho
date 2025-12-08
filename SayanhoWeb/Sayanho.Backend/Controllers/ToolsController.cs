using Microsoft.AspNetCore.Mvc;
using Sayanho.Core.Logic;

namespace Sayanho.Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ToolsController : ControllerBase
{
    public class VoltageDropRequest
    {
        public string Conductor { get; set; } = "Copper";
        public double CableSize { get; set; } = 2.5;
        public double Current { get; set; } = 10;
        public double Length { get; set; } = 10;
        public bool IsThreePhase { get; set; } = false;
        public double SupplyVoltage { get; set; } = 230;
    }

    public class VoltageDropResponse
    {
        public double VoltageDropVolts { get; set; }
        public double VoltageDropPercent { get; set; }
        public bool IsCompliant { get; set; }
        public double MVPerAmpPerMeter { get; set; }
        public double PhaseMultiplier { get; set; }
    }

    /// <summary>
    /// Calculate voltage drop for a cable
    /// </summary>
    [HttpPost("voltage-drop")]
    public ActionResult<VoltageDropResponse> CalculateVoltageDrop([FromBody] VoltageDropRequest request)
    {
        try
        {
            if (request.Length <= 0)
            {
                return BadRequest("Cable length must be greater than 0");
            }

            if (request.Current <= 0)
            {
                return BadRequest("Current must be greater than 0");
            }

            if (request.CableSize <= 0)
            {
                return BadRequest("Cable size must be greater than 0");
            }

            // Calculate voltage drop using the VoltageDropCalculator with details
            var (voltageDropVolts, mVPerAmpPerMeter, phaseMultiplier) = VoltageDropCalculator.CalculateCableVoltageDropWithDetails(
                request.Conductor,
                request.CableSize,
                request.Current,
                request.Length,
                request.IsThreePhase
            );

            // Calculate percentage
            double supplyVoltage = request.SupplyVoltage > 0 ? request.SupplyVoltage : (request.IsThreePhase ? 415.0 : 230.0);
            double voltageDropPercent = (voltageDropVolts / supplyVoltage) * 100;

            // Check compliance (default max is 5%)
            double maxAllowedPercent = ApplicationSettings.Instance.MaxVoltageDropPercentage;
            bool isCompliant = voltageDropPercent <= maxAllowedPercent;

            var response = new VoltageDropResponse
            {
                VoltageDropVolts = voltageDropVolts,
                VoltageDropPercent = voltageDropPercent,
                IsCompliant = isCompliant,
                MVPerAmpPerMeter = mVPerAmpPerMeter,
                PhaseMultiplier = phaseMultiplier
            };

            Console.WriteLine($"Voltage Drop API: {request.Conductor} {request.CableSize}mm², {request.Current}A, {request.Length}m, " +
                            $"{(request.IsThreePhase ? "3-phase" : "1-phase")} = {voltageDropVolts:F3}V ({voltageDropPercent:F2}%), mV/A/m={mVPerAmpPerMeter}, multiplier={phaseMultiplier:F3}");

            return Ok(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Voltage Drop API Error: {ex.Message}");
            return StatusCode(500, $"Calculation error: {ex.Message}");
        }
    }
}
