'use strict';

const supabase = require('../utils/db');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_MAIN_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

async function getCronRecord(supabase, functionName) {
  const { data, error } = await supabase
    .from('cron')
    .select('*')
    .eq('function', functionName)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

async function updateCronRecord(supabase, functionName, functionData) {
  const existing = await getCronRecord(supabase, functionName);
  if (existing) {
    await supabase
      .from('cron')
      .update({ function_data: functionData })
      .eq('function', functionName);
  } else {
    await supabase
      .from('cron')
      .insert({ function: functionName, function_data: functionData, cron_active: false });
  }
}

module.exports = { getSupabase, getCronRecord, updateCronRecord };