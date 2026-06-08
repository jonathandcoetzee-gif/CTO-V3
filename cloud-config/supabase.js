/**
 * Supabase client initialisation wrapper.
 * Loads credentials from environment and exports a ready-to-use client.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_KEY missing — client will be null');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Get the Supabase client instance.
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getClient() {
  return supabase;
}

/**
 * Execute an RPC (stored procedure) on Supabase.
 * @param {string} procedureName
 * @param {Record<string, unknown>} [params={}]
 * @returns {Promise<{data: unknown, error: unknown}>}
 */
export async function rpc(procedureName, params = {}) {
  if (!supabase) throw new Error('Supabase not initialised. Check SUPABASE_URL and SUPABASE_KEY.');
  return supabase.rpc(procedureName, params);
}

/**
 * Query a table.
 * @param {string} table
 * @returns {import('@supabase/postgrest-js').PostgrestQueryBuilder}
 */
export function from(table) {
  if (!supabase) throw new Error('Supabase not initialised. Check SUPABASE_URL and SUPABASE_KEY.');
  return supabase.from(table);
}

export default { getClient, rpc, from };