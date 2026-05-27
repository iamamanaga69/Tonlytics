import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export async function runDbMigrations(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[DATABASE/MIGRATIONS] DATABASE_URL is not set. Skipping automated schema migration.');
    return;
  }

  console.log('[DATABASE/MIGRATIONS] Starting automated schema check / migration...');
  
  // Create a pg client
  const client = new Client({ connectionString: databaseUrl });
  
  try {
    await client.connect();
    
    // Check if briefings table already exists
    const checkRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'briefings'
      );
    `);
    
    const tableExists = checkRes.rows[0]?.exists;
    
    if (tableExists) {
      console.log('[DATABASE/MIGRATIONS] Table "briefings" already exists. Schema is already initialized.');
      
      // Let's make sure the new tables also exist
      const checkNewTables = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'market_data'
        );
      `);
      
      const newTablesExist = checkNewTables.rows[0]?.exists;
      if (newTablesExist) {
        console.log('[DATABASE/MIGRATIONS] Table "market_data" already exists. New tables check passed.');
        await client.end();
        return;
      }
      console.log('[DATABASE/MIGRATIONS] New tables (e.g. market_data) do not exist yet. Running schema additions.');
    } else {
      console.log('[DATABASE/MIGRATIONS] Schema tables not found. Running full schema migration...');
    }
    
    // Resolve migration path
    // We try multiple potential paths to be robust to runtimes
    const pathsToTry = [
      path.resolve(process.cwd(), 'scripts/migration.sql'),
      path.resolve(process.cwd(), '../scripts/migration.sql'),
      path.resolve(process.cwd(), '../../scripts/migration.sql'),
      path.resolve(__dirname, '../../../../scripts/migration.sql'),
      path.resolve(__dirname, '../../../scripts/migration.sql')
    ];
    
    let sqlPath = '';
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        sqlPath = p;
        break;
      }
    }
    
    if (!sqlPath) {
      throw new Error(`Could not find migration.sql. Checked paths: ${pathsToTry.join(', ')}`);
    }
    
    console.log(`[DATABASE/MIGRATIONS] Found migration SQL file at: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Run the SQL script
    await client.query(sql);
    console.log('[DATABASE/MIGRATIONS] Database schema migration executed successfully!');
    
    // Also run grant_permissions.sql if present
    const grantPaths = [
      path.resolve(path.dirname(sqlPath), 'grant_permissions.sql'),
      path.resolve(process.cwd(), 'scripts/grant_permissions.sql')
    ];
    
    let grantPath = '';
    for (const p of grantPaths) {
      if (fs.existsSync(p)) {
        grantPath = p;
        break;
      }
    }
    
    if (grantPath) {
      console.log(`[DATABASE/MIGRATIONS] Found permissions SQL file at: ${grantPath}`);
      const grantSql = fs.readFileSync(grantPath, 'utf8');
      await client.query(grantSql);
      console.log('[DATABASE/MIGRATIONS] Database permissions applied successfully!');
    }
    
  } catch (error) {
    console.error('[DATABASE/MIGRATIONS] Failed to execute database migrations:', error);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}
