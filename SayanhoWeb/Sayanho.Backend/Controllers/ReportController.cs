using Microsoft.AspNetCore.Mvc;
using Sayanho.Backend.Services;
using Sayanho.Core.Logic;
using Sayanho.Core.Models;
using System.Collections.Generic;

namespace Sayanho.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportController : ControllerBase
    {
        private readonly ReportService _reportService;

        public ReportController()
        {
            _reportService = new ReportService();
        }

        [HttpPost("voltage-drop")]
        public IActionResult GenerateVoltageDropReport([FromBody] AutoRatingRequest request)
        {
            try
            {
                if (request == null || request.Sheets == null || !request.Sheets.Any())
                {
                    return BadRequest(new { message = "No sheets provided for report generation" });
                }

                // Apply settings if provided
                if (request.Settings != null)
                {
                    ApplicationSettings.SetCurrent(request.Settings);
                }

                // Run analysis to get report data
                // We use the same service but specifically call GetCumulativeReportData
                var autoRatingService = new AutoRatingService(request.Sheets);
                
                // We need to run the FULL auto-rating process to generate the logs and perform upsizing
                autoRatingService.AutoSetRatings();
                
                var reportData = autoRatingService.GetCumulativeReportData();
                
                Console.WriteLine($"Debug: Report generated with {reportData.ProcessLogs?.Count ?? 0} log entries");

                // Generate PDF
                var pdfBytes = _reportService.GenerateCumulativeVDReport(reportData);
                
                return File(pdfBytes, "application/pdf", "VoltageDropReport.pdf");
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = $"Report generation error: {ex.Message}" });
            }
        }
    }
}
