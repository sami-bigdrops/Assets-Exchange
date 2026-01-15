export async function sendAlert(message: string) {
    if (!process.env.ALERT_WEBHOOK_URL) {
        return;
    }

    try {
        const response = await fetch(process.env.ALERT_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: message }),
        });

        if (!response.ok) {
            console.error("Failed to send alert webhook:", response.statusText);
        }
    } catch (error) {
        console.error("Failed to send alert:", error);
    }
}
