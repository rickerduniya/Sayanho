using System.Drawing;

namespace Sayanho.Core.Models
{
    public class CanvasSheetState
    {
        public List<CanvasItem> CanvasItems { get; set; } = new();
        public List<Connector> StoredConnectors { get; set; } = new();
        public List<List<Point>> ExistingLinePoints { get; set; } = new();
        public HashSet<string> ExistingConnections { get; set; } = new();
        public float Scale { get; set; } = 0.8f;

        public CanvasSheetState() { }
    }

    public class CanvasSheet
    {
        public string SheetId { get; set; } = Guid.NewGuid().ToString();
        public string Name { get; set; } = string.Empty;
        public List<CanvasItem> CanvasItems { get; set; } = new();
        public List<Connector> StoredConnectors { get; set; } = new();
        public List<List<Point>> ExistingLinePoints { get; set; } = new();
        public HashSet<string> ExistingConnections { get; set; } = new();
        public float Scale { get; set; } = 0.8f;
        public double ViewportX { get; set; } = 0;
        public double ViewportY { get; set; } = 0;
        
        // Undo/Redo stacks are runtime state, maybe not needed for the model if we don't persist them
        // But for now, let's omit them from the Core model to keep it simple for serialization
        // public Stack<CanvasSheetState> UndoStack { get; set; } = new();
        // public Stack<CanvasSheetState> RedoStack { get; set; } = new();

        public CanvasSheet(string name)
        {
            Name = name;
        }
        
        public CanvasSheet() { } // Parameterless constructor for serialization
    }
}
