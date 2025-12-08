using System.Text.Json;
using System.Text.Json.Serialization;
using Sayanho.Core.Models;

namespace Sayanho.Backend.Converters
{
    public class ConnectorJsonConverter : JsonConverter<Connector>
    {
        public override Connector Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            using (JsonDocument doc = JsonDocument.ParseValue(ref reader))
            {
                var root = doc.RootElement;
                
                var connector = new Connector(null, "", null, "");
                
                // First, check if sourceItemId/targetItemId are provided directly (optimized payload)
                if (root.TryGetProperty("sourceItemId", out var sourceIdProp) && sourceIdProp.ValueKind == JsonValueKind.String)
                {
                    connector.SourceItemId = sourceIdProp.GetString() ?? "";
                }
                // Otherwise, extract from sourceItem.uniqueID (full payload)
                else if (root.TryGetProperty("sourceItem", out var sourceItemElement) && sourceItemElement.ValueKind == JsonValueKind.Object)
                {
                    if (sourceItemElement.TryGetProperty("uniqueID", out var sourceIdElement))
                    {
                        connector.SourceItemId = sourceIdElement.GetString() ?? "";
                    }
                }
                
                // First, check if targetItemId is provided directly (optimized payload)
                if (root.TryGetProperty("targetItemId", out var targetIdProp) && targetIdProp.ValueKind == JsonValueKind.String)
                {
                    connector.TargetItemId = targetIdProp.GetString() ?? "";
                }
                // Otherwise, extract from targetItem.uniqueID (full payload)
                else if (root.TryGetProperty("targetItem", out var targetItemElement) && targetItemElement.ValueKind == JsonValueKind.Object)
                {
                    if (targetItemElement.TryGetProperty("uniqueID", out var targetIdElement))
                    {
                        connector.TargetItemId = targetIdElement.GetString() ?? "";
                    }
                }
                
                // Deserialize other properties normally
                if (root.TryGetProperty("sourcePointKey", out var sourcePointKeyElement))
                {
                    connector.SourcePointKey = sourcePointKeyElement.GetString() ?? "";
                }
                
                if (root.TryGetProperty("targetPointKey", out var targetPointKeyElement))
                {
                    connector.TargetPointKey = targetPointKeyElement.GetString() ?? "";
                }
                
                if (root.TryGetProperty("length", out var lengthElement))
                {
                    connector.Length = lengthElement.GetSingle();
                }
                
                if (root.TryGetProperty("materialType", out var materialTypeElement))
                {
                    connector.MaterialType = materialTypeElement.GetString() ?? "Cable";
                }
                
                // Deserialize Properties dictionary
                if (root.TryGetProperty("properties", out var propertiesElement) && propertiesElement.ValueKind == JsonValueKind.Object)
                {
                    connector.Properties = JsonSerializer.Deserialize<Dictionary<string, string>>(propertiesElement.GetRawText(), options) ?? new();
                }
                
                // Deserialize CurrentValues dictionary
                if (root.TryGetProperty("currentValues", out var currentValuesElement) && currentValuesElement.ValueKind == JsonValueKind.Object)
                {
                    connector.CurrentValues = JsonSerializer.Deserialize<Dictionary<string, string>>(currentValuesElement.GetRawText(), options) ?? new();
                }

                // Deserialize Laying dictionary
                if (root.TryGetProperty("laying", out var layingElement) && layingElement.ValueKind == JsonValueKind.Object)
                {
                    connector.Laying = JsonSerializer.Deserialize<Dictionary<string, string>>(layingElement.GetRawText(), options);
                }

                // Deserialize Accessories list
                if (root.TryGetProperty("accessories", out var accessoriesElement) && accessoriesElement.ValueKind == JsonValueKind.Array)
                {
                    connector.Accessories = JsonSerializer.Deserialize<List<Dictionary<string, string>>>(accessoriesElement.GetRawText(), options) ?? new();
                }

                // Deserialize AlternativeCompany1
                if (root.TryGetProperty("alternativeCompany1", out var altComp1Element))
                {
                    connector.AlternativeCompany1 = altComp1Element.GetString() ?? "";
                }

                // Deserialize AlternativeCompany2
                if (root.TryGetProperty("alternativeCompany2", out var altComp2Element))
                {
                    connector.AlternativeCompany2 = altComp2Element.GetString() ?? "";
                }
                
                return connector;
            }
        }

        public override void Write(Utf8JsonWriter writer, Connector value, JsonSerializerOptions options)
        {
            // Use default serialization for writing
            writer.WriteStartObject();
            
            // Write primitive properties
            writer.WriteString("sourcePointKey", value.SourcePointKey);
            writer.WriteString("targetPointKey", value.TargetPointKey);
            writer.WriteString("sourceItemId", value.SourceItemId);
            writer.WriteString("targetItemId", value.TargetItemId);
            writer.WriteNumber("length", value.Length);
            writer.WriteString("materialType", value.MaterialType);
            writer.WriteString("alternativeCompany1", value.AlternativeCompany1);
            writer.WriteString("alternativeCompany2", value.AlternativeCompany2);
            
            // Write dictionaries
            writer.WritePropertyName("properties");
            JsonSerializer.Serialize(writer, value.Properties, options);
            
            writer.WritePropertyName("currentValues");
            JsonSerializer.Serialize(writer, value.CurrentValues, options);

            if (value.Laying != null)
            {
                writer.WritePropertyName("laying");
                JsonSerializer.Serialize(writer, value.Laying, options);
            }

            if (value.Accessories != null && value.Accessories.Count > 0)
            {
                writer.WritePropertyName("accessories");
                JsonSerializer.Serialize(writer, value.Accessories, options);
            }
            
            // Serialize SourceItem and TargetItem
            // We use the options passed in, which should have ReferenceHandler.IgnoreCycles enabled
            writer.WritePropertyName("sourceItem");
            JsonSerializer.Serialize(writer, value.SourceItem, options);

            writer.WritePropertyName("targetItem");
            JsonSerializer.Serialize(writer, value.TargetItem, options);
            
            writer.WriteEndObject();
        }
    }
}
