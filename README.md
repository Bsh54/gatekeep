# 📮 Gatekeep

**A pay-to-reach toll for your inbox, settled on Monad.**

🔗 **Live:** https://gatekeep.shadrakbessanh.me

Strangers lock a small refundable deposit to email you. Reply and they get it
back automatically. Mark it as spam and the deposit funds public goods. Your
inbox only ever shows messages that someone was willing to stand behind — and
you never touch crypto to run it.

---

## Why

Sending someone a message costs nothing, so everyone does — and *you* pay for it
in time and attention. Gatekeep flips that: an unknown sender puts a refundable
deposit on the line, so only people who mean it get through. Spammers never pay,
so they vanish.

This model already proved itself once — Earn.com (Balaji Srinivasan) reached
hundreds of thousands of users and was acquired by Coinbase for $120M+ — but died
because paying in crypto was too clunky. Monad's near-zero fees and instant
settlement fix exactly that.

## How it works

1. **Sign up** with email or Google (Para embedded wallet — no seed phrase, no
   crypto knowledge) and claim a dedicated address, e.g.
   `you@gatekeep.shadrakbessanh.me`. Drop it in your bio or signature.
2. **A stranger emails it.** The message is held; they get an auto-reply with a
   payment link. Nothing reaches you yet, and you get no noise.
3. **They lock a small deposit** (0.5 MON) in the on-chain escrow
   (`GatekeepEscrow`). Their message is released into your dashboard inbox and you
   get an email alert at your real address.
4. **You reply** in a normal chat-style thread → they're refunded automatically.
   **You mark spam** → the deposit goes to public goods. All settlement is done
   for you by a relayer, so **you never pay gas or sign anything**.

Trusted senders can be **whitelisted** to skip the toll entirely (their future
emails land straight in your inbox, for free) — and blacklisted again anytime.

## What you get

- **Gmail-style dashboard** — a clean inbox with read/unread indicators and
  continuous conversation threads (their messages + your replies, grouped per
  sender). No crypto jargon anywhere in the recipient experience.
- **Gasless for the recipient** — replies (refund) and spam (donate) are settled
  by a server-side relayer. The person running Gatekeep never needs MON.
- **Whitelist / blacklist** — trusted senders reach you for free; manage them from
  any conversation or from Settings.
- **Email alerts** — get notified at your real email the moment a paid message
  arrives.
- **Settings** — metrics (received, didn't pay, MON sent to public goods), edit
  your alert email, manage trusted senders.
- **Sender receipts** — a lightweight page (`/pay/receipts`) where anyone who paid
  can see their balance, still-locked deposits and refunds, each verifiable
  on-chain.

## On-chain component

`GatekeepEscrow.sol` holds every deposit in a neutral, tamper-proof escrow. The
public-goods destination is **immutable** — not even the deployer can redirect
funds. Every outcome (refund / donate) is a verifiable on-chain transaction.

- **Network:** Monad Testnet (chain id `10143`)
- **Contract:** [`0x3Ddd8AA67C2E6F773091c490BE5AfbF35dF05335`](https://testnet.monadscan.com/address/0x3Ddd8AA67C2E6F773091c490BE5AfbF35dF05335) (verified)
- **Public-goods address:** `0x4aEbc0bACaC7C7d32D718aE4B76f2b025D9e6B26` (immutable)
- **Relayer:** settles refunds/rejections on the recipient's behalf so replying
  auto-refunds without a wallet signature. It can only ever move funds to the
  original sender (refund) or the immutable public-goods address (reject).
- **Tests:** `forge test` — 10/10 passing

## Repo layout

```
contracts/     Foundry project — GatekeepEscrow.sol, tests, deploy script
web/           Next.js app — landing, dashboard inbox, pay page, API routes
email-worker/  Cloudflare Email Worker that gates inbound mail
```

> Internal/infra docs (DNS records, relayer address, product write-up) are kept
> local and intentionally excluded from this repo.

## Architecture at a glance

```
Stranger ──email──▶ Cloudflare Email Routing (catch-all)
                          │
                          ▼
                  Email Worker (email-worker/)
                          │  POST /api/inbound
                          ▼
   web/  ── holds message (JSON store) ── returns pay link ──▶ worker auto-replies
                          │
        stranger pays 0.5 MON on GatekeepEscrow (pay page)
                          │  POST /api/messages/[id]/deliver
                          ▼
        message appears in the recipient's dashboard inbox
                          │
     recipient replies ──▶ /api/reply ── relayer refunds + direct-SMTP email (DKIM)
     recipient spams  ──▶ /api/spam  ── relayer donates to public goods
```

## Mail server configuration

Gatekeep receives mail via **Cloudflare Email Routing** and sends replies +
alerts via **direct SMTP from the VPS** (DKIM-signed). To reproduce on your own
domain:

### 1. Inbound (receiving) — Cloudflare Email Routing + Worker
- Enable Email Routing on the zone (Cloudflare → Email → Email Routing). This
  adds the MX + SPF + Cloudflare DKIM records automatically. Remove any
  conflicting MX (e.g. a previous ImprovMX setup) first.
- Deploy the Worker in `email-worker/` and add a **catch-all routing rule → the
  worker**, so every `*@yourdomain` email is gated:
  ```bash
  cd email-worker && npm install
  CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler deploy
  echo "$INBOUND_SECRET" | npx wrangler secret put INBOUND_SECRET
  ```
- The worker `POST`s each email to `/api/inbound` (authenticated with
  `INBOUND_SECRET`). The app:
  - **Unknown sender** → holds the message and returns a pay link the worker
    auto-replies with (in-thread, `In-Reply-To`/`References`).
  - **Whitelisted sender** → delivers the message straight to the inbox, returns
    no pay link, and the worker stays silent (no toll).
  Quoted replies, forwarded headers and signatures are stripped so threads stay
  clean.

### 2. Outbound (replies + alerts) — direct SMTP
Replies and alert emails are sent from the VPS straight to the recipient's MX
(`web/scripts/send_mail.py`). For Gmail/Outlook to accept them, the sending IP
must pass authentication:
- **SPF:** add the VPS IP to the domain's SPF TXT record:
  ```
  v=spf1 ip4:<VPS_IP> include:_spf.mx.cloudflare.net ~all
  ```
- **DKIM:** generate a key, publish the public key as a TXT record at
  `<selector>._domainkey.yourdomain`, and sign outbound mail with it
  (`dkimpy`, selector `gk1`). Without DKIM, mail passes SPF but may land in spam.
- **DMARC:** a `_dmarc` TXT record (`p=none` to start) ties it together.
- **STARTTLS:** the sender negotiates TLS so the mail is encrypted in transit.
- The VPS also needs outbound **port 25** open.

### 3. Environment (`web/.env.local`)
```
NEXT_PUBLIC_PARA_API_KEY=...
NEXT_PUBLIC_ESCROW_ADDRESS=0x3Ddd8AA67C2E6F773091c490BE5AfbF35dF05335
INBOUND_SECRET=...            # shared secret between the worker and /api/inbound
RELAYER_PRIVATE_KEY=0x...     # relayer key that settles refunds/rejections
```

## Run it

```bash
# Contracts
cd contracts
forge build
forge test -vv

# Frontend
cd ../web
npm install
npm run dev
```

## Status

Built from scratch for the BuildAnything "Spark" hackathon. Solo project.
