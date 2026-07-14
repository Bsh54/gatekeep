import { execFile } from "child_process";
import path from "path";

// Sends an email via the DKIM-signing python script (scripts/send_mail.py).
export function sendMail(payload: object): Promise<{ sent: boolean }> {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), "scripts", "send_mail.py");
    const child = execFile("python3", [script], { timeout: 30000 }, (_e, stdout) => {
      try {
        resolve(JSON.parse((stdout || "").trim() || '{"sent":false}'));
      } catch {
        resolve({ sent: false });
      }
    });
    child.stdin?.write(JSON.stringify(payload));
    child.stdin?.end();
  });
}
