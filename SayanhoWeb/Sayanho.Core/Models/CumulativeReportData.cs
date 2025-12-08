using System.Collections.Generic;

namespace Sayanho.Core.Models
{
    public class CumulativeReportData
    {
        public double MaxAllowedPercent { get; set; }
        public List<LoadReportData> Loads { get; set; } = new List<LoadReportData>();
        public int TotalPaths { get; set; }
        public int CompliantPaths { get; set; }
        public int NonCompliantPaths { get; set; }
        public List<string> ProcessLogs { get; set; } = new List<string>();
    }

    public class LoadReportData
    {
        public string LoadName { get; set; }
        public string Power { get; set; }
        public List<PathReportData> Paths { get; set; } = new List<PathReportData>();
    }

    public class PathReportData
    {
        public string SourceName { get; set; }
        public double SupplyVoltage { get; set; }
        public List<SegmentReportData> Segments { get; set; } = new List<SegmentReportData>();
        public double TotalVD { get; set; }
        public double TotalVDPercent { get; set; }
        public bool IsCompliant { get; set; }
    }

    public class SegmentReportData
    {
        public string Name { get; set; }
        public string Size { get; set; }
        public double Length { get; set; }
        public double Current { get; set; }
        public double SegmentVD { get; set; }
        public double CumulativeVD { get; set; }
        public double CumulativeVDPercent { get; set; }
    }
}
