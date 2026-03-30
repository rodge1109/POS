import cron from 'node-cron';
import { sendDailyReport, sendWeeklyReport, sendMonthlyReport } from './emailReports.js';

export function startScheduler() {
  // Daily report — every day at 11:00 PM Asia/Manila
  cron.schedule('0 23 * * *', async () => {
    console.log('[Scheduler] Sending daily report...');
    try { await sendDailyReport(); } catch (e) { console.error('[Scheduler] Daily report error:', e.message); }
  }, { timezone: 'Asia/Manila' });

  // Weekly report — every Sunday at 11:30 PM Asia/Manila
  cron.schedule('30 23 * * 0', async () => {
    console.log('[Scheduler] Sending weekly report...');
    try { await sendWeeklyReport(); } catch (e) { console.error('[Scheduler] Weekly report error:', e.message); }
  }, { timezone: 'Asia/Manila' });

  // Monthly report — last day of month at 11:45 PM Asia/Manila
  // Runs daily and checks if today is the last day of the month
  cron.schedule('45 23 * * *', async () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDate() === 1) {
      console.log('[Scheduler] Sending monthly report...');
      try { await sendMonthlyReport(); } catch (e) { console.error('[Scheduler] Monthly report error:', e.message); }
    }
  }, { timezone: 'Asia/Manila' });

  console.log('[Scheduler] Report schedules registered (daily 11PM, weekly Sun 11:30PM, monthly last-day 11:45PM).');
}
