export async function sendAlert(message: string) {
  if (!process.env.ALERT_WEBHOOK_URL) {
    return;
  }

  // Fire and forget: do not await the fetch call to prevent blocking the execution flow.
  // We handle the promise with .then() and .catch() to ensure errors are still logged.
  fetch(process.env.ALERT_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  })
    .then((response) => {
      if (!response.ok) {
        console.error("Failed to send alert webhook:", response.statusText);
      }
    })
    .catch((error) => {
      console.error("Failed to send alert:", error);
    });
}
