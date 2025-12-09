using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using Sayanho.Core.Models;
using System;
using System.IO;

namespace Sayanho.Backend.Services
{
    public class ReportService
    {
        public byte[] GenerateCumulativeVDReport(CumulativeReportData data)
        {
            using (var stream = new MemoryStream())
            {
                var document = new PdfDocument();
                var page = document.AddPage();
                var gfx = XGraphics.FromPdfPage(page);
                // Use a standard font likely to be available or mapped
                var font = new XFont("Arial", 10, XFontStyle.Regular);
                var boldFont = new XFont("Arial", 10, XFontStyle.Bold);
                var titleFont = new XFont("Arial", 16, XFontStyle.Bold);

                double y = 40;
                double margin = 40;
                double pageWidth = page.Width - 2 * margin;

                // Title
                gfx.DrawString("Cumulative Voltage Drop Report", titleFont, XBrushes.Black, new XRect(margin, y, pageWidth, 0), XStringFormats.TopCenter);
                y += 30;

                // Summary
                gfx.DrawString($"Generated: {DateTime.Now:yyyy-MM-dd HH:mm}", font, XBrushes.Gray, margin, y);
                y += 20;
                gfx.DrawString($"Max Allowed Voltage Drop: {data.MaxAllowedPercent}%", font, XBrushes.Black, margin, y);
                y += 15;
                gfx.DrawString($"Total Paths: {data.TotalPaths}", font, XBrushes.Black, margin, y);
                y += 15;
                gfx.DrawString($"Compliant Paths: {data.CompliantPaths}", font, XBrushes.Green, margin, y);
                y += 15;
                gfx.DrawString($"Non-Compliant Paths: {data.NonCompliantPaths}", font, data.NonCompliantPaths > 0 ? XBrushes.Red : XBrushes.Black, margin, y);
                y += 30;

                // Details
                foreach (var load in data.Loads)
                {
                    // Check page break
                    if (y > page.Height - margin - 50)
                    {
                        page = document.AddPage();
                        gfx = XGraphics.FromPdfPage(page);
                        y = margin;
                    }

                    gfx.DrawString($"LOAD: {load.LoadName} (Power: {load.Power})", boldFont, XBrushes.Black, margin, y);
                    y += 15;

                    foreach (var path in load.Paths)
                    {
                        if (y > page.Height - margin - 50)
                        {
                            page = document.AddPage();
                            gfx = XGraphics.FromPdfPage(page);
                            y = margin;
                        }

                        gfx.DrawString($"Path from {path.SourceName}:", font, XBrushes.Black, margin + 10, y);
                        y += 15;

                        foreach (var segment in path.Segments)
                        {
                            if (y > page.Height - margin)
                            {
                                page = document.AddPage();
                                gfx = XGraphics.FromPdfPage(page);
                                y = margin;
                            }
                            
                            string text = $"{segment.Name} | Size: {segment.Size} | Len: {segment.Length:F1}m | VD: {segment.SegmentVD:F3}V | Cum: {segment.CumulativeVD:F3}V ({segment.CumulativeVDPercent:F2}%)";
                            gfx.DrawString(text, font, XBrushes.Black, margin + 20, y);
                            y += 12;
                        }

                        y += 5;
                        string status = path.IsCompliant ? "COMPLIANT" : "EXCEEDS LIMIT";
                        XBrush statusBrush = path.IsCompliant ? XBrushes.Green : XBrushes.Red;
                        gfx.DrawString($"Total VD: {path.TotalVD:F3}V ({path.TotalVDPercent:F2}%) - {status}", boldFont, statusBrush, margin + 20, y);
                        y += 20;
                    }
                    y += 10;
                }

                // Auto-Rating Process Log
                if (data.ProcessLogs != null && data.ProcessLogs.Any())
                {
                    y += 20;
                    // Check page break
                    if (y > page.Height - margin - 50)
                    {
                        page = document.AddPage();
                        gfx = XGraphics.FromPdfPage(page);
                        y = margin;
                    }

                    gfx.DrawString("Auto-Rating Process Log", boldFont, XBrushes.Black, margin, y);
                    y += 20;

                    var logFont = new XFont("Courier New", 8, XFontStyle.Regular);
                    var logBoldFont = new XFont("Courier New", 8, XFontStyle.Bold);

                    foreach (var log in data.ProcessLogs)
                    {
                        if (y > page.Height - margin)
                        {
                            page = document.AddPage();
                            gfx = XGraphics.FromPdfPage(page);
                            y = margin;
                        }

                        XBrush brush = XBrushes.DarkGray;
                        XFont currentFont = logFont;

                        if (log.StartsWith("Step") || log.StartsWith("---") || log.StartsWith("Auto-rating complete"))
                        {
                            brush = XBrushes.Black;
                            currentFont = logBoldFont;
                        }
                        else if (log.Contains("Upsized") || log.Contains("Rated for"))
                        {
                            brush = XBrushes.DarkGreen;
                        }
                        else if (log.Contains("Cannot upsize") || log.Contains("Failed") || log.Contains("Warning") || log.Contains("Error"))
                        {
                            brush = XBrushes.DarkRed;
                        }
                        else if (log.Contains("compliant!"))
                        {
                            brush = XBrushes.Green;
                            currentFont = logBoldFont;
                        }

                        gfx.DrawString(log, currentFont, brush, margin, y);
                        y += 10;
                    }
                }

                document.Save(stream, false);
                return stream.ToArray();
            }
        }
    }
}
