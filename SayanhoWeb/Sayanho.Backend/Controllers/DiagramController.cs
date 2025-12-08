using Microsoft.AspNetCore.Mvc;
using Sayanho.Core.Models;
using System.Text.Json;

namespace Sayanho.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DiagramController : ControllerBase
    {
        private readonly string _dataDirectory;

        public DiagramController(IWebHostEnvironment env)
        {
            _dataDirectory = Path.Combine(env.ContentRootPath, "Data", "Diagrams");
            if (!Directory.Exists(_dataDirectory))
            {
                Directory.CreateDirectory(_dataDirectory);
            }
        }

        [HttpGet]
        public IActionResult GetAllDiagrams()
        {
            var files = Directory.GetFiles(_dataDirectory, "*.json");
            var diagrams = files.Select(f => 
            {
                try
                {
                    var json = System.IO.File.ReadAllText(f);
                    var project = JsonSerializer.Deserialize<ProjectData>(json);
                    return new { Id = project?.ProjectId, Name = project?.Name };
                }
                catch
                {
                    // Fallback for legacy files
                    return new { Id = Path.GetFileNameWithoutExtension(f), Name = "Legacy Diagram" };
                }
            });
            return Ok(diagrams);
        }

        [HttpGet("{id}")]
        public IActionResult GetDiagram(string id)
        {
            var filePath = Path.Combine(_dataDirectory, $"{id}.json");
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound();
            }

            var json = System.IO.File.ReadAllText(filePath);
            try 
            {
                var project = JsonSerializer.Deserialize<ProjectData>(json);
                return Ok(project);
            }
            catch
            {
                // Fallback for legacy single-sheet files
                var sheet = JsonSerializer.Deserialize<CanvasSheet>(json);
                return Ok(new ProjectData 
                { 
                    ProjectId = sheet.SheetId, 
                    Name = sheet.Name, 
                    CanvasSheets = new List<CanvasSheet> { sheet } 
                });
            }
        }

        [HttpPost]
        public IActionResult SaveDiagram([FromBody] ProjectData projectData)
        {
            // Generate a unique ID if not provided
            if (string.IsNullOrEmpty(projectData.ProjectId))
            {
                projectData.ProjectId = Guid.NewGuid().ToString();
            }

            var filePath = Path.Combine(_dataDirectory, $"{projectData.ProjectId}.json");
            var json = JsonSerializer.Serialize(projectData, new JsonSerializerOptions { WriteIndented = true });
            System.IO.File.WriteAllText(filePath, json);

            return Ok(new { ProjectId = projectData.ProjectId });
        }

        [HttpDelete("{id}")]
        public IActionResult DeleteDiagram(string id)
        {
            var filePath = Path.Combine(_dataDirectory, $"{id}.json");
            if (!System.IO.File.Exists(filePath))
            {
                return NotFound();
            }

            System.IO.File.Delete(filePath);
            return Ok(new { Message = "Project deleted successfully" });
        }
    }
}
