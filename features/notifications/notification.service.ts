import { sendAlert } from "@/lib/alerts";

import type { WorkflowEvent } from "./types";

export async function notifyWorkflowEvent(evt: WorkflowEvent) {
  try {
    const base = `Request: ${evt.requestId}\nOffer: ${evt.offerName}`;

    let msg = "";

    switch (evt.event) {
      case "request.approved_by_admin":
        msg = `📤 *Request approved by Admin*\n${base}`;
        break;

      case "request.rejected_by_admin":
        msg = `❌ *Request rejected by Admin*\n${base}`;
        break;

      case "response.approved_by_advertiser":
        msg = `✅ *Response approved by Advertiser*\n${base}`;
        break;

      case "response.sent_back_by_advertiser":
        msg = `↩️ *Response sent back by Advertiser*\n${base}`;
        break;

      default:
        return;
    }

    await sendAlert(msg);
  } catch (err) {
    console.error("Failed to send workflow notification", err);
  }
}
