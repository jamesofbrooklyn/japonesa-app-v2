/**
 * Seed menu_items from src/data/menu-seed.json into Supabase.
 * Run: SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... pnpm seed:menu
 */
import { createClient } from "@supabase/supabase-js";
import seed from "../src/data/menu-seed.json";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const rows = seed.items.map((it: any) => ({
    sku: it.sku,
    name: it.name,
    category: it.category,
    subcategory: it.subcategory ?? null,
    variant: it.variant ?? null,
    description: it.description ?? null,
    price_php: it.price_php,
    is_chefs_rec: it.is_chefs_rec ?? false,
    is_vegan: it.is_vegan ?? false,
    active: true,
  }));

  const { error, count } = await supabase
    .from("menu_items")
    .upsert(rows, { onConflict: "sku", count: "exact" });

  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} menu items (upserted: ${count ?? rows.length})`);
}

main();
