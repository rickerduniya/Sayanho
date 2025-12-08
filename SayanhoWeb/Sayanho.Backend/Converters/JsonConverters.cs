using System.Drawing;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Sayanho.Backend.Converters
{
    public class PointJsonConverter : JsonConverter<Point>
    {
        public override Point Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.StartObject)
            {
                throw new JsonException("Expected StartObject token");
            }

            int x = 0, y = 0;

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndObject)
                {
                    return new Point(x, y);
                }

                if (reader.TokenType == JsonTokenType.PropertyName)
                {
                    string propertyName = reader.GetString() ?? "";
                    reader.Read();

                    switch (propertyName.ToLowerInvariant())
                    {
                        case "x":
                            // Handle both int and double
                            if (reader.TokenType == JsonTokenType.Number)
                            {
                                if (reader.TryGetInt32(out int xInt))
                                {
                                    x = xInt;
                                }
                                else if (reader.TryGetDouble(out double xDouble))
                                {
                                    x = (int)Math.Round(xDouble);
                                }
                            }
                            break;
                        case "y":
                            // Handle both int and double
                            if (reader.TokenType == JsonTokenType.Number)
                            {
                                if (reader.TryGetInt32(out int yInt))
                                {
                                    y = yInt;
                                }
                                else if (reader.TryGetDouble(out double yDouble))
                                {
                                    y = (int)Math.Round(yDouble);
                                }
                            }
                            break;
                        case "isempty":
                            // Skip isEmpty property if present
                            if (reader.TokenType == JsonTokenType.True || reader.TokenType == JsonTokenType.False)
                            {
                                reader.GetBoolean();
                            }
                            break;
                    }
                }
            }

            throw new JsonException("Unexpected end of JSON");
        }


        public override void Write(Utf8JsonWriter writer, Point value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();
            writer.WriteBoolean("isEmpty", value.IsEmpty);
            writer.WriteNumber("x", value.X);
            writer.WriteNumber("y", value.Y);
            writer.WriteEndObject();
        }
    }

    public class SizeJsonConverter : JsonConverter<Size>
    {
        public override Size Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType != JsonTokenType.StartObject)
            {
                throw new JsonException("Expected StartObject token");
            }

            int width = 0, height = 0;

            while (reader.Read())
            {
                if (reader.TokenType == JsonTokenType.EndObject)
                {
                    return new Size(width, height);
                }

                if (reader.TokenType == JsonTokenType.PropertyName)
                {
                    string propertyName = reader.GetString() ?? "";
                    reader.Read();

                    switch (propertyName.ToLowerInvariant())
                    {
                        case "width":
                            // Handle both int and double
                            if (reader.TokenType == JsonTokenType.Number)
                            {
                                if (reader.TryGetInt32(out int wInt))
                                {
                                    width = wInt;
                                }
                                else if (reader.TryGetDouble(out double wDouble))
                                {
                                    width = (int)Math.Round(wDouble);
                                }
                            }
                            break;
                        case "height":
                            // Handle both int and double
                            if (reader.TokenType == JsonTokenType.Number)
                            {
                                if (reader.TryGetInt32(out int hInt))
                                {
                                    height = hInt;
                                }
                                else if (reader.TryGetDouble(out double hDouble))
                                {
                                    height = (int)Math.Round(hDouble);
                                }
                            }
                            break;
                        case "isempty":
                            // Skip isEmpty property
                            if (reader.TokenType == JsonTokenType.True || reader.TokenType == JsonTokenType.False)
                            {
                                reader.GetBoolean();
                            }
                            break;
                    }
                }
            }

            throw new JsonException("Unexpected end of JSON");
        }

        public override void Write(Utf8JsonWriter writer, Size value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();
            writer.WriteBoolean("isEmpty", value.IsEmpty);
            writer.WriteNumber("width", value.Width);
            writer.WriteNumber("height", value.Height);
            writer.WriteEndObject();
        }
    }
}
