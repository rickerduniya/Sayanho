using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Data.Sqlite;

namespace Sayanho.Core.Logic
{
    /// <summary>
    /// Handles voltage drop calculations for cables and wires based on conductor material, size, and current.
    /// Loads voltage drop data from database:
    /// - Table "25" = Aluminium voltage drop data
    /// - Table "26" = Copper voltage drop data
    /// </summary>
    public class VoltageDropCalculator
    {
        // Cached voltage drop tables loaded from database
        private static Dictionary<double, double>? _copperWireVoltageDropTable;
        private static Dictionary<double, double>? _copperCableTwinCoreVoltageDropTable;
        private static Dictionary<double, double>? _copperCableMultiCoreVoltageDropTable;
        private static Dictionary<double, double>? _aluminiumWireVoltageDropTable;
        private static Dictionary<double, double>? _aluminiumCableTwinCoreVoltageDropTable;
        private static Dictionary<double, double>? _aluminiumCableMultiCoreVoltageDropTable;

        private static bool _tablesLoaded = false;
        private static readonly object _loadLock = new object();

        #region Database Loading

        /// <summary>
        /// Load voltage drop tables from database if not already loaded
        /// </summary>
        private static void EnsureTablesLoaded()
        {
            if (_tablesLoaded) return;

            lock (_loadLock)
            {
                if (_tablesLoaded) return;

                try
                {
                    LoadVoltageDropTablesFromDatabase();
                    _tablesLoaded = true;
                    Console.WriteLine("Voltage drop tables loaded successfully from database.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error loading voltage drop tables from database: {ex.Message}");
                    // Initialize empty tables to prevent repeated loading attempts
                    InitializeEmptyTables();
                    _tablesLoaded = true;
                }
            }
        }

        /// <summary>
        /// Load voltage drop data from the database
        /// </summary>
        private static void LoadVoltageDropTablesFromDatabase()
        {
            using var conn = DatabaseLoader.OpenConnection();

            // Load Aluminium data from table "25"
            var aluminiumData = LoadVoltageDropTable(conn, "25");
            _aluminiumWireVoltageDropTable = aluminiumData.singleCore;
            _aluminiumCableTwinCoreVoltageDropTable = aluminiumData.twinCore;
            _aluminiumCableMultiCoreVoltageDropTable = aluminiumData.multiCore;

            // Load Copper data from table "26"
            var copperData = LoadVoltageDropTable(conn, "26");
            _copperWireVoltageDropTable = copperData.singleCore;
            _copperCableTwinCoreVoltageDropTable = copperData.twinCore;
            _copperCableMultiCoreVoltageDropTable = copperData.multiCore;

            Console.WriteLine($"Loaded Aluminium voltage drop data: {_aluminiumCableTwinCoreVoltageDropTable?.Count ?? 0} sizes (1-phase), {_aluminiumCableMultiCoreVoltageDropTable?.Count ?? 0} sizes (3-phase)");
            Console.WriteLine($"Loaded Copper voltage drop data: {_copperCableTwinCoreVoltageDropTable?.Count ?? 0} sizes (1-phase), {_copperCableMultiCoreVoltageDropTable?.Count ?? 0} sizes (3-phase)");
        }

        /// <summary>
        /// Load voltage drop table from a specific database table
        /// </summary>
        private static (Dictionary<double, double> singleCore, Dictionary<double, double> twinCore, Dictionary<double, double> multiCore) 
            LoadVoltageDropTable(SqliteConnection conn, string tableName)
        {
            var singleCore = new Dictionary<double, double>();
            var twinCore = new Dictionary<double, double>();
            var multiCore = new Dictionary<double, double>();

            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = $"SELECT * FROM \"{tableName}\"";
                using var reader = cmd.ExecuteReader();

                // Find column indices for mV/A/m values
                int sizeColIdx = -1;
                int singleCoreColIdx = -1;
                int twinCoreColIdx = -1;
                int multiCoreColIdx = -1;
                int genericInAirColIdx = -1; // For simplified structure with single mV/A/m column

                // Log all column names for debugging
                var allColumns = Enumerable.Range(0, reader.FieldCount).Select(i => reader.GetName(i)).ToList();
                Console.WriteLine($"Table {tableName} all columns: [{string.Join("], [", allColumns)}]");

                for (int i = 0; i < reader.FieldCount; i++)
                {
                    string colName = reader.GetName(i);
                    
                    // Try to find Size column
                    if (colName.Contains("Size", StringComparison.OrdinalIgnoreCase))
                    {
                        sizeColIdx = i;
                    }
                    // Try multiple patterns for 1-phase (single core / twin core)
                    else if (colName.Contains("1 Phase", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("1-Phase", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("1Phase", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("Single Phase", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("Twin Core", StringComparison.OrdinalIgnoreCase))
                    {
                        twinCoreColIdx = i; // Use for single-phase calculations
                    }
                    // Try multiple patterns for 3-phase (3/4 core)
                    else if (colName.Contains("3 Phase", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("3-Phase", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("3Phase", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("Three Phase", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("3/3.5/4 Core", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("3 Core", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("Multi Core", StringComparison.OrdinalIgnoreCase))
                    {
                        multiCoreColIdx = i; // Use for 3-phase calculations
                    }
                    // Generic "In Air" column without specific phase/core type
                    // This handles simplified structure with just one mV/A/m column
                    else if (colName.Contains("In Air", StringComparison.OrdinalIgnoreCase) ||
                             colName.Contains("mV/A/m", StringComparison.OrdinalIgnoreCase))
                    {
                        // Check if it specifies a core type
                        if (colName.Contains("Single Core", StringComparison.OrdinalIgnoreCase))
                        {
                            singleCoreColIdx = i;
                        }
                        else if (colName.Contains("Twin Core", StringComparison.OrdinalIgnoreCase))
                        {
                            twinCoreColIdx = i;
                        }
                        else if (colName.Contains("3 Core", StringComparison.OrdinalIgnoreCase) ||
                                 colName.Contains("Multi", StringComparison.OrdinalIgnoreCase))
                        {
                            multiCoreColIdx = i;
                        }
                        else
                        {
                            // Generic In Air column - use for both 1-phase and 3-phase
                            genericInAirColIdx = i;
                        }
                    }
                }

                // If we found a generic "In Air" column but no specific columns,
                // use the generic column for both twin core (1-phase) and multi core (3-phase)
                if (genericInAirColIdx >= 0)
                {
                    if (twinCoreColIdx < 0)
                    {
                        twinCoreColIdx = genericInAirColIdx;
                    }
                    if (multiCoreColIdx < 0)
                    {
                        multiCoreColIdx = genericInAirColIdx;
                    }
                }

                if (sizeColIdx == -1)
                {
                    Console.WriteLine($"Warning: Could not find Size column in table {tableName}");
                    return (singleCore, twinCore, multiCore);
                }

                Console.WriteLine($"Table {tableName} detected: Size={sizeColIdx}, SingleCore={singleCoreColIdx}, TwinCore={twinCoreColIdx}, MultiCore={multiCoreColIdx}, GenericInAir={genericInAirColIdx}");

                // Read all rows
                while (reader.Read())
                {
                    string? sizeStr = reader[sizeColIdx]?.ToString();
                    if (string.IsNullOrWhiteSpace(sizeStr)) continue;

                    if (!double.TryParse(sizeStr, out double size)) continue;

                    // Parse and store voltage drop values for each core type
                    if (singleCoreColIdx >= 0)
                    {
                        string? valueStr = reader[singleCoreColIdx]?.ToString();
                        if (double.TryParse(valueStr, out double value))
                        {
                            singleCore[size] = value;
                        }
                    }

                    if (twinCoreColIdx >= 0)
                    {
                        string? valueStr = reader[twinCoreColIdx]?.ToString();
                        if (double.TryParse(valueStr, out double value))
                        {
                            twinCore[size] = value;
                        }
                    }

                    if (multiCoreColIdx >= 0)
                    {
                        string? valueStr = reader[multiCoreColIdx]?.ToString();
                        if (double.TryParse(valueStr, out double value))
                        {
                            multiCore[size] = value;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading voltage drop table {tableName}: {ex.Message}");
            }

            return (singleCore, twinCore, multiCore);
        }

        /// <summary>
        /// Initialize empty tables as fallback
        /// </summary>
        private static void InitializeEmptyTables()
        {
            _copperWireVoltageDropTable = new Dictionary<double, double>();
            _copperCableTwinCoreVoltageDropTable = new Dictionary<double, double>();
            _copperCableMultiCoreVoltageDropTable = new Dictionary<double, double>();
            _aluminiumWireVoltageDropTable = new Dictionary<double, double>();
            _aluminiumCableTwinCoreVoltageDropTable = new Dictionary<double, double>();
            _aluminiumCableMultiCoreVoltageDropTable = new Dictionary<double, double>();
        }

        /// <summary>
        /// Force reload of voltage drop tables from database
        /// </summary>
        public static void ReloadTables()
        {
            lock (_loadLock)
            {
                _tablesLoaded = false;
                EnsureTablesLoaded();
            }
        }

        #endregion

        #region Properties to Access Tables

        private static Dictionary<double, double> CopperWireVoltageDropTable
        {
            get
            {
                EnsureTablesLoaded();
                return _copperWireVoltageDropTable ?? new Dictionary<double, double>();
            }
        }

        private static Dictionary<double, double> CopperCableTwinCoreVoltageDropTable
        {
            get
            {
                EnsureTablesLoaded();
                return _copperCableTwinCoreVoltageDropTable ?? new Dictionary<double, double>();
            }
        }

        private static Dictionary<double, double> CopperCableMultiCoreVoltageDropTable
        {
            get
            {
                EnsureTablesLoaded();
                return _copperCableMultiCoreVoltageDropTable ?? new Dictionary<double, double>();
            }
        }

        private static Dictionary<double, double> AluminiumWireVoltageDropTable
        {
            get
            {
                EnsureTablesLoaded();
                return _aluminiumWireVoltageDropTable ?? new Dictionary<double, double>();
            }
        }

        private static Dictionary<double, double> AluminiumCableTwinCoreVoltageDropTable
        {
            get
            {
                EnsureTablesLoaded();
                return _aluminiumCableTwinCoreVoltageDropTable ?? new Dictionary<double, double>();
            }
        }

        private static Dictionary<double, double> AluminiumCableMultiCoreVoltageDropTable
        {
            get
            {
                EnsureTablesLoaded();
                return _aluminiumCableMultiCoreVoltageDropTable ?? new Dictionary<double, double>();
            }
        }

        #endregion

        /// <summary>
        /// Calculate voltage drop for a cable connection based on phase type.
        /// Uses Twin Core values for single-phase and 3/4 Core values for 3-phase.
        /// Always uses "In Air" installation method values.
        /// </summary>
        /// <param name="conductor">Conductor material (Copper/Aluminium)</param>
        /// <param name="cableSize">Cable size in sq.mm</param>
        /// <param name="current">Current in amperes</param>
        /// <param name="length">Cable length in metres</param>
        /// <param name="isThreePhase">True for 3-phase system, false for single-phase</param>
        /// <returns>Voltage drop in volts</returns>
        public static double CalculateCableVoltageDrop(string conductor, double cableSize, double current, double length, bool isThreePhase = false)
        {
            if (!ApplicationSettings.Instance.VoltageDropEnabled)
            {
                return 0; // Voltage drop calculation is disabled
            }

            var voltageDropTable = GetVoltageDropTableByPhase(conductor, isThreePhase);
            string phaseType = isThreePhase ? "3-phase (3/4 Core)" : "Single-phase (Twin Core)";
            
            if (voltageDropTable == null || !voltageDropTable.Any())
            {
                Console.WriteLine($"Warning: No voltage drop table found for {conductor} {phaseType}");
                return 0;
            }

            double voltageDropPerAmpPerMeter = GetVoltageDropForSize(voltageDropTable, cableSize);
            if (voltageDropPerAmpPerMeter <= 0)
            {
                Console.WriteLine($"Warning: No voltage drop data found for cable size {cableSize} sq.mm");
                return 0;
            }

            // Voltage drop formula with return phase consideration:
            // Single-phase: VD = 2 × (mV/A/m) × I × L / 1000  (factor of 2 for current going out AND returning via neutral)
            // Three-phase:  VD = √3 × (mV/A/m) × I × L / 1000 (factor of √3 ≈ 1.732 for balanced 3-phase)
            double phaseMultiplier = isThreePhase ? Math.Sqrt(3) : 2.0;
            double voltageDropVolts = (phaseMultiplier * voltageDropPerAmpPerMeter * current * length) / 1000.0;
            
            Console.WriteLine($"Cable voltage drop: {conductor} {phaseType} {cableSize}sq.mm, {current}A, {length}m = {voltageDropVolts:F3}V (mV/A/m={voltageDropPerAmpPerMeter}, multiplier={phaseMultiplier:F3})");
            return voltageDropVolts;
        }

        /// <summary>
        /// Calculate voltage drop for a cable and return detailed results including mV/A/m from database.
        /// </summary>
        public static (double voltageDropVolts, double mVPerAmpPerMeter, double phaseMultiplier) CalculateCableVoltageDropWithDetails(
            string conductor, double cableSize, double current, double length, bool isThreePhase = false)
        {
            if (!ApplicationSettings.Instance.VoltageDropEnabled)
            {
                return (0, 0, 0);
            }

            var voltageDropTable = GetVoltageDropTableByPhase(conductor, isThreePhase);
            
            if (voltageDropTable == null || !voltageDropTable.Any())
            {
                return (0, 0, 0);
            }

            double voltageDropPerAmpPerMeter = GetVoltageDropForSize(voltageDropTable, cableSize);
            if (voltageDropPerAmpPerMeter <= 0)
            {
                return (0, 0, 0);
            }

            double phaseMultiplier = isThreePhase ? Math.Sqrt(3) : 2.0;
            double voltageDropVolts = (phaseMultiplier * voltageDropPerAmpPerMeter * current * length) / 1000.0;
            
            return (voltageDropVolts, voltageDropPerAmpPerMeter, phaseMultiplier);
        }

        /// <summary>
        /// Calculate voltage drop for a cable connection (legacy method with coreCategory parameter).
        /// This method is kept for backward compatibility.
        /// </summary>
        /// <param name="conductor">Conductor material (Copper/Aluminium)</param>
        /// <param name="coreCategory">Core type category (Single Core/Twin Core/3-4 Core)</param>
        /// <param name="cableSize">Cable size in sq.mm</param>
        /// <param name="current">Current in amperes</param>
        /// <param name="length">Cable length in metres</param>
        /// <returns>Voltage drop in volts</returns>
        public static double CalculateCableVoltageDrop(string conductor, string coreCategory, double cableSize, double current, double length)
        {
            // Map coreCategory to isThreePhase
            bool isThreePhase = coreCategory != null && 
                (coreCategory.Contains("3", StringComparison.OrdinalIgnoreCase) || 
                 coreCategory.Contains("4", StringComparison.OrdinalIgnoreCase) ||
                 coreCategory.Contains("Multi", StringComparison.OrdinalIgnoreCase));
            
            return CalculateCableVoltageDrop(conductor, cableSize, current, length, isThreePhase);
        }

        /// <summary>
        /// Calculate voltage drop for a wire connection.
        /// Wires are assumed to be single-phase, so Twin Core values are used.
        /// </summary>
        /// <param name="conductor">Conductor material (Copper/Aluminium)</param>
        /// <param name="wireSize">Wire size in sq.mm</param>
        /// <param name="current">Current in amperes</param>
        /// <param name="length">Wire length in metres</param>
        /// <param name="isThreePhase">True for 3-phase system, false for single-phase (default: false for wires)</param>
        /// <returns>Voltage drop in volts</returns>
        public static double CalculateWireVoltageDrop(string conductor, double wireSize, double current, double length, bool isThreePhase = false)
        {
            if (!ApplicationSettings.Instance.VoltageDropEnabled)
            {
                return 0; // Voltage drop calculation is disabled
            }

            // Use phase-based table selection (Twin Core for single-phase, 3/4 Core for 3-phase)
            var voltageDropTable = GetVoltageDropTableByPhase(conductor, isThreePhase);
            string phaseType = isThreePhase ? "3-phase (3/4 Core)" : "Single-phase (Twin Core)";
            
            if (voltageDropTable == null || !voltageDropTable.Any())
            {
                Console.WriteLine($"Warning: No voltage drop table found for {conductor} wire {phaseType}");
                return 0;
            }

            double voltageDropPerAmpPerMeter = GetVoltageDropForSize(voltageDropTable, wireSize);
            if (voltageDropPerAmpPerMeter <= 0)
            {
                Console.WriteLine($"Warning: No voltage drop data found for wire size {wireSize} sq.mm");
                return 0;
            }

            // Voltage drop formula with return phase consideration:
            // Single-phase: VD = 2 × (mV/A/m) × I × L / 1000  (factor of 2 for current going out AND returning via neutral)
            // Three-phase:  VD = √3 × (mV/A/m) × I × L / 1000 (factor of √3 ≈ 1.732 for balanced 3-phase)
            double phaseMultiplier = isThreePhase ? Math.Sqrt(3) : 2.0;
            double voltageDropVolts = (phaseMultiplier * voltageDropPerAmpPerMeter * current * length) / 1000.0;
            
            Console.WriteLine($"Wire voltage drop: {conductor} {phaseType} {wireSize}sq.mm, {current}A, {length}m = {voltageDropVolts:F3}V (mV/A/m={voltageDropPerAmpPerMeter}, multiplier={phaseMultiplier:F3})");
            return voltageDropVolts;
        }

        /// <summary>
        /// Get the appropriate voltage drop table based on conductor material and phase type.
        /// Single-phase uses Twin Core values, 3-phase uses 3/4 Core values.
        /// </summary>
        /// <param name="conductor">Conductor material (Copper/Aluminium)</param>
        /// <param name="isThreePhase">True for 3-phase (uses 3/4 Core), false for single-phase (uses Twin Core)</param>
        /// <returns>Voltage drop table dictionary</returns>
        private static Dictionary<double, double>? GetVoltageDropTableByPhase(string conductor, bool isThreePhase)
        {
            if (string.IsNullOrWhiteSpace(conductor))
                return null;

            conductor = conductor.Trim();

            // Normalize conductor name
            bool isCopper = conductor.Equals("Copper", StringComparison.OrdinalIgnoreCase) ||
                           conductor.Contains("Cu", StringComparison.OrdinalIgnoreCase);
            bool isAluminium = conductor.Equals("Aluminium", StringComparison.OrdinalIgnoreCase) ||
                              conductor.Contains("Al", StringComparison.OrdinalIgnoreCase);

            if (isCopper)
            {
                // Single-phase = Twin Core, 3-phase = 3/4 Core
                return isThreePhase ? CopperCableMultiCoreVoltageDropTable : CopperCableTwinCoreVoltageDropTable;
            }
            else if (isAluminium)
            {
                // Single-phase = Twin Core, 3-phase = 3/4 Core
                return isThreePhase ? AluminiumCableMultiCoreVoltageDropTable : AluminiumCableTwinCoreVoltageDropTable;
            }

            return null;
        }

        /// <summary>
        /// Get the appropriate voltage drop table for a cable based on conductor and core type (legacy method)
        /// </summary>
        private static Dictionary<double, double>? GetCableVoltageDropTable(string conductor, string coreCategory)
        {
            if (string.IsNullOrWhiteSpace(conductor) || string.IsNullOrWhiteSpace(coreCategory))
                return null;

            conductor = conductor.Trim();
            coreCategory = coreCategory.Trim();

            if (conductor.Equals("Copper", StringComparison.OrdinalIgnoreCase))
            {
                return coreCategory switch
                {
                    "Single Core" => CopperWireVoltageDropTable,
                    "Twin Core" => CopperCableTwinCoreVoltageDropTable,
                    "3-4 Core" => CopperCableMultiCoreVoltageDropTable,
                    _ => CopperCableTwinCoreVoltageDropTable
                };
            }
            else if (conductor.Equals("Aluminium", StringComparison.OrdinalIgnoreCase))
            {
                return coreCategory switch
                {
                    "Single Core" => AluminiumWireVoltageDropTable,
                    "Twin Core" => AluminiumCableTwinCoreVoltageDropTable,
                    "3-4 Core" => AluminiumCableMultiCoreVoltageDropTable,
                    _ => AluminiumCableTwinCoreVoltageDropTable
                };
            }

            return null;
        }

        /// <summary>
        /// Get the appropriate voltage drop table for a wire based on conductor material
        /// </summary>
        private static Dictionary<double, double>? GetWireVoltageDropTable(string conductor)
        {
            if (string.IsNullOrWhiteSpace(conductor))
                return null;

            conductor = conductor.Trim();

            if (conductor.Equals("Copper", StringComparison.OrdinalIgnoreCase))
            {
                return CopperWireVoltageDropTable;
            }
            else if (conductor.Equals("Aluminium", StringComparison.OrdinalIgnoreCase))
            {
                return AluminiumWireVoltageDropTable;
            }

            // Try to extract conductor from MaterialType or other properties
            if (conductor.Contains("Cu", StringComparison.OrdinalIgnoreCase) || 
                conductor.Contains("Copper", StringComparison.OrdinalIgnoreCase))
            {
                return CopperWireVoltageDropTable;
            }
            else if (conductor.Contains("Al", StringComparison.OrdinalIgnoreCase) ||
                     conductor.Contains("Aluminium", StringComparison.OrdinalIgnoreCase))
            {
                return AluminiumWireVoltageDropTable;
            }

            return null;
        }

        /// <summary>
        /// Get voltage drop value for a specific size from the table
        /// </summary>
        private static double GetVoltageDropForSize(Dictionary<double, double> voltageDropTable, double size)
        {
            if (voltageDropTable.ContainsKey(size))
            {
                return voltageDropTable[size];
            }

            // If exact size not found, interpolate or use the closest larger size
            var largeSizes = voltageDropTable.Keys.Where(k => k >= size).OrderBy(k => k).ToList();
            if (largeSizes.Any())
            {
                var closestSize = largeSizes.First();
                Console.WriteLine($"Using voltage drop data for {closestSize} sq.mm (requested: {size} sq.mm)");
                return voltageDropTable[closestSize];
            }

            // If no larger size available, use the largest available
            if (voltageDropTable.Keys.Any())
            {
                var maxSize = voltageDropTable.Keys.Max();
                Console.WriteLine($"Warning: Requested size {size} sq.mm exceeds available data, using {maxSize} sq.mm");
                return voltageDropTable[maxSize];
            }

            return 0;
        }

        /// <summary>
        /// Check if a cable/wire size meets voltage drop requirements
        /// </summary>
        /// <param name="conductor">Conductor material</param>
        /// <param name="size">Cable/wire size in sq.mm</param>
        /// <param name="current">Current in amperes</param>
        /// <param name="length">Length in metres</param>
        /// <param name="isThreePhase">True for 3-phase system, false for single-phase</param>
        /// <param name="maxAllowedVoltageDropPercent">Maximum allowed voltage drop as percentage (uses user setting if not specified)</param>
        /// <param name="supplyVoltage">Supply voltage (default 230V for single-phase, 415V for 3-phase)</param>
        /// <param name="isWire">True for wire, false for cable</param>
        /// <returns>True if voltage drop is acceptable</returns>
        public static bool CheckVoltageDropCompliance(string conductor, double size, double current, double length,
            bool isThreePhase = false, double maxAllowedVoltageDropPercent = -1, double supplyVoltage = -1, bool isWire = false)
        {
            if (!ApplicationSettings.Instance.VoltageDropEnabled)
            {
                return true; // Always compliant if voltage drop calculation is disabled
            }

            // Use user setting if no specific limit provided
            if (maxAllowedVoltageDropPercent <= 0)
            {
                maxAllowedVoltageDropPercent = ApplicationSettings.Instance.MaxVoltageDropPercentage;
            }

            // Set default supply voltage based on phase type
            if (supplyVoltage <= 0)
            {
                supplyVoltage = isThreePhase ? 415.0 : 230.0;
            }

            double voltageDropVolts;
            
            if (isWire)
            {
                voltageDropVolts = CalculateWireVoltageDrop(conductor, size, current, length, isThreePhase);
            }
            else
            {
                voltageDropVolts = CalculateCableVoltageDrop(conductor, size, current, length, isThreePhase);
            }

            double maxAllowedVoltageDrop = supplyVoltage * (maxAllowedVoltageDropPercent / 100.0);
            bool isCompliant = voltageDropVolts <= maxAllowedVoltageDrop;

            if (!isCompliant)
            {
                string phaseType = isThreePhase ? "3-phase" : "Single-phase";
                Console.WriteLine($"Voltage drop compliance check failed ({phaseType}): {voltageDropVolts:F3}V exceeds maximum allowed {maxAllowedVoltageDrop:F3}V ({maxAllowedVoltageDropPercent}%)");
            }

            return isCompliant;
        }

        /// <summary>
        /// Check if a cable/wire size meets voltage drop requirements (legacy method with coreCategory)
        /// </summary>
        public static bool CheckVoltageDropCompliance(string conductor, double size, double current, double length, 
            double maxAllowedVoltageDropPercent, double supplyVoltage, bool isWire, string coreCategory)
        {
            // Map coreCategory to isThreePhase
            bool isThreePhase = coreCategory != null && 
                (coreCategory.Contains("3", StringComparison.OrdinalIgnoreCase) || 
                 coreCategory.Contains("4", StringComparison.OrdinalIgnoreCase) ||
                 coreCategory.Contains("Multi", StringComparison.OrdinalIgnoreCase));
            
            return CheckVoltageDropCompliance(conductor, size, current, length, isThreePhase, maxAllowedVoltageDropPercent, supplyVoltage, isWire);
        }
    }
}
