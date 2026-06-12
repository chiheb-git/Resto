import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='categories' ORDER BY ordinal_position");
console.log(res.rows.map(r => r.column_name));
await client.end();
