import 'dotenv/config';
import { query, pool } from './scripts/db.mjs';
const r = await query(`select dt.name, d.cover_image_url url from destinations d
  join destination_translations dt on dt.destination_id=d.id and dt.locale='en'
  where d.cover_image_url is not null and d.is_active and d.deleted_at is null
    and d.country_code='TZ'
  order by d.is_featured desc, d.sort_order limit 12`);
for (const x of r.rows) {
  let s='net';
  try { const res = await fetch(x.url,{headers:{'user-agent':'Mozilla/5.0'}}); s=res.status; } catch {}
  console.log(String(s).padEnd(5), x.name.padEnd(22), x.url.slice(0,78));
}
await pool.end();
