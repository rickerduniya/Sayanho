using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace Sayanho.Backend.Controllers
{
    [Route("api/icons")]
    [ApiController]
    public class IconsController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public IconsController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpGet("{*fileName}")]
        public IActionResult GetIcon(string fileName)
        {
            if (string.IsNullOrEmpty(fileName))
            {
                return BadRequest("Filename is required.");
            }

            // Decode the filename just in case, though ASP.NET Core usually handles it
            fileName = System.Net.WebUtility.UrlDecode(fileName);

            // Try wwwroot/icons first (standard production path)
            var wwwrootIconsPath = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "icons");
            var wwwrootFilePath = Path.Combine(wwwrootIconsPath, fileName);

            // Security check for wwwroot path
            if (Path.GetFullPath(wwwrootFilePath).StartsWith(Path.GetFullPath(wwwrootIconsPath), StringComparison.OrdinalIgnoreCase))
            {
                if (System.IO.File.Exists(wwwrootFilePath))
                {
                    var contentType = GetContentType(wwwrootFilePath);
                    var fileBytes = System.IO.File.ReadAllBytes(wwwrootFilePath);
                    return File(fileBytes, contentType);
                }
            }

            // Fallback to external icons directory (for local development compatibility)
            var externalIconsPath = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "../../Sayanho - C# version/icons"));
            var externalFilePath = Path.Combine(externalIconsPath, fileName);

            // Security check for external path
            if (!Path.GetFullPath(externalFilePath).StartsWith(externalIconsPath, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest("Invalid file path.");
            }

            if (!System.IO.File.Exists(externalFilePath))
            {
                return NotFound($"Icon not found: {fileName}");
            }

            var contentTypeExternal = GetContentType(externalFilePath);
            var fileBytesExternal = System.IO.File.ReadAllBytes(externalFilePath);

            return File(fileBytesExternal, contentTypeExternal);
        }

        private string GetContentType(string path)
        {
            var ext = Path.GetExtension(path).ToLowerInvariant();
            return ext switch
            {
                ".svg" => "image/svg+xml",
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                _ => "application/octet-stream"
            };
        }
    }
}
