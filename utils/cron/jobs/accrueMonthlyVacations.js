'use strict';

const { getSupabase, updateCronRecord } = require('../lib');

const FUNCTION_NAME = 'accrueMonthlyVacations';

function addVacationDays(current) {
  if (current === null || current === undefined || current === '') return 2.33;
  const parsed = parseFloat(current);
  if (isNaN(parsed)) return null;
  const raw = parsed + 2.33;
  const truncated = Math.floor(raw * 100) / 100;
  return truncated === Math.floor(truncated) + 0.99 ? Math.ceil(truncated) : truncated;
}

async function run() {
  const supabase = getSupabase();

  const { data: users, error: fetchError } = await supabase
    .from('users')
    .select('id, chat_id, user_name, vacations_available');

  if (fetchError) throw fetchError;

  const results = { processed: 0, updated: 0, skipped: 0, errors: 0 };

  for (const user of users || []) {
    results.processed++;

    const newValue = addVacationDays(user.vacations_available);

    if (newValue === null) {
      results.skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ vacations_available: newValue.toString() })
      .eq('id', user.id);

    if (updateError) {
      results.errors++;
      continue;
    }

    await supabase.from('vacation_day_logs').insert({
      user_chat_id: user.chat_id,
      vacation_data: {
        user_id: user.id,
        user_name: user.user_name,
        old_value: user.vacations_available,
        new_value: newValue
      }
    });

    results.updated++;
  }

  await updateCronRecord(supabase, FUNCTION_NAME, {
    last_run: new Date().toISOString(),
    last_result: results
  });

  console.log(`[cron] ${FUNCTION_NAME}: processed=${results.processed} updated=${results.updated} skipped=${results.skipped} errors=${results.errors}`);
}

module.exports = { name: FUNCTION_NAME, run, schedule: '0 8 1 * *', missedRunCheck: 'monthly' };