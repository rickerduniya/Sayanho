import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function inspectTable16() {
    try {
        const query = `SELECT * FROM "16" LIMIT 5`;
        console.log(`\nFetching sample for table: 16`);

        try {
            const res = await axios.post(`${API_URL}/chat/query`, { query });
            console.log(`Data for 16:`, JSON.stringify(res.data, null, 2));
        } catch (err: any) {
            console.error(`Error fetching 16:`, err.response?.data || err.message);
        }

    } catch (error) {
        console.error("Inspection failed:", error);
    }
}

inspectTable16();
