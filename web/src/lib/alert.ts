import { handleForWallet } from "./db";
import { sendMail } from "./mail";

const MAIL_DOMAIN = "shadrakbessanh.me";
const APP = "https://gatekeep.shadrakbessanh.me";

// Notifies the recipient (at their real email) that a new paid message arrived.
export async function sendMessageAlert(m: {
  wallet: string;
  handle: string;
  fromEmail: string;
  body: string;
}) {
  try {
    const h = await handleForWallet(m.wallet);
    if (!h?.alertEmail) return;
    const preview = (m.body || "").replace(/\s+/g, " ").slice(0, 160);
    await sendMail({
      from: `${m.handle}@${MAIL_DOMAIN}`,
      to: h.alertEmail,
      subject: "You have a new message on Gatekeep",
      body:
        `${m.fromEmail} just reached your inbox.\n\n` +
        (preview ? `"${preview}"\n\n` : "") +
        `Open your inbox to read and reply:\n${APP}/dashboard\n\n— Gatekeep`,
    });
  } catch {}
}
