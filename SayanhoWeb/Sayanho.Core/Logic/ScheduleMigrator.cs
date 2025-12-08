using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ClosedXML.Excel;
using Microsoft.Data.Sqlite;

namespace Sayanho.Core.Logic
{
    public static class ScheduleMigrator
    {
        public static void ConvertExcelToDatabase(string excelPath, string dbPath, string? password)
        {
            // Create directory
            Directory.CreateDirectory(Path.GetDirectoryName(dbPath) ?? ".");

            if (File.Exists(dbPath)) File.Delete(dbPath);

            SQLitePCL.Batteries_V2.Init();
            var cs = new SqliteConnectionStringBuilder { DataSource = dbPath, Mode = SqliteOpenMode.ReadWriteCreate };
            using var conn = new SqliteConnection(cs.ToString());
            conn.Open();
            // No encryption - plain SQLite database

            using var wb = new XLWorkbook(excelPath);
            using var tx = conn.BeginTransaction();

            // Build Index table from "index" sheet (Item -> Sheet)
            var indexSheet = wb.Worksheets.FirstOrDefault(ws => string.Equals(ws.Name, "index", StringComparison.OrdinalIgnoreCase));
            if (indexSheet == null) throw new InvalidOperationException("index sheet not found in Excel.");

            ExecNonQuery(conn, "CREATE TABLE IF NOT EXISTS \"Index\"(\"Item\" TEXT PRIMARY KEY, \"Sheet\" TEXT)");
            // Clear
            ExecNonQuery(conn, "DELETE FROM \"Index\"");
            foreach (var row in indexSheet.RangeUsed().RowsUsed().Skip(1)) // skip header
            {
                string item = row.Cell(1).GetString();
                string sheet = row.Cell(2).GetString();
                if (string.IsNullOrWhiteSpace(item) || string.IsNullOrWhiteSpace(sheet)) continue;
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "INSERT INTO \"Index\"(\"Item\", \"Sheet\") VALUES($i,$s)";
                cmd.Parameters.AddWithValue("$i", item);
                cmd.Parameters.AddWithValue("$s", sheet);
                cmd.ExecuteNonQuery();
            }

            // Create per-sheet tables and insert data
            var sheetNames = indexSheet.RangeUsed().RowsUsed().Skip(1)
                .Select(r => r.Cell(2).GetString())
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            foreach (var name in sheetNames)
            {
                var sheet = wb.Worksheet(name);
                if (sheet == null) continue;
                var used = sheet.RangeUsed();
                if (used == null) continue;
                var headerRow = used.FirstRowUsed();
                var headers = headerRow.CellsUsed().Select(c => c.GetString()).ToList();
                if (!headers.Any()) continue;

                // Create table with quoted headers as TEXT
                var colDefs = headers.Select(h => $"\"{h}\" TEXT");
                ExecNonQuery(conn, $"DROP TABLE IF EXISTS \"{name}\"");
                ExecNonQuery(conn, $"CREATE TABLE \"{name}\"({string.Join(",", colDefs)})");

                // Prepare insert
                var columns = string.Join(",", headers.Select(h => $"\"{h}\""));
                var values = string.Join(",", headers.Select((h, i) => $"$p{i}"));
                using var ins = conn.CreateCommand();
                ins.CommandText = $"INSERT INTO \"{name}\"({columns}) VALUES({values})";
                for (int i = 0; i < headers.Count; i++) ins.Parameters.Add(new SqliteParameter($"$p{i}", null));

                foreach (var row in used.RowsUsed().Skip(1))
                {
                    for (int i = 0; i < headers.Count; i++)
                    {
                        var cell = row.Cell(i + 1);
                        string val = cell.IsMerged() ? cell.MergedRange().FirstCell().GetString() : cell.GetString();
                        ins.Parameters[$"$p{i}"].Value = val ?? string.Empty;
                    }
                    ins.ExecuteNonQuery();
                }

                // Add index on Item if present to accelerate lookups
                if (headers.Contains("Item"))
                {
                    ExecNonQuery(conn, $"CREATE INDEX IF NOT EXISTS \"{name}_Item_idx\" ON \"{name}\"(\"Item\")");
                }
            }

            tx.Commit();
            using (var cmd = conn.CreateCommand()) { cmd.CommandText = "VACUUM"; cmd.ExecuteNonQuery(); }
        }

        private static void ExecNonQuery(SqliteConnection conn, string sql)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = sql;
            cmd.ExecuteNonQuery();
        }
    }
}
