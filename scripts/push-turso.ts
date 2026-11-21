import { execSync } from 'child_process';
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.');
    process.exit(1);
  }

  console.log(`Connecting to Turso: ${url}`);
  const client = createClient({ url, authToken });

  console.log('Generating DDL statements from prisma/schema.prisma...');
  const ddl = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', {
    encoding: 'utf8',
  });

  console.log('Applying DDL schema to Turso database...');
  await client.executeMultiple(ddl);

  console.log('Verifying tables in Turso...');
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  console.log('Turso tables created successfully:');
  tables.rows.forEach((r) => console.log(`  - ${r.name}`));
}

main().catch((err) => {
  console.error('Failed to push schema to Turso:', err);
  process.exit(1);
});
