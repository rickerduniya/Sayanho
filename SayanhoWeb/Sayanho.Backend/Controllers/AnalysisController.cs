using Microsoft.AspNetCore.Mvc;
using Sayanho.Core.Logic;
using Sayanho.Core.Models;

namespace Sayanho.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalysisController : ControllerBase
    {
        [HttpPost]
        public IActionResult Analyze([FromBody] CanvasSheet sheet)
        {
            try
            {
                // Create a list containing the single sheet for analysis
                // In a real scenario, we might need to load referenced sheets if there are inter-sheet connections
                var sheets = new List<CanvasSheet> { sheet };
                
                var analyzer = new NetworkAnalyzer(sheets);
                analyzer.AnalyzeNetwork();
                
                // Return the updated sheet with calculated currents
                return Ok(sheet);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("auto-rate")]
        public IActionResult AutoRate([FromBody] AutoRatingRequest request)
        {
            // Log model validation errors if any
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                Console.WriteLine($"AutoRate ModelState validation failed: {string.Join(", ", errors)}");
                return BadRequest(ModelState);
            }

            try
            {
                if (request == null || request.Sheets == null || !request.Sheets.Any())
                {
                    return BadRequest(new { message = "No sheets provided for auto-rating" });
                }

                // Apply settings if provided
                if (request.Settings != null)
                {
                    ApplicationSettings.SetCurrent(request.Settings);
                }

                // Create and run auto rating service
                var autoRatingService = new AutoRatingService(request.Sheets);
                var result = autoRatingService.ExecuteAutoRating();
                
                // Return updated sheets with new ratings and log
                return Ok(new { 
                    sheets = result.Sheets, 
                    log = result.Log, 
                    success = result.Success,
                    message = result.Success ? "Auto-rating completed successfully." : "Auto-rating failed validation checks."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Auto-rating error: {ex.Message}", success = false, log = ex.StackTrace });
            }
        }
    }
}
