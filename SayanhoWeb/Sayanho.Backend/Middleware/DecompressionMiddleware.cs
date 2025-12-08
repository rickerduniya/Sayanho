using System.IO.Compression;

namespace Sayanho.Backend.Middleware
{
    /// <summary>
    /// Middleware to automatically detect and decompress GZIP-encoded request bodies.
    /// This enables the frontend to send compressed payloads to reduce network transfer size.
    /// </summary>
    public class DecompressionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<DecompressionMiddleware> _logger;

        public DecompressionMiddleware(RequestDelegate next, ILogger<DecompressionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Check if the request body is GZIP compressed
            var contentEncoding = context.Request.Headers.ContentEncoding.ToString().ToLower();
            
            if (contentEncoding.Contains("gzip"))
            {
                _logger.LogDebug("Decompressing GZIP request body for {Path}", context.Request.Path);
                
                // Store original body reference
                var originalBody = context.Request.Body;
                
                try
                {
                    // Read the compressed data into memory
                    using var compressedStream = new MemoryStream();
                    await originalBody.CopyToAsync(compressedStream);
                    compressedStream.Position = 0;
                    
                    // Decompress the data
                    using var gzipStream = new GZipStream(compressedStream, CompressionMode.Decompress);
                    var decompressedStream = new MemoryStream();
                    await gzipStream.CopyToAsync(decompressedStream);
                    decompressedStream.Position = 0;
                    
                    _logger.LogDebug("Decompressed request: {Compressed}KB -> {Decompressed}KB", 
                        compressedStream.Length / 1024, 
                        decompressedStream.Length / 1024);
                    
                    // Replace the request body with decompressed stream
                    context.Request.Body = decompressedStream;
                    
                    // Update content type to JSON since we're decompressing binary -> JSON
                    context.Request.ContentType = "application/json";
                    context.Request.ContentLength = decompressedStream.Length;
                    
                    // Remove the Content-Encoding header since we've decompressed
                    context.Request.Headers.Remove("Content-Encoding");
                    
                    await _next(context);
                    
                    // Dispose decompressed stream after request completes
                    await decompressedStream.DisposeAsync();
                }
                catch (InvalidDataException ex)
                {
                    _logger.LogWarning(ex, "Invalid GZIP data received, treating as uncompressed");
                    // Reset and continue with original body
                    originalBody.Position = 0;
                    context.Request.Body = originalBody;
                    await _next(context);
                }
            }
            else
            {
                await _next(context);
            }
        }
    }

    /// <summary>
    /// Extension methods for adding decompression middleware
    /// </summary>
    public static class DecompressionMiddlewareExtensions
    {
        public static IApplicationBuilder UseDecompression(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<DecompressionMiddleware>();
        }
    }
}
