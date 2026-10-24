// Hourly trigger for the reminder emails. The work runs in the site's own
// route, app/api/cron/reminders, which checks the shared CRON_SECRET; this
// function only knocks on its door. Netlify runs scheduled functions on the
// published production deploy only.

const runReminders = async () => {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error('[reminders] URL or CRON_SECRET missing');
    return;
  }
  const res = await fetch(`${base}/api/cron/reminders`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });
  console.log('[reminders]', res.status, await res.text());
};

export default runReminders;

export const config = { schedule: '@hourly' };
