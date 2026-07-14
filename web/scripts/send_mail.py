#!/usr/bin/env python3
"""Send an email directly to the recipient's MX (VPS port 25 is open).
Reads a JSON payload from stdin: {from, to, subject, body, in_reply_to, references}.
Prints {"sent": bool}.
"""
import sys, json, subprocess, smtplib
from email.message import EmailMessage
from email.utils import make_msgid, formatdate


def mx_hosts(domain: str):
    try:
        out = subprocess.run(
            ["dig", "+short", "MX", domain, "@1.1.1.1"],
            capture_output=True, text=True, timeout=10,
        ).stdout.strip().splitlines()
        rows = []
        for line in out:
            parts = line.split()
            if len(parts) >= 2:
                rows.append((int(parts[0]), parts[1].rstrip(".")))
        rows.sort()
        if rows:
            return [h for _, h in rows]
    except Exception:
        pass
    return [domain]


def main():
    data = json.load(sys.stdin)
    to = data["to"]
    frm = data["from"]
    domain = to.split("@")[-1]

    msg = EmailMessage()
    msg["From"] = frm
    msg["To"] = to
    msg["Subject"] = data.get("subject", "")
    msg["Message-ID"] = make_msgid(domain=frm.split("@")[-1])
    msg["Date"] = formatdate(localtime=True)
    if data.get("in_reply_to"):
        msg["In-Reply-To"] = data["in_reply_to"]
        msg["References"] = data.get("references") or data["in_reply_to"]
    msg.set_content(data.get("body", ""))

    sent = False
    for host in mx_hosts(domain):
        try:
            s = smtplib.SMTP(host, 25, timeout=20)
            s.ehlo(frm.split("@")[-1])
            s.send_message(msg)
            s.quit()
            sent = True
            break
        except Exception:
            continue

    print(json.dumps({"sent": sent}))


if __name__ == "__main__":
    main()
