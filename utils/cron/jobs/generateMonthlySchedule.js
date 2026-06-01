'use strict';

const { getSupabase, updateCronRecord } = require('../lib');

const FUNCTION_NAME = 'generateMonthlySchedule';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function buildMonthlySchedule(workDays, year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const schedule = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    schedule[dateString] = workDays.includes(DAY_NAMES[date.getDay()]) ? 'works' : 'doesnt work';
  }

  return schedule;
}

async function run() {
  const supabase = getSupabase();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('user_name, work_days, id_1c, chat_id');

  if (usersError) throw usersError;

  const records = (users || []).map(user => ({
    user_name: user.user_name,
    id_1c: user.id_1c,
    chat_id: user.chat_id,
    work_days: buildMonthlySchedule(user.work_days || [], year, month),
    month: { year, month: month + 1 }
  }));

  const { error: insertError } = await supabase
    .from('schedule')
    .insert(records);

  if (insertError) throw insertError;

  await updateCronRecord(supabase, FUNCTION_NAME, {
    last_run: now.toISOString(),
    last_result: { processed: records.length }
  });

  console.log(`[cron] ${FUNCTION_NAME}: inserted ${records.length} schedule(s)`);
}

module.exports = { name: FUNCTION_NAME, run, schedule: '0 8 1 * *', missedRunCheck: 'monthly' };