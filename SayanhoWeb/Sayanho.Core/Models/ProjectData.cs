using Sayanho.Core.Models;

namespace Sayanho.Core.Models
{
    public class ProjectData
    {
        public string ProjectId { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = "New Project";
        public List<CanvasSheet> CanvasSheets { get; set; } = new();
    }
}
