// Quick DB connection test — run: npx tsx src/test-db-connection.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qbvvjnfxzxmblcfnbsfs.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_T4SXLymWPLdWklIaIuOkng_qQzZRG_b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Project: ${SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1]}\n`);

  // Test 1: Health check
  console.log('Test 1: Supabase health check');
  const { error: healthError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  if (healthError) {
    console.log(`  ❌ FAILED: ${healthError.message}`);
  } else {
    console.log(`  ✅ PASSED: Connection successful\n`);
  }

  // Test 2: List all tables
  console.log('Test 2: Check all tables exist');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .order('table_name');

  if (tablesError) {
    console.log(`  ❌ FAILED: ${tablesError.message}`);
  } else {
    const tableNames = tables?.map(t => t.table_name) || [];
    console.log(`  ✅ Found ${tableNames.length} tables:`);
    tableNames.forEach(t => console.log(`     - ${t}`));
    console.log('');
  }

  // Test 3: Check seeded data
  console.log('Test 3: Check seeded data');
  const { data: products, error: prodError } = await supabase.from('products').select('name, price, stock');
  if (prodError) {
    console.log(`  ❌ Products: ${prodError.message}`);
  } else {
    console.log(`  ✅ Products: ${(products || []).length} products found`);
    (products || []).forEach(p => console.log(`     - ${p.name}: ${p.price} ETB (stock: ${p.stock})`));
  }

  const { data: categories, error: catError } = await supabase.from('categories').select('name');
  if (catError) {
    console.log(`  ❌ Categories: ${catError.message}`);
  } else {
    console.log(`  ✅ Categories: ${(categories || []).length} categories found`);
  }

  // Test 4: Test auth
  console.log('\nTest 4: Auth system');
  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError) {
    console.log(`  ❌ Auth session: ${authError.message}`);
  } else {
    console.log(`  ✅ Auth session: ${authData.session ? 'Active' : 'No session (not signed in)'}`);
  }

  // Test 5: Test orders table (new)
  console.log('\nTest 5: New tables (orders, order_items, chats)');
  const { data: orders, error: ordersError } = await supabase.from('orders').select('count', { count: 'exact', head: true });
  console.log(`  ${ordersError ? '❌' : '✅'} Orders table: ${ordersError ? ordersError.message : 'accessible'}`);

  const { data: orderItems, error: oiError } = await supabase.from('order_items').select('count', { count: 'exact', head: true });
  console.log(`  ${oiError ? '❌' : '✅'} Order_items table: ${oiError ? oiError.message : 'accessible'}`);

  const { data: chats, error: chatsError } = await supabase.from('chats').select('count', { count: 'exact', head: true });
  console.log(`  ${chatsError ? '❌' : '✅'} Chats table: ${chatsError ? chatsError.message : 'accessible'}`);

  const { data: conversations, error: convError } = await supabase.from('conversations').select('count', { count: 'exact', head: true });
  console.log(`  ${convError ? '❌' : '✅'} Conversations table: ${convError ? convError.message : 'accessible'}`);

  const { data: messages, error: msgError } = await supabase.from('messages').select('count', { count: 'exact', head: true });
  console.log(`  ${msgError ? '❌' : '✅'} Messages table: ${msgError ? msgError.message : 'accessible'}`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ DATABASE CONNECTION TEST COMPLETE');
  console.log('='.repeat(50));
}

testConnection().catch(console.error);
