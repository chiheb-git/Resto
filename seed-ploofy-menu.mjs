import pg from 'pg';
const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query('DELETE FROM order_items');
await client.query('DELETE FROM orders');
await client.query('DELETE FROM dishes');
await client.query('DELETE FROM categories');
const categories = [
  { name_fr: 'Pizza', name_en: 'Pizza', name_ar: 'بيتزا', icon: '🍕', order_index: 0 },
  { name_fr: 'Sandwichs', name_en: 'Sandwiches', name_ar: 'سندويتش', icon: '🥖', order_index: 1 },
  { name_fr: 'Street Burger', name_en: 'Street Burger', name_ar: 'برغر', icon: '🍔', order_index: 2 },
  { name_fr: 'Naan House', name_en: 'Naan House', name_ar: 'نان', icon: '🫓', order_index: 3 },
  { name_fr: 'Salades Fraîches', name_en: 'Fresh Salads', name_ar: 'سلطات', icon: '🥗', order_index: 4 },
  { name_fr: 'Assiettes Signatures', name_en: 'Signature Plates', name_ar: 'أطباق', icon: '🍽️', order_index: 5 },
  { name_fr: 'Fried Chicken & Frites', name_en: 'Fried Chicken & Fries', name_ar: 'دجاج مقلي', icon: '🍗', order_index: 6 },
  { name_fr: 'Suppléments', name_en: 'Extras', name_ar: 'إضافات', icon: '➕', order_index: 7 },
];
const catIds = {};
for (const cat of categories) {
  const res = await client.query('INSERT INTO categories (name_fr, name_en, name_ar, icon, order_index) VALUES ($1,$2,$3,$4,$5) RETURNING id', [cat.name_fr, cat.name_en, cat.name_ar, cat.icon, cat.order_index]);
  catIds[cat.name_fr] = res.rows[0].id;
}
const colRes = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='dishes' ORDER BY ordinal_position");
console.log('Dishes columns:', colRes.rows.map(r => r.column_name));
await client.end();
console.log('Done!');
