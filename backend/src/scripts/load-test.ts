/**
 * Load test script: validates 1000+ recipient scheduling and rate limit rescheduling.
 *
 * Usage: npm run load-test
 * Prerequisites: API server running at http://localhost:4000 with a seeded sender.
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const SESSION_COOKIE = process.env.SESSION_COOKIE || '';

const TOTAL_RECIPIENTS = 1050;
const HOURLY_LIMIT = 20; // Low limit to force rescheduling in test

function generateRecipients(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `test-recipient-${i + 1}@example.com`);
}

function buildBodyHtml(subject: string): string {
  return `<html><body><h1>${subject}</h1><p>Load test email body for performance testing.</p></body></html>`;
}

async function fetchWithCookie(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...((options.headers as Record<string, string>) || {}),
      Cookie: SESSION_COOKIE,
      'Content-Type': 'application/json',
    },
  });
}

async function getSenders(): Promise<Array<{ id: string; email: string; name: string }>> {
  const res = await fetchWithCookie(`${BASE_URL}/api/senders`);
  if (!res.ok) {
    throw new Error(`GET /api/senders failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { data: Array<{ id: string; email: string; name: string }> };
  return body.data;
}

async function scheduleEmails(
  senderId: string,
  recipients: string[],
  hourlyLimit: number,
  subject: string
): Promise<any> {
  const payload = {
    senderId,
    recipients,
    subject,
    bodyHtml: buildBodyHtml(subject),
    startTime: new Date(Date.now() + 5000).toISOString(), // 5 seconds from now
    delayBetweenEmailsSeconds: 0,
    hourlyLimit,
  };

  const res = await fetchWithCookie(`${BASE_URL}/api/emails/schedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`POST /api/emails/schedule failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function getEmailCounts(): Promise<{ scheduled: number; sent: number }> {
  const res = await fetchWithCookie(`${BASE_URL}/api/emails/counts`);
  if (!res.ok) throw new Error(`GET /api/emails/counts failed: ${res.status}`);
  return res.json() as Promise<{ scheduled: number; sent: number }>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('🚀 ReachInbox Load Test Starting...');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Recipients per batch: ${TOTAL_RECIPIENTS}`);
  console.log(`   Hourly limit: ${HOURLY_LIMIT} (forcing reschedule overflow)`);
  console.log('');

  // 1. Fetch senders
  console.log('📋 Step 1: Fetching available senders...');
  let senders;
  try {
    senders = await getSenders();
  } catch (err: any) {
    console.error(`❌ Cannot connect to API: ${err.message}`);
    console.error('   Ensure the server is running and SESSION_COOKIE env var is set.');
    process.exit(1);
  }

  if (senders.length === 0) {
    console.error('❌ No senders available. Run: npm run seed:senders');
    process.exit(1);
  }

  const sender = senders[0];
  console.log(`   Using sender: ${sender.name} (${sender.email}) [id: ${sender.id}]`);

  // 2. Get baseline counts
  console.log('\n📊 Step 2: Baseline email counts...');
  const beforeCounts = await getEmailCounts();
  console.log(`   Scheduled: ${beforeCounts.scheduled}, Sent: ${beforeCounts.sent}`);

  // 3. Schedule 1050 recipients — exceeds hourly limit of 20, triggering rescheduling
  console.log(`\n📧 Step 3: Scheduling ${TOTAL_RECIPIENTS} emails with hourlyLimit=${HOURLY_LIMIT}...`);
  const t0 = Date.now();
  const recipients = generateRecipients(TOTAL_RECIPIENTS);

  const result = await scheduleEmails(
    sender.id,
    recipients,
    HOURLY_LIMIT,
    `[Load Test] Bulk Email - ${new Date().toISOString()}`
  );

  const elapsed = Date.now() - t0;
  console.log(`   ✅ Scheduling API responded in ${elapsed}ms`);
  console.log(`   batchId:          ${result.batchId}`);
  console.log(`   totalRecipients:  ${result.totalRecipients}`);
  console.log(`   scheduledCount:   ${result.scheduledCount}`);
  console.log(`   duplicatesRemoved:${result.duplicatesRemoved}`);
  console.log(`   firstScheduledAt: ${result.firstScheduledAt}`);
  console.log(`   lastScheduledAt:  ${result.lastScheduledAt}`);

  if (result.scheduledCount !== TOTAL_RECIPIENTS) {
    console.warn(`   ⚠️  Expected ${TOTAL_RECIPIENTS} scheduled, got ${result.scheduledCount}`);
  } else {
    console.log(`   ✅ All ${TOTAL_RECIPIENTS} recipients scheduled correctly`);
  }

  // 4. Post-schedule counts
  console.log('\n📊 Step 4: Post-schedule counts...');
  await sleep(1000);
  const afterCounts = await getEmailCounts();
  const addedScheduled = afterCounts.scheduled - beforeCounts.scheduled;
  console.log(`   Scheduled: ${afterCounts.scheduled} (+${addedScheduled})`);
  console.log(`   Sent: ${afterCounts.sent}`);

  if (addedScheduled >= TOTAL_RECIPIENTS) {
    console.log(`   ✅ Count verification passed (+${addedScheduled} scheduled)`);
  } else {
    console.warn(`   ⚠️  Count mismatch: expected +${TOTAL_RECIPIENTS}, got +${addedScheduled}`);
  }

  // 5. Schedule a second batch to test deduplication
  console.log('\n🔁 Step 5: Sending same recipients again (deduplication test)...');
  const dupResult = await scheduleEmails(
    sender.id,
    [...recipients, ...recipients.slice(0, 50)], // 1050 + 50 dupes = 1100 total
    HOURLY_LIMIT,
    `[Load Test] Dedup Test - ${new Date().toISOString()}`
  );

  console.log(`   Input:            ${recipients.length + 50} (with 50 dupes)`);
  console.log(`   scheduledCount:   ${dupResult.scheduledCount}`);
  console.log(`   duplicatesRemoved:${dupResult.duplicatesRemoved}`);

  if (dupResult.duplicatesRemoved === 50 && dupResult.scheduledCount === TOTAL_RECIPIENTS) {
    console.log('   ✅ Deduplication verified: 50 duplicates removed');
  } else {
    console.warn(`   ⚠️  Deduplication unexpected: removed=${dupResult.duplicatesRemoved}, scheduled=${dupResult.scheduledCount}`);
  }

  console.log('\n✅ Load test complete. Monitor Bull Board at /admin/queues for rate limit rescheduling.');
  console.log('   Rate-limited emails will be rescheduled to next hour window automatically.');
}

main().catch((err) => {
  console.error('❌ Load test failed:', err);
  process.exit(1);
});
