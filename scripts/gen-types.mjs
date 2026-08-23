import { writeFile } from 'node:fs/promises';
import { pool } from './db.mjs';

/**
 * Generates TypeScript types by introspecting the live schema.
 *
 * The Supabase CLI's `gen types` runs its own SSL probe on a direct connection,
 * which times out against the pooler host this project uses. This reads the same
 * catalogs over the connection we already know works, and emits the Row / Insert /
 * Update shape the Supabase client expects.
 */

const PG_TO_TS = {
  uuid: 'string', text: 'string', citext: 'string', bpchar: 'string', varchar: 'string',
  int2: 'number', int4: 'number', int8: 'number', float4: 'number', float8: 'number',
  numeric: 'number', bool: 'boolean', json: 'Json', jsonb: 'Json',
  timestamptz: 'string', timestamp: 'string', date: 'string', time: 'string',
  inet: 'string', regconfig: 'string', tsvector: 'string',
};

async function main() {
  const { rows: enums } = await pool.query(`
    select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as values
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname order by t.typname
  `);
  const enumNames = new Set(enums.map((e) => e.name));

  const { rows: cols } = await pool.query(`
    select c.relname as table_name,
           a.attname  as column_name,
           format_type(a.atttypid, null) as formatted,
           t.typname  as udt_name,
           not a.attnotnull as is_nullable,
           pg_get_expr(d.adbin, d.adrelid) is not null as has_default,
           a.attidentity <> '' as is_identity
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum
  `);

  const tables = new Map();
  for (const c of cols) {
    if (!tables.has(c.table_name)) tables.set(c.table_name, []);
    tables.get(c.table_name).push(c);
  }

  // Foreign keys become the `Relationships` entries every table must carry.
  // GenericTable requires the field, and omitting it makes the whole schema fail
  // the GenericSchema constraint — at which point Schema resolves to `never` and
  // every query reports "Property 'x' does not exist on type 'never'".
  //
  // Populating it properly (rather than emitting an empty array) is also what
  // makes nested selects like .select('*, businesses(*)') type-check.
  const { rows: fks } = await pool.query(`
    select
      con.conname                    as fk_name,
      src.relname                    as table_name,
      tgt.relname                    as referenced_relation,
      array_agg(sa.attname::text order by u.ord)  as columns,
      array_agg(ta.attname::text order by u.ord)  as referenced_columns,
      -- One-to-one when the referencing columns are themselves uniquely
      -- constrained across the whole table.
      --
      -- indpred IS NULL is essential here: a PARTIAL unique index (such as
      -- "one primary category per business" on ... WHERE is_primary) constrains
      -- only a subset of rows and does NOT make the relation one-to-one.
      -- Treating it as such makes Supabase type the join as a single object
      -- instead of an array, and every .map() over it becomes a type error.
      exists (
        select 1 from pg_index i
        where i.indrelid = con.conrelid
          and i.indisunique
          and i.indpred is null
          and i.indnatts = array_length(con.conkey, 1)
          and i.indkey::int2[] @> con.conkey
          and con.conkey @> i.indkey::int2[]
      ) as is_one_to_one
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_class tgt on tgt.oid = con.confrelid
    join pg_namespace n on n.oid = src.relnamespace
    cross join lateral unnest(con.conkey, con.confkey) with ordinality as u(src_att, tgt_att, ord)
    join pg_attribute sa on sa.attrelid = con.conrelid and sa.attnum = u.src_att
    join pg_attribute ta on ta.attrelid = con.confrelid and ta.attnum = u.tgt_att
    where con.contype = 'f' and n.nspname = 'public'
    group by con.conname, src.relname, tgt.relname, con.conrelid, con.conkey
    order by src.relname, con.conname
  `);

  const relationships = new Map();
  for (const fk of fks) {
    if (!relationships.has(fk.table_name)) relationships.set(fk.table_name, []);
    relationships.get(fk.table_name).push(fk);
  }

  // Callable functions, so supabase.rpc() has names and argument types. Without
  // this the Functions map is empty and rpc() accepts `never`, which reports as
  // "Argument of type '\"my_fn\"' is not assignable to parameter of type 'never'".
  //
  // Trigger functions are excluded: they return `trigger`, are never invoked
  // directly, and would only add noise. So are the aggregate/window entries and
  // anything owned by an extension.
  const { rows: fns } = await pool.query(`
    select
      p.proname as name,
      pg_get_function_result(p.oid) as returns,
      coalesce(
        json_agg(
          json_build_object('name', a.arg_name, 'type', a.arg_type)
          order by a.ord
        ) filter (where a.arg_name is not null),
        '[]'
      ) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    left join lateral (
      select
        u.ord,
        coalesce(p.proargnames[u.ord], 'arg' || u.ord)  as arg_name,
        format_type(u.arg_type, null)                   as arg_type
      -- proargtypes is an oidvector and is never null; unnest of an empty one
        -- simply yields no rows, which is what a zero-argument function needs.
        from unnest(p.proargtypes) with ordinality as u(arg_type, ord)
    ) a on true
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_function_result(p.oid) <> 'trigger'
      and not exists (
        select 1 from pg_depend d
        where d.objid = p.oid and d.deptype = 'e'
      )
    group by p.oid, p.proname
    order by p.proname
  `);

  const tableNames = new Set(tables.keys());

  const tsType = (col) => {
    const isArray = col.formatted.endsWith('[]');
    const base = col.udt_name.replace(/^_/, '');
    let mapped;
    if (enumNames.has(base)) mapped = `Database['public']['Enums']['${base}']`;
    else mapped = PG_TO_TS[base] ?? 'unknown';
    return isArray ? `${mapped}[]` : mapped;
  };

  /**
   * Maps a formatted SQL type (from format_type / pg_get_function_result) to TS.
   * Function signatures give spelled-out names like "integer" rather than the
   * internal "int4" that the column path sees, so this needs its own table.
   */
  const SQL_TO_TS = {
    'smallint': 'number', 'integer': 'number', 'bigint': 'number',
    'real': 'number', 'double precision': 'number', 'numeric': 'number',
    'text': 'string', 'citext': 'string', 'uuid': 'string', 'name': 'string',
    'character varying': 'string', 'character': 'string', 'regconfig': 'string',
    'inet': 'string', 'tsquery': 'string', 'tsvector': 'string',
    'date': 'string', 'timestamp with time zone': 'string',
    'timestamp without time zone': 'string',
    'boolean': 'boolean', 'json': 'Json', 'jsonb': 'Json',
    'void': 'undefined', 'record': 'unknown',
  };

  function sqlTypeToTs(raw) {
    if (!raw) return 'unknown';
    let type = raw.trim();

    // SETOF returns a set of rows, which arrives as an array.
    const isSet = /^setof\s+/i.test(type);
    if (isSet) type = type.replace(/^setof\s+/i, '');

    const isArray = type.endsWith('[]');
    if (isArray) type = type.slice(0, -2);

    // Trailing modifiers: numeric(12,2), character varying(3)
    type = type.replace(/\(.*\)$/, '').trim();

    const mapped = enumNames.has(type)
      ? `Database['public']['Enums']['${type}']`
      : tableNames.has(type)
        ? `Database['public']['Tables']['${type}']['Row']`
        : (SQL_TO_TS[type] ?? 'unknown');

    return isSet || isArray ? `${mapped}[]` : mapped;
  }

  let out = `/**
 * Generated from the live database schema — do not edit by hand.
 * Regenerate with: npm run db:types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
`;

  for (const [table, columns] of [...tables].sort()) {
    out += `      ${table}: {\n        Row: {\n`;
    for (const c of columns) {
      out += `          ${c.column_name}: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
    }
    out += `        };\n        Insert: {\n`;
    for (const c of columns) {
      // Optional on insert when nullable, defaulted, or generated.
      const optional = c.is_nullable || c.has_default || c.is_identity;
      out += `          ${c.column_name}${optional ? '?' : ''}: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
    }
    out += `        };\n        Update: {\n`;
    for (const c of columns) {
      out += `          ${c.column_name}?: ${tsType(c)}${c.is_nullable ? ' | null' : ''};\n`;
    }

    const rels = relationships.get(table) ?? [];
    if (rels.length === 0) {
      out += `        };\n        Relationships: [];\n      };\n`;
    } else {
      out += `        };\n        Relationships: [\n`;
      for (const r of rels) {
        out +=
          `          {\n` +
          `            foreignKeyName: '${r.fk_name}';\n` +
          `            columns: [${r.columns.map((c) => `'${c}'`).join(', ')}];\n` +
          `            isOneToOne: ${r.is_one_to_one};\n` +
          `            referencedRelation: '${r.referenced_relation}';\n` +
          `            referencedColumns: [${r.referenced_columns.map((c) => `'${c}'`).join(', ')}];\n` +
          `          },\n`;
      }
      out += `        ];\n      };\n`;
    }
  }

  out += `    };
    // A mapped type over never is an object with NO keys. Record<string, never>
    // would instead declare that every key exists and maps to never, so a table
    // lookup finds a never-typed view and collapses the whole result, surfacing
    // as "Property 'x' does not exist on type 'never'".
    Views: { [_ in never]: never };
    Functions: {
`;

  // Overloads would collide as duplicate keys; the first signature wins, which
  // is fine here because nothing in this schema is overloaded.
  const seenFns = new Set();
  for (const f of fns) {
    if (seenFns.has(f.name)) continue;
    seenFns.add(f.name);

    const args = (typeof f.args === 'string' ? JSON.parse(f.args) : f.args) ?? [];
    const argEntries = args
      .map((a) => `${a.name}: ${sqlTypeToTs(a.type)}`)
      .join('; ');

    out +=
      `      ${f.name}: {\n` +
      `        Args: ${args.length ? `{ ${argEntries} }` : 'Record<PropertyKey, never>'};\n` +
      `        Returns: ${sqlTypeToTs(f.returns)};\n` +
      `      };\n`;
  }

  out += `    };
    // Required by the GenericSchema constraint in @supabase/supabase-js.
    CompositeTypes: { [_ in never]: never };
    Enums: {
`;
  for (const e of enums) {
    out += `      ${e.name}: ${e.values.map((v) => `'${v}'`).join(' | ')};\n`;
  }
  out += `    };
  };
};

/** Row type for a table, e.g. Tables<'businesses'>. */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];
`;

  await writeFile('lib/supabase/database.types.ts', out, 'utf8');
  console.log(
    `Generated lib/supabase/database.types.ts — ${tables.size} tables, ${enums.length} enums.`,
  );
}

try {
  await main();
} catch (err) {
  console.error('Type generation failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
