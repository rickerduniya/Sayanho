using Microsoft.AspNetCore.Mvc;
using Sayanho.Core.Logic;
using Sayanho.Core.Models;

using Sayanho.Backend.Services;

namespace Sayanho.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EstimateController : ControllerBase
    {
        [HttpPost("test")]
        public async Task<IActionResult> TestDeserialize()
        {
            try
            {
                using var reader = new StreamReader(Request.Body);
                var body = await reader.ReadToEndAsync();
                Console.WriteLine($"[INFO] Raw request body length: {body.Length}");
                Console.WriteLine($"[INFO] First 500 chars: {body.Substring(0, Math.Min(500, body.Length))}");
                
                var options = new System.Text.Json.JsonSerializerOptions
                {
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
                    Converters = { new Sayanho.Backend.Converters.PointJsonConverter(), new Sayanho.Backend.Converters.SizeJsonConverter() }
                };
                
                var sheets = System.Text.Json.JsonSerializer.Deserialize<List<CanvasSheet>>(body, options);
                Console.WriteLine($"[INFO] Deserialized {sheets?.Count ?? 0} sheets");
                if (sheets != null && sheets.Count > 0)
                {
                    Console.WriteLine($"[INFO] First sheet has {sheets[0].CanvasItems?.Count ?? 0} items");
                }
                
                return Ok(new { success = true, sheetCount = sheets?.Count ?? 0 });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Test deserialization failed: {ex.Message}");
                Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
                return BadRequest(new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }
        
        [HttpPost]
        public IActionResult GenerateEstimate([FromBody] List<CanvasSheet> sheets)
        {
            try
            {
                Console.WriteLine($"[INFO] Received estimate request with {sheets?.Count ?? 0} sheets");
                
                if (sheets == null || sheets.Count == 0)
                {
                    Console.WriteLine("[ERROR] No sheets provided");
                    return BadRequest(new { message = "No sheets provided" });
                }

                // Collect all items and connectors from all sheets
                var allItems = new List<CanvasItem>();
                var allConnectors = new List<Connector>();

                foreach (var sheet in sheets)
                {
                    if (sheet.CanvasItems != null)
                        allItems.AddRange(sheet.CanvasItems);
                    if (sheet.StoredConnectors != null)
                        allConnectors.AddRange(sheet.StoredConnectors);
                }

                var service = new EstimateService();
                var fileBytes = service.GenerateEstimate(sheets);
                
                var fileName = $"Estimate_{DateTime.Now:yyyy-MM-dd}.xlsx";
                
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Estimate generation failed: {ex.Message}");
                Console.WriteLine($"[ERROR] Stack trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[ERROR] Inner exception: {ex.InnerException.Message}");
                }
                return BadRequest(new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }
    }
}
