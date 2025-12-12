
import sqlite3
import os

db_path = "d:/final project/SayanhoWeb/Sayanho.Backend/Data/schedule.db"

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

def print_table_info(item_name):
    print(f"\n=== {item_name} ===")
    
    # Get Sheet Name from Index
    cursor.execute('SELECT Sheet FROM "Index" WHERE Item = ?', (item_name,))
    row = cursor.fetchone()
    if not row:
        print(f"Item {item_name} not found in Index")
        return

    sheet_name = row['Sheet']
    print(f"Sheet: {sheet_name}")

    # Get Columns
    cursor.execute(f'PRAGMA table_info("{sheet_name}")')
    columns = [r[1] for r in cursor.fetchall()]
    print(f"Columns: {columns}")

    # Get Sample Data (Unique Types/Poles/Ratings)
    print("Sample Data (First 5 rows):")
    cursor.execute(f'SELECT * FROM "{sheet_name}" WHERE Item = ? LIMIT 5', (item_name,))
    for row in cursor.fetchall():
        # Print dictionary of row
        print(dict(row))

    # Analyze Hierarchy Options
    print("\nDistinct Values Analysis:")
    for col in ["Type", "Pole", "Current Rating", "Company", "Enclosure", "Breaking Capacity"]:
        if col in columns:
            cursor.execute(f'SELECT DISTINCT "{col}" FROM "{sheet_name}" WHERE Item = ? AND "{col}" IS NOT NULL LIMIT 10', (item_name,))
            vals = [r[0] for r in cursor.fetchall()]
            print(f"  {col}: {vals}")

try:
    print_table_info("Main Switch Open")
    print_table_info("MCCB")
    print_table_info("MCB")
    print_table_info("ACB")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
