import { default as pg } from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_upY38JinmwMb@ep-blue-boat-apfhsjn2-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
});
await client.connect();
const res = await client.query("SELECT id, name_fr, price, price_large FROM dishes WHERE name_fr = 'bata'");
console.log(res.rows);
await client.end();
