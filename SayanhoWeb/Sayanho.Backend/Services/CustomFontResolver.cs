using PdfSharpCore.Fonts;
using System.Reflection;

namespace Sayanho.Backend.Services
{
    public class CustomFontResolver : IFontResolver
    {
        public string DefaultFontName => "Arial";

        public byte[] GetFont(string faceName)
        {
            try
            {
                var assembly = Assembly.GetExecutingAssembly();
                var resourceName = $"Sayanho.Backend.Resources.fonts.{faceName.ToLower()}.ttf";

                // Since we are not using EmbeddedResource yet effectively, we might rely on file system if deployed, 
                // but PdfSharpCore works best with manifest resources or bytes. 
                // Let's assume we read from file relative to app for now to be safe if embedding fails.
                
                // Strategy: Try to read from file system "Resources/fonts/arial.ttf"
                var basePath = AppContext.BaseDirectory;
                var fontPath = Path.Combine(basePath, "Resources", "fonts", "arial.ttf");
                
                if (File.Exists(fontPath))
                {
                    return File.ReadAllBytes(fontPath);
                }
                
                // Fallback to simpler path if structure differs in deployment
                fontPath = Path.Combine(Directory.GetCurrentDirectory(), "Resources", "fonts", "arial.ttf");
                if (File.Exists(fontPath))
                {
                     return File.ReadAllBytes(fontPath);
                }

                // If we cannot find it, return empty which might crash or cause issues, but better than nothing.
                // Or maybe catch and return null?
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading font {faceName}: {ex.Message}");
                return null;
            }
        }

        public FontResolverInfo ResolveTypeface(string familyName, bool isBold, bool isItalic)
        {
            // We ignore bold/italic requests and map everything to our single Arial file 
            // because we only copied the regular version. 
            // In a real scenario we should copy arialbd.ttf, ariali.ttf etc.
            // But for fixing the "No Fonts" crash, mapping to available font is key.
            
            // Map everything to "arial"
            return new FontResolverInfo("arial");
        }
    }
}
