# 📮 Gatekeep

**A pay-to-reach toll for your inbox, settled on Monad.**

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
- **Contract address:** _deployed — see `deployments.json`_
- **Tests:** `forge test` — 8/8 passing

## Repo layout

```
contracts/   Foundry project — GatekeepEscrow.sol, tests, deploy script
web/         Next.js frontend + dashboard (wagmi + Para wallet)
PROJET.md    Full product write-up (FR)
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
