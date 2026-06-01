'use strict';

const { getSupabase, updateCronRecord } = require('../lib');

const FUNCTION_NAME = 'syncFuelData';

const RUSSIAN_MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

async function run() {
  const supabase = getSupabase();
  const now = new Date();

  const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const dateFrom = firstDayPrevMonth.toISOString().split('T')[0];
  const dateTo = lastDayPrevMonth.toISOString().split('T')[0];
  const year = firstDayPrevMonth.getFullYear();
  const monthName = RUSSIAN_MONTHS[firstDayPrevMonth.getMonth()];

  const fuelUrl = `${process.env.FUEL_API_URL}?date_from=${dateFrom}&date_to=${dateTo}&department=HiTech&projectLogin=Hi-tech`;

  const fuelResponse = await fetch(fuelUrl, { signal: AbortSignal.timeout(15_000) });
  if (!fuelResponse.ok) throw new Error(`Fuel API returned ${fuelResponse.status}`);

  const fuelData = await fuelResponse.json();
  if (!fuelData.success || !fuelData.machines) throw new Error('Invalid fuel API response');

  const upsertData = fuelData.machines
    .filter(m => m.fuel !== null && m.fuel !== undefined)
    .map(m => ({ car: m.number, month: monthName, year, fuel_amount: m.fuel }));

  const skippedCars = fuelData.machines
    .filter(m => m.fuel === null || m.fuel === undefined)
    .map(m => m.number);

  const { error: upsertError } = await supabase
    .from('cars_fuel')
    .upsert(upsertData, { onConflict: 'car,month,year' });

  if (upsertError) throw upsertError;

  await updateCronRecord(supabase, FUNCTION_NAME, {
    last_run: now.toISOString(),
    last_result: {
      period: { from: dateFrom, to: dateTo },
      month: monthName,
      year,
      total_machines: fuelData.machines.length,
      updated: upsertData.length,
      skipped: skippedCars.length,
      skipped_cars: skippedCars,
      total_fuel: fuelData.total_fuel
    }
  });

  console.log(`[cron] ${FUNCTION_NAME}: updated=${upsertData.length} skipped=${skippedCars.length} month=${monthName} ${year}`);
}

module.exports = { name: FUNCTION_NAME, run, schedule: '0 8 3 * *', missedRunCheck: 'monthly' };