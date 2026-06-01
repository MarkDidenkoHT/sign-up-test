'use strict';

const { getSupabase, updateCronRecord } = require('../lib');

const FUNCTION_NAME = 'notifyViolations';
const ARRIVAL_GRACE_PERIOD = 5;

function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function hasFullDayLeave(user, userTimeOffRequests) {
  return userTimeOffRequests.some(tor => {
    if (!tor.time_from || !tor.time_to) return true;
    const fromMinutes = timeToMinutes(tor.time_from);
    const toMinutes = timeToMinutes(tor.time_to);
    const schedStart = timeToMinutes(user.time_arrive);
    const schedEnd = timeToMinutes(user.time_leave);
    if (fromMinutes === null || toMinutes === null || schedStart === null || schedEnd === null) return true;
    return fromMinutes <= schedStart && toMinutes >= schedEnd;
  });
}

function isWorkDay(id_1c, date, schedules) {
  const schedule = schedules?.find(s => s.id_1c === id_1c);
  if (!schedule?.work_days) return true;
  return schedule.work_days[date] === 'works';
}

function formatMessage(violation, date) {
  if (violation.type === 'absence') {
    return `<b>Уведомление</b>\n\nДата: ${date}\nТип нарушения: Пропуск\n\nЗапланированное время работы: ${violation.scheduled_time}\nОтметки о входе и выходе: Не зафиксированы\n\nПожалуйста, воспользуйтесь электронным журналом.`;
  }

  if (violation.type === 'missing_checkout') {
    return `<b>Уведомление</b>\n\nДата: ${date}\nТип нарушения: Нет отметки при выходе\n\nЗапланированное время убытия: ${violation.scheduled_time}\nФактическое время убытия: Не зафиксировано\n\nПожалуйста, воспользуйтесь электронным журналом.`;
  }

  const violationType = violation.type === 'late' ? 'опоздание' : 'ранний уход';
  const timeType = violation.type === 'late' ? 'прибытия' : 'убытия';
  const hours = Math.floor(violation.difference_minutes / 60);
  const minutes = violation.difference_minutes % 60;
  const timeDifference = hours > 0 ? `${hours} ч. ${minutes} мин.` : `${minutes} мин.`;

  return `<b>Уведомление</b>\n\nДата: ${date}\nТип нарушения: ${violationType}\n\nЗапланированное время ${timeType}: ${violation.scheduled_time}\nФактическое время ${timeType}: ${violation.actual_time}\nРазница: ${timeDifference}\n\nПожалуйста, воспользуйтесь электронным журналом.`;
}

async function sendTelegramMessage(chatId, text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not set');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(10_000)
  });

  const result = await response.json();
  if (!result.ok) throw new Error(result.description || 'Telegram API error');
}

async function run() {
  const supabase = getSupabase();
  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (yesterday.getDay() === 0) {
    console.log('[cron] notifyViolations: yesterday was Sunday, skipping');
    return;
  }

  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const [year, month] = yesterdayStr.split('-').map(Number);

  const [
    { data: users, error: usersError },
    { data: requestDates, error: requestDatesError },
    { data: hikvisionData, error: hikvisionError },
    { data: schedules, error: schedulesError }
  ] = await Promise.all([
    supabase.from('users').select('id_1c, chat_id, time_arrive, time_leave').eq('notify_violations', true),
    supabase.from('requests_dates').select('request_id').eq('date', yesterdayStr),
    supabase.from('hikvision').select('last_name, arrive_time, leave_time, access_date').eq('access_date', yesterdayStr).not('arrive_time', 'is', null),
    supabase.from('schedule').select('id_1c, work_days').eq('month->year', year).eq('month->month', month)
  ]);

  if (usersError) throw usersError;
  if (requestDatesError) throw requestDatesError;
  if (hikvisionError) throw hikvisionError;
  if (schedulesError) throw schedulesError;

  let timeOffRequests = [];
  const requestIds = requestDates?.map(rd => rd.request_id) || [];

  if (requestIds.length > 0) {
    const { data: requestsInfo, error: requestsInfoError } = await supabase
      .from('requests_info')
      .select('request_id, chat_id, time_from, time_to')
      .in('request_id', requestIds)
      .eq('status', 'approved');
    if (requestsInfoError) throw requestsInfoError;
    timeOffRequests = requestsInfo || [];
  }

  const violations = [];

  for (const user of users || []) {
    if (!isWorkDay(user.id_1c, yesterdayStr, schedules)) continue;

    const userTimeOffRequests = timeOffRequests.filter(tor => tor.chat_id === user.chat_id);
    if (hasFullDayLeave(user, userTimeOffRequests)) continue;

    const hikvisionRecord = hikvisionData?.find(h => h.last_name === user.id_1c);

    if (!hikvisionRecord) {
      if (user.time_arrive && user.time_leave) {
        violations.push({ chat_id: user.chat_id, id_1c: user.id_1c, type: 'absence', scheduled_time: `${user.time_arrive} - ${user.time_leave}`, actual_time: null, difference_minutes: null });
      }
      continue;
    }

    if (!hikvisionRecord.leave_time && hikvisionRecord.arrive_time) {
      violations.push({ chat_id: user.chat_id, id_1c: user.id_1c, type: 'missing_checkout', scheduled_time: user.time_leave, actual_time: null, difference_minutes: null });
      continue;
    }

    // Check late arrival
    const arrivalTimeOffRequest = userTimeOffRequests.find(tor => {
      if (!tor.time_from || !tor.time_to) return false;
      const fromMinutes = timeToMinutes(tor.time_from);
      const toMinutes = timeToMinutes(tor.time_to);
      const schedMinutes = timeToMinutes(user.time_arrive);
      return fromMinutes <= schedMinutes && toMinutes > schedMinutes;
    });

    const effectiveArrivalTime = arrivalTimeOffRequest ? arrivalTimeOffRequest.time_to : user.time_arrive;
    const actualArriveMinutes = timeToMinutes(hikvisionRecord.arrive_time);
    const effectiveArriveMinutes = timeToMinutes(effectiveArrivalTime);

    if (effectiveArriveMinutes !== null && actualArriveMinutes !== null) {
      const lateDifference = actualArriveMinutes - effectiveArriveMinutes;
      if (lateDifference > ARRIVAL_GRACE_PERIOD) {
        violations.push({ chat_id: user.chat_id, id_1c: user.id_1c, type: 'late', scheduled_time: effectiveArrivalTime, actual_time: hikvisionRecord.arrive_time.substring(0, 5), difference_minutes: lateDifference });
      }
    }

    // Check early leave
    const leaveTimeOffRequest = userTimeOffRequests.find(tor => {
      if (!tor.time_from || !tor.time_to) return false;
      const fromMinutes = timeToMinutes(tor.time_from);
      const toMinutes = timeToMinutes(tor.time_to);
      const schedLeaveMinutes = timeToMinutes(user.time_leave);
      return toMinutes >= schedLeaveMinutes && fromMinutes < schedLeaveMinutes;
    });

    const effectiveLeaveTime = leaveTimeOffRequest ? leaveTimeOffRequest.time_from : user.time_leave;
    const actualLeaveMinutes = timeToMinutes(hikvisionRecord.leave_time);
    const effectiveLeaveMinutes = timeToMinutes(effectiveLeaveTime);

    if (effectiveLeaveMinutes !== null && actualLeaveMinutes !== null && actualLeaveMinutes < effectiveLeaveMinutes) {
      const earlyDifference = effectiveLeaveMinutes - actualLeaveMinutes;
      violations.push({ chat_id: user.chat_id, id_1c: user.id_1c, type: 'early_leave', scheduled_time: effectiveLeaveTime, actual_time: hikvisionRecord.leave_time.substring(0, 5), difference_minutes: earlyDifference });
    }
  }

  const notificationResults = [];

  for (const violation of violations) {
    try {
      await sendTelegramMessage(violation.chat_id, formatMessage(violation, yesterdayStr));
      notificationResults.push({ chat_id: violation.chat_id, id_1c: violation.id_1c, type: violation.type, status: 'sent' });
    } catch (err) {
      notificationResults.push({ chat_id: violation.chat_id, id_1c: violation.id_1c, type: violation.type, status: 'failed', error: err.message });
    }
  }

  const sent = notificationResults.filter(r => r.status === 'sent').length;
  const failed = notificationResults.filter(r => r.status === 'failed').length;

  await updateCronRecord(supabase, FUNCTION_NAME, {
    last_run: now.toISOString(),
    last_result: {
      date: yesterdayStr,
      violations: violations.length,
      sent,
      failed,
      notifications: notificationResults
    }
  });

  console.log(`[cron] ${FUNCTION_NAME}: date=${yesterdayStr} violations=${violations.length} sent=${sent} failed=${failed}`);
}

module.exports = { name: FUNCTION_NAME, run, schedule: '0 11 * * *', missedRunCheck: 'daily' };