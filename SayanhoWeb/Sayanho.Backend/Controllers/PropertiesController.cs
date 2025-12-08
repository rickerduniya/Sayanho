using Microsoft.AspNetCore.Mvc;
using Sayanho.Core.Logic;
using System.Collections.Generic;

namespace Sayanho.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PropertiesController : ControllerBase
    {
        [HttpGet("{itemName}")]
        public IActionResult GetProperties(string itemName)
        {
            // Condition 2 returns all properties (rows)
            var (properties, _, _) = DatabaseLoader.LoadDefaultPropertiesFromDatabase(itemName, 2);
            
            // Condition 1 returns alternative companies
            var (_, alt1, alt2) = DatabaseLoader.LoadDefaultPropertiesFromDatabase(itemName, 1);

            // Load Laying properties
            var (layingProperties, _, _) = DatabaseLoader.LoadDefaultPropertiesFromDatabase("Laying", 1);

            return Ok(new PropertyResponse 
            { 
                Properties = properties, 
                AlternativeCompany1 = alt1, 
                AlternativeCompany2 = alt2,
                Laying = layingProperties.Count > 0 ? layingProperties[0] : null
            });
        }
    }

    public class PropertyResponse
    {
        public List<Dictionary<string, string>> Properties { get; set; }
        public string AlternativeCompany1 { get; set; }
        public string AlternativeCompany2 { get; set; }
        public Dictionary<string, string> Laying { get; set; }
    }
}
