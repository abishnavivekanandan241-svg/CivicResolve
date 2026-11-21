import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function copy() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (!tursoUrl || !tursoToken) {
    console.error('Turso credentials missing');
    process.exit(1);
  }

  console.log('Reading translations from local SQLite via @libsql/client...');
  const localClient = createClient({ url: 'file:./prisma/dev.db' });
  const localRes = await localClient.execute('SELECT * FROM Translation;');
  const rows = localRes.rows;
  console.log(`Found ${rows.length} translation rows in local database.`);

  const remoteClient = createClient({ url: tursoUrl, authToken: tursoToken });

  console.log('Copying translations to Turso in batches of 100...');
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const statements = chunk.map((r: any) => ({
      sql: `INSERT OR REPLACE INTO Translation (id, entityType, entityId, field, lang, text, sourceHash, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [r.id, r.entityType, r.entityId, r.field, r.lang, r.text, r.sourceHash, r.createdAt],
    }));

    await remoteClient.batch(statements, 'write');
    process.stdout.write(`Copied ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length} translations...\r`);
  }

  console.log('\nAll translations successfully copied to Turso database!');

  // Verify
  const countRes = await remoteClient.execute('SELECT COUNT(*) as count FROM Translation');
  console.log(`Turso Translation table count: ${countRes.rows[0].count}`);
}

copy().catch(console.error);
