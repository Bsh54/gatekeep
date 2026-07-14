# 📋 DNS records — Gatekeep mail (shadrakbessanh.me)

All records go in **Cloudflare → shadrakbessanh.me → DNS → Records**.

---

## 1. DKIM — signs outbound mail (most important for inbox)

| Field | Value |
|-------|-------|
| Type | `TXT` |
| Name | `gk1._domainkey` |
| Content | see below (paste as one line) |

```
v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2Qf3dbufSnzvnhFNytc1gFyN3sELQqBWj/GcYpUWfM8A6JQC0m2AzvMyGsdrTAouhJTY8LHEKZwTgWKiVvIaRPvpohauCT0FkfnXWh1TZCiMdgYF8oe98/A2hmYI5jxwBCBgx5hdkTQbnpnOUjC+nOkjSGl6KzHmXesDaI2IfSQWODBjzTnyXv0GzMt8/Hkfd+fdHb69Qrq2gvdgOW7EzEzlIvJCzZtoGO3KFHkVT0NfzmjJ9gUJ63gsiqAzX+D6N3GzD+iKusgyOmH81ea84GgJDMrb6c4jnVKk9PSMla0gdP5rNQtS6ptyDRk2cbl857udFsHytwJUjbBPNStrZwIDAQAB
```

- Private key lives on the VPS at `/root/.gatekeep-dkim/private.pem` (never commit).
- Selector: `gk1`. Signed by `web/scripts/send_mail.py`.

---

## 2. DMARC — declares the authentication policy

| Field | Value |
|-------|-------|
| Type | `TXT` |
| Name | `_dmarc` |
| Content | `v=DMARC1; p=none; rua=mailto:createurmateux@gmail.com` |

- `p=none` = monitor only (safe, nothing gets rejected). Can tighten to
  `quarantine`/`reject` later once things look good.

---

## 3. SPF — authorizes the VPS to send (ALREADY DONE ✅)

| Field | Value |
|-------|-------|
| Type | `TXT` |
| Name | `@` (root) |
| Content | `v=spf1 ip4:213.156.135.72 include:_spf.mx.cloudflare.net ~all` |

- We added `ip4:213.156.135.72` (the VPS) to the existing Cloudflare SPF.

---

## Do NOT touch
- `cf2024-1._domainkey` — Cloudflare Email Routing's own DKIM (coexists with `gk1`).
- The `route1/2/3.mx.cloudflare.net` MX records — inbound routing.

## Verify after adding
```
dig +short TXT gk1._domainkey.shadrakbessanh.me
dig +short TXT _dmarc.shadrakbessanh.me
dig +short TXT shadrakbessanh.me    # should show the spf line
```
