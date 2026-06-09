import { default as pg } from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_upY38JinmwMb@ep-blue-boat-apfhsjn2-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
});
await client.connect();
const res = await client.query(`
  SELECT o.id, o.total_price, oi.unit_price, oi.custom_note, d.name_fr, d.price, d.price_large
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN dishes d ON d.id = oi.dish_id
  ORDER BY o.id DESC LIMIT 5
`);
console.log(res.rows);
await client.end();
