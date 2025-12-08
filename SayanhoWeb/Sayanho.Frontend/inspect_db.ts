import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function inspectAllTables() {
    try {
        console.log("1. Fetching Index Table...");
        const indexRes = await axios.post(`${API_URL}/chat/query`, {
            query: 'SELECT DISTINCT "Sheet", "Item" FROM "Index"'
        });

        const indexData = indexRes.data;
        console.log(`Found ${indexData.length} item categories.`);

        // Group by Sheet to avoid duplicate queries
        const sheetMap = new Map();
        indexData.forEach((row: any) => {
            if (!sheetMap.has(row.Sheet)) {
                sheetMap.set(row.Sheet, []);
            }
            sheetMap.get(row.Sheet).push(row.Item);
        });

        console.log("\n2. Sampling each table...");

        for (const [sheet, items] of sheetMap) {
            const tableName = sheet;
            const query = `SELECT * FROM "${tableName}" LIMIT 1`;

            try {
                const res = await axios.post(`${API_URL}/chat/query`, { query });
                if (res.data.length > 0) {
                    const sample = res.data[0];
                    // Create a simplified view of the schema/data types
                    const schemaPreview = Object.entries(sample).map(([k, v]) => {
                        return `${k}: ${typeof v} (e.g. "${v}")`;
                    }).join(', ');

                    console.log(`\nTable "${tableName}" (Items: ${items.join(', ')})`);
                    console.log(`  Sample: { ${schemaPreview} }`);
                } else {
                    console.log(`\nTable "${tableName}" (Items: ${items.join(', ')}) - EMPTY`);
                }
            } catch (err: any) {
                console.error(`Error fetching table "${tableName}":`, err.response?.data || err.message);
            }
        }

    } catch (error) {
        console.error("Inspection failed:", error);
    }
}

inspectAllTables();
