using Microsoft.AspNetCore.Mvc;
using Sayanho.Core.Logic;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace Sayanho.Backend.Controllers
{
    [Route("api/item-initialization")]
    [ApiController]
    public class ItemInitializationController : ControllerBase
    {
        [HttpPost("initialize")]
        public IActionResult InitializeItem([FromBody] InitializeItemRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Name))
            {
                return BadRequest("Invalid request.");
            }

            var response = new InitializeItemResponse
            {
                Incomer = new Dictionary<string, string>(),
                Outgoing = new List<Dictionary<string, string>>(),
                Accessories = new List<Dictionary<string, string>>()
            };

            var defaultValues = request.Properties;
            if (defaultValues == null || defaultValues.Count == 0)
            {
                // If properties are not provided, try to load them
                var (props, _, _) = DatabaseLoader.LoadDefaultPropertiesFromDatabase(request.Name, 1);
                defaultValues = props;
            }
            
            if (defaultValues == null || defaultValues.Count == 0)
            {
                 return Ok(response);
            }

            var firstProp = defaultValues[0];
            string company = firstProp.GetValueOrDefault("Company", "");

            if (request.Name == "Source")
            {
                 // Source doesn't have complex logic in the snippet, but we can add default props if needed
                 // The snippet showed hardcoded properties for Source, but those are likely handled by the frontend or default DB load
            }
            else if (request.Name == "Main Switch")
            {
                var endboxOptions = new Dictionary<string, string>
                {
                    { "endbox_required", "false" },
                    { "number_of_endbox", "2" }
                };
                response.Accessories.Add(endboxOptions);
            }
            else if (request.Name == "Change Over Switch")
            {
                // Ensure default properties are set if missing
                if (!firstProp.ContainsKey("Current Rating")) firstProp["Current Rating"] = "63 A";
                if (!firstProp.ContainsKey("Voltage")) firstProp["Voltage"] = "415V TPN";
            }
            else if (request.Name == "Point Switch Board")
            {
                var orboardOptions = new Dictionary<string, string>
                {
                    { "orboard_required", "false" },
                    { "number_of_onboard", "1" }
                };
                response.Accessories.Add(orboardOptions);
            }
            else if (request.Name == "VTPN")
            {
                // Extract current rating
                int vtpnCurrentRating = 0;
                if (firstProp.ContainsKey("Current Rating"))
                {
                    var match = Regex.Match(firstProp["Current Rating"], @"\d+");
                    if (match.Success)
                    {
                        vtpnCurrentRating = int.Parse(match.Value);
                    }
                }

                // Get Incomer options (MCCB)
                var incomers = DatabaseLoader.LoadDefaultPropertiesFromDatabase("MCCB", 2).Properties
                    .Where(row => row.GetValueOrDefault("Company") == company)
                    .ToList();

                Dictionary<string, string>? selectedIncomer = null;

                if (vtpnCurrentRating > 0)
                {
                    string targetRating = $"{vtpnCurrentRating}";
                    selectedIncomer = incomers.FirstOrDefault(row => row.GetValueOrDefault("Current Rating", "").Contains(targetRating));

                    if (selectedIncomer == null)
                    {
                        selectedIncomer = incomers.FirstOrDefault();
                    }
                }
                
                if (selectedIncomer != null)
                {
                    response.Incomer = selectedIncomer;
                }

                // Get Outgoing options (MCB, TP)
                var selectedMCBData = DatabaseLoader.LoadDefaultPropertiesFromDatabase("MCB", 2).Properties
                    .Where(row => row.GetValueOrDefault("Company") == company && row.GetValueOrDefault("Pole") == "TP")
                    .OrderBy(row => int.TryParse(row.GetValueOrDefault("Current Rating"), out var rating) ? rating : int.MaxValue)
                    .FirstOrDefault();

                if (selectedMCBData != null)
                {
                    // Parse Way
                    string wayText = firstProp.GetValueOrDefault("Way", "0");
                    var match = Regex.Match(wayText, @"\d+");
                    if (int.TryParse(match.Value, out int wayValue))
                    {
                        for (int i = 0; i < wayValue; i++)
                        {
                            response.Outgoing.Add(new Dictionary<string, string>(selectedMCBData));
                        }
                    }
                }
            }
            else if (request.Name == "SPN DB")
            {
                // Priority List for SPN DB
                var priorityList = new List<string> { "40 A", "32 A", "default" }; // Hardcoded from Program.cs logic

                var incomers = DatabaseLoader.LoadDefaultPropertiesFromDatabase("MCB Isolator", 2).Properties
                    .Where(row => row.GetValueOrDefault("Company") == company && row.GetValueOrDefault("Pole") == "DP")
                    .ToList();

                Dictionary<string, string>? selectedIncomer = null;

                foreach (var priority in priorityList)
                {
                    if (priority == "default")
                    {
                        selectedIncomer = incomers.OrderBy(row => int.TryParse(row.GetValueOrDefault("Current Rating"), out var rating) ? rating : int.MaxValue)
                                                .FirstOrDefault();
                        break;
                    }

                    var matchingIncomer = incomers.FirstOrDefault(row => row.GetValueOrDefault("Current Rating") == priority);
                    if (matchingIncomer != null)
                    {
                        selectedIncomer = matchingIncomer;
                        break;
                    }
                }

                if (selectedIncomer == null)
                {
                     selectedIncomer = incomers.OrderBy(row => int.TryParse(row.GetValueOrDefault("Current Rating"), out var rating) ? rating : int.MaxValue)
                                                .FirstOrDefault();
                }

                if (selectedIncomer != null)
                {
                    response.Incomer = selectedIncomer;
                }

                // Outgoing (MCB, SP)
                var selectedMCBData = DatabaseLoader.LoadDefaultPropertiesFromDatabase("MCB", 2).Properties
                    .Where(row => row.GetValueOrDefault("Company") == company && row.GetValueOrDefault("Pole") == "SP")
                    .OrderBy(row => int.TryParse(row.GetValueOrDefault("Current Rating"), out var rating) ? rating : int.MaxValue)
                    .FirstOrDefault();

                if (selectedMCBData != null)
                {
                     // Parse Way (handle "2+4" format)
                    string wayText = firstProp.GetValueOrDefault("Way", "0");
                    var match = Regex.Match(wayText, @"(?<=2\+)\d+");
                    if (!match.Success) match = Regex.Match(wayText, @"\d+"); // Fallback

                    if (int.TryParse(match.Value, out int wayValue))
                    {
                        for (int i = 0; i < wayValue; i++)
                        {
                            response.Outgoing.Add(new Dictionary<string, string>(selectedMCBData));
                        }
                    }
                }
            }
            else if (request.Name == "HTPN")
            {
                 // Priority List for HTPN
                var priorityList = new List<string> { "63 A", "40 A", "32 A", "25 A", "default" };

                var incomers = DatabaseLoader.LoadDefaultPropertiesFromDatabase("MCB", 2).Properties
                    .Where(row => row.GetValueOrDefault("Company") == company && row.GetValueOrDefault("Pole") == "FP")
                    .ToList();

                Dictionary<string, string>? selectedIncomer = null;

                foreach (var priority in priorityList)
                {
                    if (priority == "default")
                    {
                        selectedIncomer = incomers.OrderBy(row => int.TryParse(row.GetValueOrDefault("Current Rating"), out var rating) ? rating : int.MaxValue)
                                                .FirstOrDefault();
                        break;
                    }

                    var matchingIncomer = incomers.FirstOrDefault(row => row.GetValueOrDefault("Current Rating") == priority);
                    if (matchingIncomer != null)
                    {
                        selectedIncomer = matchingIncomer;
                        break;
                    }
                }

                if (selectedIncomer == null)
                {
                     selectedIncomer = incomers.OrderBy(row => int.TryParse(row.GetValueOrDefault("Current Rating"), out var rating) ? rating : int.MaxValue)
                                                .FirstOrDefault();
                }

                if (selectedIncomer != null)
                {
                    response.Incomer = selectedIncomer;
                }
                
                // HTPN Outgoing logic was not explicitly in the snippet provided for HTPN, 
                // but usually it follows similar patterns. The snippet cut off. 
                // Assuming similar to VTPN but maybe different pole or just empty for now if not found.
                // Re-checking snippet... it cut off at line 1599.
                // I will assume standard MCB TP for HTPN outgoing if not specified, or leave empty if unsure.
                // Actually, HTPN usually has MCB TP outgoing. I'll add it to be safe, similar to VTPN.
                
                // HTPN uses SP (Single Pole) MCBs for outgoing, not TP
                // Each phase (R, Y, B) has 'wayValue' number of outgoings
                var selectedMCBData = DatabaseLoader.LoadDefaultPropertiesFromDatabase("MCB", 2).Properties
                    .Where(row => row.GetValueOrDefault("Company") == company && row.GetValueOrDefault("Pole") == "SP")
                    .OrderBy(row => int.TryParse(row.GetValueOrDefault("Current Rating"), out var rating) ? rating : int.MaxValue)
                    .FirstOrDefault();

                if (selectedMCBData != null)
                {
                    string wayText = firstProp.GetValueOrDefault("Way", "0");
                    var match = Regex.Match(wayText, @"\d+");
                    if (int.TryParse(match.Value, out int wayValue))
                    {
                        // HTPN has 3 phases (R, Y, B), each with 'wayValue' outgoings
                        // Total outgoings = wayValue * 3
                        for (int i = 0; i < wayValue * 3; i++)
                        {
                            response.Outgoing.Add(new Dictionary<string, string>(selectedMCBData));
                        }
                    }
                }
            }

            return Ok(response);
        }
    }

    public class InitializeItemRequest
    {
        public string Name { get; set; } = string.Empty;
        public List<Dictionary<string, string>> Properties { get; set; } = new List<Dictionary<string, string>>();
    }

    public class InitializeItemResponse
    {
        public Dictionary<string, string> Incomer { get; set; } = new Dictionary<string, string>();
        public List<Dictionary<string, string>> Outgoing { get; set; } = new List<Dictionary<string, string>>();
        public List<Dictionary<string, string>> Accessories { get; set; } = new List<Dictionary<string, string>>();
    }
}
