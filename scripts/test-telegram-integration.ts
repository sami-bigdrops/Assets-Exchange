import { sendSubmissionTelegramAlert } from "@/features/notifications/notification.service";

// Mock environment variables
process.env.TELEGRAM_BOT_TOKEN = "TEST_TOKEN";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mock fetch
const _originalFetch = global.fetch;

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTests() {
  // eslint-disable-next-line no-console
  console.log("🚀 Starting Telegram Integration Tests...\n");

  // TEST 1: Slow Network Test
  // eslint-disable-next-line no-console
  console.log("TEST 1: Slow Network Test (5s delay)");
  global.fetch = async (_url, _options) => {
    // console.log(`[Mock Fetch] Request to ${url}`); // Squelch simple logs
    await delay(5000); // Simulate 5s delay
    return {
      ok: true,
      statusText: "OK",
      json: async () => ({ ok: true, result: {} }),
    } as Response;
  };

  const start = Date.now();
  // Fire and forget - just like in the route handler
  const slowPromise = sendSubmissionTelegramAlert(
    "123456789",
    "TRACK-123",
    "Test Campaign"
  )
    .then(() =>
      // eslint-disable-next-line no-console
      console.log(
        "✅ [Slow Network] Alert sent successfully (Async completion)"
      )
    )

    .catch((err) => console.error("❌ [Slow Network] Alert failed", err));

  const end = Date.now();
  // eslint-disable-next-line no-console
  console.log(
    `[Slow Network] Function call returned in ${end - start}ms (Should be near instant)`
  );
  if (end - start < 150) {
    // eslint-disable-next-line no-console
    console.log("✅ [Slow Network] PASSED: Non-blocking assertion met.\n");
  } else {
    // eslint-disable-next-line no-console
    console.log("❌ [Slow Network] FAILED: Function blocked execution.\n");
  }

  // TEST 2: Invalid ID Test
  await delay(100);
  // eslint-disable-next-line no-console
  console.log("TEST 2: Invalid ID Test");

  const invalidId = "invalid-id";
  try {
    await sendSubmissionTelegramAlert(
      invalidId,
      "TRACK-456",
      "Valild Campaign"
    );
    // eslint-disable-next-line no-console
    console.log(
      "✅ [Invalid ID] PASSED: Handled gracefully (see log above).\n"
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`❌ [Invalid ID] FAILED: Threw error: ${err}\n`);
  }

  // TEST 3: HTML Special Chars
  await delay(100);
  // eslint-disable-next-line no-console
  console.log("TEST 3: HTML Special Chars & Formatting Test");
  const specialCampaign = "Apples & Oranges <Test>";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedBody: any = null;

  global.fetch = async (_url, _options) => {
    capturedBody = JSON.parse(_options?.body as string);
    return {
      ok: true,
      statusText: "OK",
      json: async () => ({ ok: true }),
    } as Response;
  };

  await sendSubmissionTelegramAlert("987654321", "TRACK-789", specialCampaign);

  if (capturedBody) {
    // eslint-disable-next-line no-console
    console.log(`[HTML Chars] Sent Text: \n${capturedBody.text}\n`);
    const expectedText = `<b>Campaign:</b> Apples &amp; Oranges &lt;Test&gt;`;
    const expectedLink = `<a href="http://localhost:3000/track?id=TRACK-789">Click here to track your asset status</a>`;

    if (
      capturedBody.text.includes(expectedText) &&
      capturedBody.text.includes(expectedLink)
    ) {
      // eslint-disable-next-line no-console
      console.log(
        "✅ [HTML Chars] PASSED: Content escaped and formatted correctly.\n"
      );
    } else {
      // eslint-disable-next-line no-console
      console.log("❌ [HTML Chars] FAILED: Content mismatch.\n");
    }
  } else {
    // eslint-disable-next-line no-console
    console.log("❌ [HTML Chars] FAILED: No request sent.\n");
  }

  // eslint-disable-next-line no-console
  console.log("Waiting for slow network test to finish...");
  await slowPromise;
}

runTests().catch(console.error);
