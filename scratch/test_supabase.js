const fs = require('fs');
const path = require('path');

// Manually parse env file
const envPath = path.join(__dirname, '../apps/web/.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
  console.error('Missing credentials in .env.local');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');

const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log('--- Testing Anon Client ---');
  const { data: anonData, error: anonError } = await supabaseAnon.from('briefings').select('*').limit(1);
  if (anonError) {
    console.error('Anon error fetching briefings:', anonError);
  } else {
    console.log('Anon success fetching briefings:', anonData);
  }

  console.log('\n--- Testing Admin Client (Service Role) ---');
  const { data: adminData, error: adminError } = await supabaseAdmin.from('briefings').select('*').limit(1);
  if (adminError) {
    console.error('Admin error fetching briefings:', adminError);
  } else {
    console.log('Admin success fetching briefings:', adminData);
  }
}

test();
