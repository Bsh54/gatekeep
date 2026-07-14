#!/usr/bin/env python3
"""Send an email directly to the recipient's MX (VPS port 25 is open).
Reads a JSON payload from stdin: {from, to, subject, body, in_reply_to, references}.
Prints {"sent": bool}. Logs diagnostics to /tmp/gatekeep_mail.log.
"""
import sys, json, subprocess, smtplib
from email.message import EmailMessage
from email.utils import make_msgid, formatdate

LOG = "/tmp/gatekeep_mail.log"


def log(msg: str):
    try:
        with open(LOG, "a") as f:
            f.write(msg + "\n")
    except Exception:
        pass


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
    except Exception as e:
        log(f"mx lookup error: {e!r}")
    return [domain]


def main():
    try:
        data = json.load(sys.stdin)
    except Exception as e:
        log(f"stdin parse error: {e!r}")
        print(json.dumps({"sent": False}))
        return

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

    hosts = mx_hosts(domain)
    log(f"--- send to={to} from={frm} mx={hosts}")

    sent = False
    for host in hosts:
        try:
            s = smtplib.SMTP(host, 25, timeout=20)
            s.ehlo(frm.split("@")[-1])
            s.send_message(msg)
            s.quit()
            sent = True
            log(f"SENT via {host}")
            break
        except Exception as e:
            log(f"FAIL {host}: {e!r}")
            continue

    print(json.dumps({"sent": sent}))


if __name__ == "__main__":
    main()
