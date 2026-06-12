import pg from 'pg';
const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const img_pizza = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=640&q=80';
const img_burger = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=640&q=80';
const img_sandwich = 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=640&q=80';
const img_chicken = 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=640&q=80';
const img_salad = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=640&q=80';
const img_plate = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=640&q=80';
const img_extra = 'https://images.unsplash.com/photo-1541014741259-de529411b96a?auto=format&fit=crop&w=640&q=80';
const img_naan = 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=640&q=80';

// Get category IDs
const catRes = await client.query('SELECT id, name_fr FROM categories ORDER BY order_index');
const catIds = {};
for (const row of catRes.rows) catIds[row.name_fr] = row.id;
console.log('Categories found:', Object.keys(catIds));

const dishes = [
  // Pizza
  { cat: 'Pizza', fr: 'Marguerite', en: 'Margherita', ar: 'مرغريتا', desc_fr: 'Sauce tomate, gruyère.', price: 450, price_large: 1500, img: img_pizza, popular: false },
  { cat: 'Pizza', fr: 'Thon', en: 'Tuna', ar: 'تونة', desc_fr: 'Sauce tomate, thon, gruyère.', price: 750, price_large: 2250, img: img_pizza },
  { cat: 'Pizza', fr: 'Maya', en: 'Maya', ar: 'مايا', desc_fr: 'Sauce tomate, poulet, champignons frais, gruyère.', price: 850, price_large: 2550, img: img_pizza },
  { cat: 'Pizza', fr: 'Régina', en: 'Regina', ar: 'ريجينا', desc_fr: 'Sauce tomate, viande hachée veau, gruyère.', price: 800, price_large: 2400, img: img_pizza },
  { cat: 'Pizza', fr: 'Poulet', en: 'Chicken Pizza', ar: 'بيتزا دجاج', desc_fr: 'Sauce tomate, poulet, gruyère.', price: 750, price_large: 2250, img: img_pizza },
  { cat: 'Pizza', fr: '5 Fromages', en: '5 Cheeses', ar: '5 أجبان', desc_fr: 'Sauce blanche, camembert, mozzarella, cheddar, gruyère.', price: 850, price_large: 2550, img: img_pizza },
  { cat: 'Pizza', fr: 'Végétarienne', en: 'Vegetarian', ar: 'نباتية', desc_fr: 'Sauce tomate, poivron, oignons, gruyère, champignons.', price: 650, price_large: 1950, img: img_pizza },
  { cat: 'Pizza', fr: 'Suprême', en: 'Supreme', ar: 'سوبريم', desc_fr: 'Sauce blanche, mozzarella, gruyère, jambon de dinde, camembert.', price: 800, price_large: 2600, img: img_pizza },
  { cat: 'Pizza', fr: 'Mahraja', en: 'Maharaja', ar: 'مهراجا', desc_fr: 'Sauce curry, poulet curry, oignons, mozzarella, gruyère.', price: 900, price_large: 2850, img: img_pizza },
  { cat: 'Pizza', fr: 'La Ploöfy', en: 'La Ploofy', ar: 'لا بلوفي', desc_fr: 'Sauce blanche, poulet pané, gruyère, dinde fumée, mozzarella.', price: 1000, price_large: 3000, img: img_pizza, popular: true },
  { cat: 'Pizza', fr: 'Norvégienne', en: 'Norwegian', ar: 'النرويجية', desc_fr: 'Sauce blanche, saumon fumé, mozzarella, gruyère.', price: 1200, price_large: 3600, img: img_pizza },
  // Sandwichs
  { cat: 'Sandwichs', fr: 'Spécial', en: 'Special', ar: 'سبيشال', desc_fr: 'Pain maison, mixte poulet, fromage, sauce maison.', price: 350, img: img_sandwich },
  { cat: 'Sandwichs', fr: 'Chicken', en: 'Chicken', ar: 'تشيكن', desc_fr: 'Pain maison, poulet, sauce maison, cheddar.', price: 450, img: img_sandwich },
  { cat: 'Sandwichs', fr: 'Fusion', en: 'Fusion', ar: 'فيوجن', desc_fr: 'Pain maison, poulet + V-H, cheddar, sauce maison.', price: 550, img: img_sandwich },
  { cat: 'Sandwichs', fr: 'Crunchy', en: 'Crunchy', ar: 'كرنشي', desc_fr: 'Pain maison, poulet pané, cheddar, sauce maison.', price: 500, img: img_sandwich },
  { cat: 'Sandwichs', fr: 'Le Curry', en: 'The Curry', ar: 'الكاري', desc_fr: 'Pain maison, poulet curry, cheddar, dinde fumée, gruyère, sauce maison.', price: 600, img: img_sandwich },
  // Street Burger
  { cat: 'Street Burger', fr: 'Cheeseburger', en: 'Cheeseburger', ar: 'تشيزبرغر', desc_fr: 'V-H poulet, salade, fromage, sauce maison, cornichon.', price: 300, img: img_burger },
  { cat: 'Street Burger', fr: 'Steak', en: 'Steak Burger', ar: 'ستيك برغر', desc_fr: 'Steak haché, oignons caramélisés, fromage, gruyère, sauce maison, salade.', price: 400, img: img_burger },
  { cat: 'Street Burger', fr: 'Crunchy Burger', en: 'Crunchy Burger', ar: 'كرنشي برغر', desc_fr: 'Poulet pané, oignons caramélisés, gruyère, sauce maison.', price: 500, img: img_burger },
  { cat: 'Street Burger', fr: 'Mix Burger', en: 'Mix Burger', ar: 'ميكس برغر', desc_fr: 'Steak haché + poulet pané, salade, gruyère, oignons caramélisés, sauce maison, cornichon.', price: 650, img: img_burger },
  { cat: 'Street Burger', fr: "L'Américain", en: 'The American', ar: 'الأمريكي', desc_fr: 'Double steaks, cheddar, salade, oignons caramélisés, gruyère, œuf, sauce maison, champignons.', price: 850, img: img_burger, popular: true },
  // Naan House
  { cat: 'Naan House', fr: 'Chick NAAN', en: 'Chick NAAN', ar: 'تشيك نان', desc_fr: 'Poulet pané, cheddar, crudités, sauce maison.', price: 600, img: img_naan },
  { cat: 'Naan House', fr: 'Beef NAAN', en: 'Beef NAAN', ar: 'بيف نان', desc_fr: 'Viande hachée, cheddar, crudités, sauce maison.', price: 650, img: img_naan },
  { cat: 'Naan House', fr: 'Cheese NAAN', en: 'Cheese NAAN', ar: 'تشيز نان', desc_fr: 'Tenders, cheddar, crudités, gruyère, sauce maison.', price: 750, img: img_naan },
  // Salades
  { cat: 'Salades Fraîches', fr: 'Salade César', en: 'Caesar Salad', ar: 'سلطة سيزر', desc_fr: 'Salade fraîche César.', price: 600, img: img_salad },
  { cat: 'Salades Fraîches', fr: 'Salade Niçoise', en: 'Nicoise Salad', ar: 'سلطة نيسواز', desc_fr: 'Salade Niçoise fraîche.', price: 550, img: img_salad },
  { cat: 'Salades Fraîches', fr: 'Salade Ploöfy', en: 'Ploofy Salad', ar: 'سلطة بلوفي', desc_fr: 'Saumon, avocat.', price: 1200, img: img_salad, popular: true },
  // Assiettes
  { cat: 'Assiettes Signatures', fr: 'Assiette Poulet Pané', en: 'Breaded Chicken Plate', ar: 'طبق دجاج مقلي', desc_fr: 'Poulet pané, frites, sauce fromagère.', price: 550, img: img_plate },
  { cat: 'Assiettes Signatures', fr: 'Assiette Viande Hachée', en: 'Ground Beef Plate', ar: 'طبق لحم مفروم', desc_fr: 'V-H, frites, sauce fromagère.', price: 750, img: img_plate },
  { cat: 'Assiettes Signatures', fr: 'Assiette Crunchy', en: 'Crunchy Plate', ar: 'طبق كرنشي', desc_fr: 'Tenders, frites, sauce maison, oignons caramélisés, fromage fumé.', price: 650, img: img_plate },
  { cat: 'Assiettes Signatures', fr: 'Assiette BBQ', en: 'BBQ Plate', ar: 'طبق باربيكيو', desc_fr: 'V-H, dinde fumée, frites, sauce fromagère, sauce BBQ.', price: 800, img: img_plate },
  { cat: 'Assiettes Signatures', fr: 'Assiette Ploofy', en: 'Ploofy Plate', ar: 'طبق بلوفي', desc_fr: 'Poulet pané, V-H, frites, gruyère, sauce fromagère, sauce maison, oignons caramélisés, cornichon.', price: 1000, img: img_plate, popular: true },
  // Fried Chicken
  { cat: 'Fried Chicken & Frites', fr: 'Tenders 3 pièces', en: '3pc Tenders', ar: 'تندرز 3 قطع', desc_fr: '3 tenders croustillants.', price: 650, img: img_chicken },
  { cat: 'Fried Chicken & Frites', fr: 'Tenders 6 pièces', en: '6pc Tenders', ar: 'تندرز 6 قطع', desc_fr: '6 tenders croustillants.', price: 1000, img: img_chicken },
  { cat: 'Fried Chicken & Frites', fr: 'Tenders 10 pièces', en: '10pc Tenders', ar: 'تندرز 10 قطع', desc_fr: '10 tenders croustillants.', price: 1500, img: img_chicken },
  { cat: 'Fried Chicken & Frites', fr: 'Wings 3 pièces', en: '3pc Wings', ar: 'وينغز 3 قطع', desc_fr: '3 wings croustillants.', price: 500, img: img_chicken },
  { cat: 'Fried Chicken & Frites', fr: 'Wings 6 pièces', en: '6pc Wings', ar: 'وينغز 6 قطع', desc_fr: '6 wings croustillants.', price: 700, img: img_chicken },
  { cat: 'Fried Chicken & Frites', fr: 'Wings 10 pièces', en: '10pc Wings', ar: 'وينغز 10 قطع', desc_fr: '10 wings croustillants.', price: 1000, img: img_chicken },
  // Suppléments
  { cat: 'Suppléments', fr: 'Frites', en: 'Fries', ar: 'بطاطا مقلية', desc_fr: 'Portion de frites.', price: 150, img: img_extra },
  { cat: 'Suppléments', fr: 'Gruyère / Mozzarella / Cheddar', en: 'Cheese', ar: 'جبن', desc_fr: 'Supplément fromage.', price: 100, img: img_extra },
  { cat: 'Suppléments', fr: 'Oignons Caramélisés / Camembert', en: 'Caramelized Onions / Camembert', ar: 'بصل كراميل', desc_fr: 'Supplément oignons ou camembert.', price: 100, img: img_extra },
  { cat: 'Suppléments', fr: 'Champignons / Dinde fumée', en: 'Mushrooms / Smoked Turkey', ar: 'فطر / ديك رومي', desc_fr: 'Supplément champignons ou dinde fumée.', price: 150, img: img_extra },
  { cat: 'Suppléments', fr: 'Œuf', en: 'Egg', ar: 'بيضة', desc_fr: 'Supplément œuf.', price: 50, img: img_extra },
];

for (const d of dishes) {
  await client.query(
    `INSERT INTO dishes (category_id, name_fr, name_en, name_ar, description_fr, description_en, description_ar, price, price_large, image_url, is_popular, is_new, is_available, allergens, currency)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      catIds[d.cat], d.fr, d.en, d.ar,
      d.desc_fr, d.desc_fr, d.desc_fr,
      d.price, d.price_large || null,
      d.img,
      d.popular || false, false, true,
      '{}', 'DZA'
    ]
  );
}

console.log('✅ Menu Ploofy inséré avec succès ! ' + dishes.length + ' plats ajoutés.');
await client.end();
