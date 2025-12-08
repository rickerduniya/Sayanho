using System.Drawing;

namespace Sayanho.Core.Models
{
    public class Connector
    {
        public CanvasItem? SourceItem { get; set; }
        public string SourcePointKey { get; set; }
        public CanvasItem? TargetItem { get; set; }
        public string TargetPointKey { get; set; }
        
        // Item IDs for reconstructing references after JSON deserialization
        public string SourceItemId { get; set; } = string.Empty;
        public string TargetItemId { get; set; } = string.Empty;
        
        public Dictionary<string, string> Properties { get; set; } = new();
        public Dictionary<string, string> CurrentValues { get; set; } = new()
        {
            {"Current","0 A"},
            {"R_Current","0 A"},
            {"Y_Current","0 A"},
            {"B_Current","0 A"},
            {"Phase","0 A"}
        };
        
        public string AlternativeCompany1 { get; set; } = string.Empty;
        public string AlternativeCompany2 { get; set; } = string.Empty;
        public Dictionary<string, string>? Laying { get; set; }
        public List<Dictionary<string, string>> Accessories { get; set; } = new();
        
        public float Length { get; set; } = 0.0f;
        public string MaterialType { get; set; } = "Cable";
        
        public bool IsVirtual => Properties != null && Properties.ContainsKey("IsVirtual") && Properties["IsVirtual"] == "True";

        public Connector(CanvasItem? sourceItem, string sourcePointKey, CanvasItem? targetItem, string targetPointKey)
        {
            SourceItem = sourceItem;
            SourcePointKey = sourcePointKey;
            TargetItem = targetItem;
            TargetPointKey = targetPointKey;
        }
    }
}
