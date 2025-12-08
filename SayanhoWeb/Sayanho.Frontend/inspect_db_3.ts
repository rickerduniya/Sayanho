import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

async function inspectTable3() {
    try {
        const query = `SELECT * FROM "3" LIMIT 10`;
        console.log(`\nFetching sample for table: 3`);

        try {
            const res = await axios.post(`${API_URL}/chat/query`, { query });
            console.log(`Data for 3:`, JSON.stringify(res.data, null, 2));
        } catch (err: any) {
            console.error(`Error fetching 3:`, err.response?.data || err.message);
        }

    } catch (error) {
        console.error("Inspection failed:", error);
    }
}

inspectTable3();
