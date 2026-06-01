'use strict';

const cron = require('node-cron');
const { getSupabase, getCronRecord, updateCronRecord } = require('./lib');

const jobs = [
  require('./jobs/accrueMonthlyVacations'),
  require('./jobs/generateMonthlySchedule'),
  require('./jobs/syncFuelData'),
  require('./jobs/notifyViolations'),
  require('./jobs/checkProductImages'),
  require('./jobs/checkStockNotifications'),
];

const _tasks = [];

async function checkMissedRun(job) {
  const supabase = getSupabase();
  const record = await getCronRecord(supabase, job.name);
  const now = new Date();

  if (!record) {
    await supabase
      .from('cron')
      .insert({ function: job.name, function_data: { last_run: now.toISOString(), last_result: 'bootstrapped' }, cron_active: false });
    console.log(`[cron] "${job.name}" no record found, bootstrapped with cron_active=false — enable in DB to activate`);
    return;
  }

  if (!record.cron_active) {
    console.log(`[cron] "${job.name}" cron_active=false, skipping missed run check`);
    return;
  }

  const lastRun = new Date(record.function_data?.last_run);
  let missed = false;

  if (job.missedRunCheck === 'monthly') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    missed = lastRun < startOfMonth;
  }

  if (job.missedRunCheck === 'daily') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    missed = lastRun < startOfToday;
  }

  if (missed) {
    console.log(`[cron] "${job.name}" missed run detected, executing now`);
    await job.run();
  }
}

function initCron() {
  for (const job of jobs) {
    checkMissedRun(job).catch(err =>
      console.error(`[cron] missed run check failed for "${job.name}":`, err)
    );

    _tasks.push(
      cron.schedule(job.schedule, async () => {
        const supabase = getSupabase();
        const record = await getCronRecord(supabase, job.name);

        if (!record) {
          await supabase
            .from('cron')
            .insert({ function: job.name, function_data: { last_run: new Date().toISOString(), last_result: 'bootstrapped' }, cron_active: false });
          console.log(`[cron] "${job.name}" no record found, bootstrapped with cron_active=false — enable in DB to activate`);
          return;
        }

        if (!record.cron_active) {
          console.log(`[cron] "${job.name}" cron_active=false, skipping`);
          return;
        }

        await job.run();
      }, { timezone: 'Asia/Almaty' })
    );
  }

  console.log('[cron] scheduler started');
}

function shutdownCron() {
  _tasks.forEach(t => t.stop());
  _tasks.length = 0;
  console.log('[cron] scheduler stopped');
}

module.exports = { initCron, shutdownCron };