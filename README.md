# 📮 Gatekeep

**A pay-to-reach toll for your inbox, settled on Monad.**

🔗 **Live:** https://gatekeep.shadrakbessanh.me

Strangers lock a small deposit to message you. Reply and they get it back. Mark it as spam and the deposit funds public goods. Ignore it and, once your response window passes, they can reclaim it. Your inbox only ever shows messages that someone was willing to stand behind.

---

## Why

Sending someone a message costs nothing, so everyone does — and *you* pay for it in time and attention. Gatekeep flips that: an unknown sender puts a refundable deposit on the line, so only people who mean it get through. Spammers never pay, so they vanish.

This model already proved itself once — Earn.com (Balaji Srinivasan) reached hundreds of thousands of users and was acquired by Coinbase for $120M+ — but died because paying in crypto was too clunky. Monad's near-zero fees and instant settlement fix exactly that.

## How it works

1. You sign up and get a dedicated address (e.g. `you@gatekeep.shadrakbessanh.me`) to share in your bio/signature.
2. A stranger emails it. Their message is held; they get an auto-reply with a payment link.
3. They lock a small deposit in the on-chain escrow (`GatekeepEscrow`). Their message is released to you.
4. **You reply** → they're refunded. **You mark spam** → deposit goes to public goods. **Deadline passes** → they reclaim it.

Trusted contacts can be whitelisted to skip the toll entirely.

## On-chain component

`GatekeepEscrow.sol` holds every deposit in a neutral, tamper-proof escrow. The public-goods
destination is **immutable** — not even the deployer can redirect funds to themselves. Every
outcome (refund / donate / reclaim) is a verifiable on-chain transaction.

- **Network:** Monad Testnet (chain id `10143`)
- **Contract address:** [`0x3Ddd8AA67C2E6F773091c490BE5AfbF35dF05335`](https://testnet.monadscan.com/address/0x3Ddd8AA67C2E6F773091c490BE5AfbF35dF05335) (verified)
- **Public-goods address:** `0x4aEbc0bACaC7C7d32D718aE4B76f2b025D9e6B26` (immutable)
- **Relayer:** settles refunds/rejections on the recipient's behalf so replying
  auto-refunds without a wallet signature. It can only ever move funds to the
  original sender (refund) or the immutable public-goods address (reject).
- **Tests:** `forge test` — 10/10 passing

## Repo layout

```
contracts/   Foundry project — GatekeepEscrow.sol, tests, deploy script
web/         Next.js frontend + dashboard (wagmi + Para wallet)
PROJET.md    Full product write-up (FR)
```

## Mail server configuration

Gatekeep receives mail via **Cloudflare Email Routing** and sends replies via
**direct SMTP from the VPS**. To reproduce on your own domain:

### 1. Inbound (receiving) — Cloudflare Email Routing
- Enable Email Routing on the zone (Cloudflare dashboard → Email → Email Routing).
  This adds the MX + SPF + DKIM records automatically. Remove any conflicting MX
  (e.g. a previous ImprovMX setup) first.
- Deploy the Email Worker in `email-worker/`:
  ```bash
  cd email-worker && npm install
  CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler deploy
  echo "$INBOUND_SECRET" | npx wrangler secret put INBOUND_SECRET
  ```
- Add a **catch-all routing rule → the `gatekeep-email` worker** so every
  `*@yourdomain` email is gated. The worker holds the message (POST to
  `/api/inbound`) and auto-replies to the sender with the pay link.

### 2. Outbound (replies) — direct SMTP
Replies are sent from the VPS straight to the recipient's MX (`web/scripts/send_mail.py`).
For Gmail/Outlook to accept them, the sending IP must pass **SPF or DKIM**:
- **SPF (minimum):** add the VPS IP to the domain's SPF TXT record:
  ```
  v=spf1 ip4:<VPS_IP> include:_spf.mx.cloudflare.net ~all
  ```
- **DKIM (recommended, for inbox not spam):** generate a DKIM key, publish the
  public key as a TXT record at `<selector>._domainkey.yourdomain`, and sign
  outbound mail with it. Without DKIM, mail passes SPF but may land in spam.
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
