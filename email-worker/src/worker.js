import { EmailMessage } from "cloudflare:email";
import PostalMime from "postal-mime";
import { createMimeMessage } from "mimetext";

// Cloudflare Email Worker: the "sas" (gate).
// A stranger emails handle@gatekeep.shadrakbessanh.me. We hold the message on our
// server and auto-reply to the sender with a pay link. Once they pay on-chain,
// the message is released into the recipient's dashboard inbox.
export default {
  async email(message, env) {
    const email = await PostalMime.parse(message.raw);
    const subject = email.subject || "(no subject)";
    const body = (email.text || email.html || "").slice(0, 4000);

    // Hold the message + get the pay link from our app.
    let payUrl = null;
    let known = true;
    try {
      const res = await fetch("https://gatekeep.shadrakbessanh.me/api/inbound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-gatekeep-secret": env.INBOUND_SECRET,
        },
        body: JSON.stringify({
          to: message.to,
          from: message.from,
          subject,
          body,
          messageId: message.headers.get("Message-ID") || "",
          references: message.headers.get("References") || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      payUrl = data.payUrl ?? null;
      if (res.status === 404) known = false;
    } catch {
      // If our server is unreachable, drop silently rather than bounce (anti-backscatter).
      return;
    }

    // Unknown recipient handle -> do not auto-reply (anti-backscatter).
    if (!known || !payUrl) return;

    // Auto-reply in the same thread with the pay link.
    const reply = createMimeMessage();
    const messageId = message.headers.get("Message-ID");
    const existingRefs = message.headers.get("References");
    if (messageId) {
      reply.setHeader("In-Reply-To", messageId);
      reply.setHeader(
        "References",
        existingRefs ? `${existingRefs} ${messageId}` : messageId
      );
    }
    reply.setSender({ name: "Gatekeep", addr: message.to });
    reply.setRecipient(message.from);
    reply.setSubject("Re: " + subject);
    reply.addMessage({
      contentType: "text/plain",
      data:
        `Thanks for reaching out.\n\n` +
        `This inbox is protected by Gatekeep. To make sure your message gets ` +
        `read, please lock a small refundable deposit here:\n\n${payUrl}\n\n` +
        `You'll be refunded as soon as they reply. If they don't respond in time, ` +
        `you can reclaim it. This keeps inboxes free of spam.\n\n— Gatekeep`,
    });

    const replyMessage = new EmailMessage(
      message.to,
      message.from,
      reply.asRaw()
    );
    await message.reply(replyMessage);
  },
};
