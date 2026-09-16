using System.Text;
using Microsoft.AspNetCore.Mvc;

namespace Sayanho.Backend.Controllers
{
    /// <summary>
    /// Relays LLM requests that browsers cannot send directly.
    ///
    /// Z.ai answers CORS preflights for GET /models but NOT for
    /// POST /chat/completions, so a browser-direct chat call is blocked by the
    /// browser ("Network Error") while "Fetch available models" works from the
    /// frontend. This endpoint relays the call server-to-server, where CORS
    /// does not apply.
    ///
    /// Privacy: the provider key arrives in the X-Zai-Api-Key header and is
    /// used only to build the upstream Authorization header. It is never
    /// stored, never logged, and never sent anywhere except api.z.ai. The
    /// target host is allow-listed so this cannot be abused as an open proxy.
    /// </summary>
    [ApiController]
    [Route("api/aiproxy")]
    public class AiProxyController : ControllerBase
    {
        private const string ZaiKeyHeader = "X-Zai-Api-Key";
        private const string DefaultZaiBaseUrl = "https://api.z.ai/api/paas/v4";

        private static readonly HashSet<string> AllowedZaiHosts =
            new(StringComparer.OrdinalIgnoreCase) { "api.z.ai" };

        private readonly IHttpClientFactory _httpClientFactory;

        public AiProxyController(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        [HttpPost("zai/chat/completions")]
        public async Task<IActionResult> ZaiChatCompletions(
            [FromQuery] string? baseUrl,
            CancellationToken cancellationToken)
        {
            var apiKey = Request.Headers[ZaiKeyHeader].ToString()?.Trim();
            if (string.IsNullOrEmpty(apiKey))
            {
                return BadRequest(new { error = $"Missing {ZaiKeyHeader} header." });
            }

            string target;
            try
            {
                target = BuildZaiChatUrl(baseUrl);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { error = ex.Message });
            }

            // Read as raw text (no model binding): the bytes are forwarded
            // verbatim and nothing about the request is logged.
            string body;
            using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
            {
                body = await reader.ReadToEndAsync();
            }
            if (string.IsNullOrWhiteSpace(body))
            {
                return BadRequest(new { error = "Empty request body." });
            }

            var client = _httpClientFactory.CreateClient("zai-proxy");
            using var upstream = new HttpRequestMessage(HttpMethod.Post, target)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
            upstream.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
            upstream.Headers.TryAddWithoutValidation("Accept-Language", "en-US,en");

            HttpResponseMessage upstreamResponse;
            try
            {
                upstreamResponse = await client.SendAsync(
                    upstream, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            }
            catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
            {
                return StatusCode(
                    StatusCodes.Status504GatewayTimeout,
                    new { error = "Timed out waiting for the Z.ai API." });
            }
            catch (HttpRequestException ex)
            {
                return StatusCode(
                    StatusCodes.Status502BadGateway,
                    new { error = $"Could not reach the Z.ai API: {ex.Message}" });
            }

            // Pass the upstream status and body through verbatim so the
            // frontend surfaces Z.ai's own errors (invalid key, unknown model…).
            var upstreamBody = await upstreamResponse.Content.ReadAsStringAsync(cancellationToken);
            return new ContentResult
            {
                StatusCode = (int)upstreamResponse.StatusCode,
                Content = upstreamBody,
                ContentType = "application/json"
            };
        }

        private static string BuildZaiChatUrl(string? baseUrl)
        {
            var raw = string.IsNullOrWhiteSpace(baseUrl) ? DefaultZaiBaseUrl : baseUrl.Trim();
            if (!Uri.TryCreate(raw, UriKind.Absolute, out var uri)
                || uri.Scheme != Uri.UriSchemeHttps)
            {
                throw new ArgumentException("Invalid Z.ai base URL (https required).");
            }
            if (!AllowedZaiHosts.Contains(uri.Host))
            {
                throw new ArgumentException("Z.ai base URL host is not allowed.");
            }
            var path = uri.GetLeftPart(UriPartial.Path).TrimEnd('/');
            const string suffix = "/chat/completions";
            if (path.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
            {
                path = path[..^suffix.Length].TrimEnd('/');
            }
            return path + suffix;
        }
    }
}
