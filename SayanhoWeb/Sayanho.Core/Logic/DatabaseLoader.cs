using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using Microsoft.Data.Sqlite;

namespace Sayanho.Core.Logic
{
    public static class DatabaseLoader
    {
        private static string dbPath = string.Empty;
        private static bool initialized = false;

        public static void Initialize(string contentRootPath)
        {
            if (initialized) return;
            // Ensure SQLite native bits are initialized
            SQLitePCL.Batteries_V2.Init();

            string appData = Path.Combine(contentRootPath, "Data");
            Directory.CreateDirectory(appData);
            dbPath = Path.Combine(appData, "schedule.db");

            bool dbCreated = false;
            
            // If DB does not exist, attempt auto-migration from Schedule.xlsx or Schedule_encrypted.xlsx
            if (!File.Exists(dbPath))
            {
                try
                {
                    string excel = Path.Combine(contentRootPath, "Schedule.xlsx");
                    if (!File.Exists(excel))
                    {
                        string enc = Path.Combine(contentRootPath, "Schedule_encrypted.xlsx");
                        if (File.Exists(enc))
                        {
                            // Decrypt to temp via existing ExcelLoader tool
                            string dec = ExcelLoader.DecryptExcelFile(enc);
                            if (!string.IsNullOrEmpty(dec))
                            {
                                ScheduleMigrator.ConvertExcelToDatabase(dec, dbPath, null);
                                try { File.Delete(dec); } catch { }
                                dbCreated = true;
                            }
                        }
                        else
                        {
                            Console.WriteLine("No Schedule.xlsx or Schedule_encrypted.xlsx found.");
                        }
                    }
                    else
                    {
                        ScheduleMigrator.ConvertExcelToDatabase(excel, dbPath, null);
                        dbCreated = true;
                    }
                    
                    if (dbCreated)
                    {
                        Console.WriteLine($"Database automatically created at: {dbPath}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error during database auto-creation: {ex.Message}");
                }
            }

            initialized = true;
        }

        public static SqliteConnection OpenConnection()
        {
            var cs = new SqliteConnectionStringBuilder
            {
                DataSource = dbPath,
                Mode = SqliteOpenMode.ReadWriteCreate
            };
            var conn = new SqliteConnection(cs.ToString());
            conn.Open();
            // No encryption - plain SQLite
            return conn;
        }

        public static (List<Dictionary<string, string>> Properties, string AlternativeCompany1, string AlternativeCompany2) LoadDefaultPropertiesFromDatabase(string itemName, int condition)
        {
            var list = new List<Dictionary<string, string>>();
            string alt1 = string.Empty;
            string alt2 = string.Empty;
            if (string.IsNullOrWhiteSpace(itemName)) return (list, alt1, alt2);

            if (!initialized)
            {
                 // Fallback or throw? For now, assume initialized or return empty
                 return (list, alt1, alt2);
            }

            using var conn = OpenConnection();
            // 1) resolve sheet from Index
            string sheet = string.Empty;
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT \"Sheet\" FROM \"Index\" WHERE \"Item\" = $item";
                cmd.Parameters.AddWithValue("$item", itemName);
                var result = cmd.ExecuteScalar();
                if (result == null) return (list, alt1, alt2);
                sheet = Convert.ToString(result);
            }

            // 2) fetch rows for itemName
            var rows = new List<Dictionary<string, string>>();
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = $"SELECT * FROM \"{sheet}\" WHERE \"Item\" = $item";
                cmd.Parameters.AddWithValue("$item", itemName);
                using var reader = cmd.ExecuteReader();
                var cols = new List<string>();
                for (int i = 0; i < reader.FieldCount; i++) cols.Add(reader.GetName(i));
                while (reader.Read())
                {
                    var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var col in cols)
                    {
                        dict[col] = reader[col]?.ToString() ?? string.Empty;
                    }
                    rows.Add(dict);
                }
            }
            if (rows.Count == 0) return (list, alt1, alt2);

            // Build output dictionaries taking only columns between Item and Rate and add Rate, Description, GS
            foreach (var row in rows)
            {
                var outRow = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                // Determine ordering around Item..Rate if present
                var keys = new List<string>(row.Keys);
                int iItem = keys.IndexOf("Item");
                int iRate = keys.IndexOf("Rate");
                if (iItem >= 0 && iRate >= 0 && iRate > iItem)
                {
                    for (int i = iItem + 1; i < iRate; i++)
                    {
                        var k = keys[i];
                        outRow[k] = row.GetValueOrDefault(k, string.Empty);
                    }
                }
                // Always add Rate if present
                if (row.ContainsKey("Rate")) outRow["Rate"] = row["Rate"];
                if (row.ContainsKey("Description")) outRow["Description"] = row["Description"];
                if (row.ContainsKey("GS")) outRow["GS"] = row["GS"];

                list.Add(outRow);
                if (condition == 1) break;
            }

            // Alternative companies when condition == 1
            if (condition == 1 && list.Count > 0)
            {
                var baseSpecs = new Dictionary<string, string>(list[0], StringComparer.OrdinalIgnoreCase);
                baseSpecs.Remove("Rate");
                baseSpecs.Remove("Description");
                baseSpecs.Remove("GS");
                // Specs except Company
                var compareSpecs = new Dictionary<string, string>(baseSpecs, StringComparer.OrdinalIgnoreCase);
                // Remove Company key using case-insensitive search
                var companyKey = compareSpecs.Keys.FirstOrDefault(k => string.Equals(k, "Company", StringComparison.OrdinalIgnoreCase));
                if (companyKey != null) compareSpecs.Remove(companyKey);

                var alternatives = new List<string>();
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = $"SELECT * FROM \"{sheet}\" WHERE \"Item\" = $item";
                    cmd.Parameters.AddWithValue("$item", itemName);
                    using var rdr = cmd.ExecuteReader();
                    var cols = new List<string>();
                    for (int i = 0; i < rdr.FieldCount; i++) cols.Add(rdr.GetName(i));
                    while (rdr.Read())
                    {
                        string company = string.Empty;
                        // Check if Company column exists before accessing it
                        if (cols.Contains("Company", StringComparer.OrdinalIgnoreCase))
                        {
                            company = rdr["Company"]?.ToString() ?? string.Empty;
                        }
                        
                        // Build current row specs subset
                        bool match = true;
                        foreach (var kv in compareSpecs)
                        {
                            // Check if column exists before accessing it
                            if (cols.Contains(kv.Key, StringComparer.OrdinalIgnoreCase))
                            {
                                var val = rdr[kv.Key]?.ToString() ?? string.Empty;
                                if (!string.Equals(val, kv.Value, StringComparison.Ordinal)) { match = false; break; }
                            }
                            else
                            {
                                // If column doesn't exist, treat as no match
                                match = false;
                                break;
                            }
                        }
                        if (match)
                        {
                            if (!string.IsNullOrEmpty(company)) alternatives.Add(company);
                        }
                    }
                }
                // Remove the current company and deduplicate
                var distinct = new List<string>();
                foreach (var c in alternatives)
                    if (!distinct.Contains(c, StringComparer.OrdinalIgnoreCase)) distinct.Add(c);
                if (distinct.Count >= 1) alt1 = distinct[0];
                if (distinct.Count >= 2) alt2 = distinct[1];
            }

            return (list, alt1, alt2);
        }

        public static Dictionary<string, Dictionary<string, SortedDictionary<double, int>>> LoadCableCapacityTables()
        {
            var result = new Dictionary<string, Dictionary<string, SortedDictionary<double, int>>>(StringComparer.OrdinalIgnoreCase);
            
            if (!initialized) return result;

            using var conn = OpenConnection();

            // Load Aluminium Cable Current Capacity (Table "22" from index mapping)
            LoadCableCapacityForMaterial(conn, "22", "Aluminium", result);

            // Load Copper Cable Current Capacity (Table "23" from index mapping)
            LoadCableCapacityForMaterial(conn, "23", "Copper", result);

            return result;
        }

        private static void LoadCableCapacityForMaterial(
            SqliteConnection conn, 
            string tableName, 
            string conductorName, 
            Dictionary<string, Dictionary<string, SortedDictionary<double, int>>> result)
        {
            var materialDict = new Dictionary<string, SortedDictionary<double, int>>(StringComparer.OrdinalIgnoreCase)
            {
                { "Single Core", new SortedDictionary<double, int>() },
                { "Twin Core", new SortedDictionary<double, int>() },
                { "3-4 Core", new SortedDictionary<double, int>() }
            };

            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = $"SELECT * FROM \"{tableName}\"";
                using var reader = cmd.ExecuteReader();

                // Get column indices for "In Air" columns
                int sizeColIdx = -1;
                int singleCoreColIdx = -1;
                int twinCoreColIdx = -1;
                int threeFourCoreColIdx = -1;

                for (int i = 0; i < reader.FieldCount; i++)
                {
                    string colName = reader.GetName(i);
                    if (colName.Contains("Size", StringComparison.OrdinalIgnoreCase))
                        sizeColIdx = i;
                    else if (colName.Contains("In Air", StringComparison.OrdinalIgnoreCase) && 
                             colName.Contains("Single Core", StringComparison.OrdinalIgnoreCase))
                        singleCoreColIdx = i;
                    else if (colName.Contains("In Air", StringComparison.OrdinalIgnoreCase) && 
                             colName.Contains("Twin Core", StringComparison.OrdinalIgnoreCase))
                        twinCoreColIdx = i;
                    else if (colName.Contains("In Air", StringComparison.OrdinalIgnoreCase) && 
                             (colName.Contains("3/3.5/4 Core", StringComparison.OrdinalIgnoreCase) || 
                              colName.Contains("3 Core", StringComparison.OrdinalIgnoreCase)))
                        threeFourCoreColIdx = i;
                }

                if (sizeColIdx == -1)
                {
                    Console.WriteLine($"Warning: Could not find Size column in {tableName}");
                    return;
                }

                // Read all rows
                while (reader.Read())
                {
                    string sizeStr = reader[sizeColIdx]?.ToString();
                    if (string.IsNullOrWhiteSpace(sizeStr)) continue;

                    // Parse size (handle both numeric and string formats like "4")
                    if (!double.TryParse(sizeStr, out double size))
                        continue;

                    // Parse and store current ratings for each core type
                    if (singleCoreColIdx >= 0)
                    {
                        string currentStr = reader[singleCoreColIdx]?.ToString();
                        if (int.TryParse(currentStr, out int current))
                            materialDict["Single Core"][size] = current;
                    }

                    if (twinCoreColIdx >= 0)
                    {
                        string currentStr = reader[twinCoreColIdx]?.ToString();
                        if (int.TryParse(currentStr, out int current))
                            materialDict["Twin Core"][size] = current;
                    }

                    if (threeFourCoreColIdx >= 0)
                    {
                        string currentStr = reader[threeFourCoreColIdx]?.ToString();
                        if (int.TryParse(currentStr, out int current))
                            materialDict["3-4 Core"][size] = current;
                    }
                }

                result[conductorName] = materialDict;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading cable capacity for {conductorName}: {ex.Message}");
            }
        }

        public static Dictionary<double, int> LoadWireCapacityTable()
        {
            var result = new Dictionary<double, int>();
            
            if (!initialized) return result;

            using var conn = OpenConnection();

            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT * FROM \"24\""; // Sheet 24 contains Current Capacity of Copper Wire
                using var reader = cmd.ExecuteReader();

                // Get column indices
                int sizeColIdx = -1;
                int currentColIdx = -1;

                for (int i = 0; i < reader.FieldCount; i++)
                {
                    string colName = reader.GetName(i);
                    if (colName.Contains("Size", StringComparison.OrdinalIgnoreCase))
                        sizeColIdx = i;
                    else if (colName.Contains("Current", StringComparison.OrdinalIgnoreCase) && 
                             colName.Contains("Capacity", StringComparison.OrdinalIgnoreCase))
                        currentColIdx = i;
                }

                if (sizeColIdx == -1 || currentColIdx == -1)
                {
                    Console.WriteLine("Warning: Could not find Size or Current Capacity columns in wire table");
                    return result;
                }

                // Read all rows
                while (reader.Read())
                {
                    string sizeStr = reader[sizeColIdx]?.ToString();
                    string currentStr = reader[currentColIdx]?.ToString();
                    
                    if (string.IsNullOrWhiteSpace(sizeStr) || string.IsNullOrWhiteSpace(currentStr))
                        continue;

                    if (double.TryParse(sizeStr, out double size) && int.TryParse(currentStr, out int current))
                    {
                        result[size] = current;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading wire capacity table: {ex.Message}");
            }

            return result;
        }
    }
}
