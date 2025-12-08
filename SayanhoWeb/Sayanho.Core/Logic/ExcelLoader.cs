using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using ClosedXML.Excel;

namespace Sayanho.Core.Logic
{
    public class ExcelLoader
    {
        private static XLWorkbook cachedWorkbook;
        private static bool isInitialized = false;
        private static readonly object lockObject = new object();
        
        public static void Initialize()
        {
            isInitialized = true;
        }

        public static (List<Dictionary<string, string>> Properties, string AlternativeCompany1, string AlternativeCompany2) LoadDefaultPropertiesFromExcel(string itemName, int condition)
        {
            return DatabaseLoader.LoadDefaultPropertiesFromDatabase(itemName, condition);
        }

        private static string GetColumnValue(IXLWorksheet sheet, IXLRangeRow row, string columnName)
        {
            int colIndex = FindColumnIndex(sheet, columnName);
            if (colIndex == -1) return string.Empty;

            var cell = row.Cell(colIndex);
            return cell.IsMerged() ? cell.MergedRange().FirstCell().GetString() : cell.GetString();
        }

        private static List<IXLRangeRow> FindRowsByItem(IXLWorksheet sheet, int itemColIdx, string itemName)
        {
            var rows = new List<IXLRangeRow>();
            foreach (var row in sheet.RangeUsed().RowsUsed())
            {
                if (row.Cell(itemColIdx).GetString() == itemName)
                    rows.Add(row);
            }
            return rows;
        }

        private static IXLCell FindCell(IXLWorksheet sheet, string columnName, string searchText)
        {
            int columnIndex = FindColumnIndex(sheet, columnName);
            if (columnIndex == -1) return null;

            foreach (var row in sheet.RangeUsed().RowsUsed())
            {
                var cell = row.Cell(columnIndex);
                if (cell.GetString() == searchText)
                    return cell;
            }
            return null;
        }

        private static int FindColumnIndex(IXLWorksheet sheet, string columnName)
        {
            var headerRow = sheet.Row(1);
            foreach (var cell in headerRow.CellsUsed())
            {
                if (cell.GetString() == columnName)
                    return cell.Address.ColumnNumber;
            }
            return -1;
        }
        
        public static string EncryptExcelFile(string filePath)
        {
            if (!File.Exists(filePath))
            {
                Console.WriteLine($"File not found: {filePath}");
                return string.Empty;
            }
            
            try
            {
                byte[] fileBytes = File.ReadAllBytes(filePath);
                
                using (Aes aes = Aes.Create())
                {
                    byte[] key = new byte[32] { 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 
                                               0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20 };
                    byte[] iv = new byte[16] { 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2E, 0x2F, 0x30 };
                    
                    string directory = Path.GetDirectoryName(filePath);
                    string fileName = Path.GetFileNameWithoutExtension(filePath);
                    string extension = Path.GetExtension(filePath);
                    string encryptedFilePath = Path.Combine(directory, $"{fileName}_encrypted{extension}");
                    
                    ICryptoTransform encryptor = aes.CreateEncryptor(key, iv);
                    
                    using (FileStream fsOutput = new FileStream(encryptedFilePath, FileMode.Create))
                    {
                        fsOutput.Write(iv, 0, iv.Length);
                        using (CryptoStream cs = new CryptoStream(fsOutput, encryptor, CryptoStreamMode.Write))
                        {
                            cs.Write(fileBytes, 0, fileBytes.Length);
                        }
                    }
                    
                    Console.WriteLine($"Encrypted file created: {encryptedFilePath}");
                    return encryptedFilePath;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error encrypting file: {ex.Message}");
                return string.Empty;
            }
        }
        
        public static string DecryptExcelFile(string filePath)
        {
            if (!File.Exists(filePath))
            {
                Console.WriteLine($"File not found: {filePath}");
                return string.Empty;
            }
            
            try
            {
                string tempDirectory = Path.GetTempPath();
                string fileName = Path.GetFileNameWithoutExtension(filePath);
                string extension = Path.GetExtension(filePath);
                string decryptedFilePath = Path.Combine(tempDirectory, $"{fileName}_decrypted{extension}");
                
                byte[] fileBytes = File.ReadAllBytes(filePath);
                
                using (Aes aes = Aes.Create())
                {
                    byte[] key = new byte[32] { 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, 0x0F, 0x10, 
                                               0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1E, 0x1F, 0x20 };
                    
                    byte[] iv = new byte[16];
                    Array.Copy(fileBytes, 0, iv, 0, iv.Length);
                    
                    ICryptoTransform decryptor = aes.CreateDecryptor(key, iv);
                    
                    using (FileStream fsOutput = new FileStream(decryptedFilePath, FileMode.Create))
                    {
                        using (CryptoStream cs = new CryptoStream(fsOutput, decryptor, CryptoStreamMode.Write))
                        {
                            cs.Write(fileBytes, iv.Length, fileBytes.Length - iv.Length);
                        }
                    }
                    
                    Console.WriteLine($"Decrypted file created: {decryptedFilePath}");
                    return decryptedFilePath;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error decrypting file: {ex.Message}");
                return string.Empty;
            }
        }
    }
}
