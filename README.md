# SaveWise

**Smart Savings Made Simple** — a React Native (Expo) mobile app that helps ASEAN users save money effortlessly through QR-based round-up micro-savings, backed by the Stellar blockchain via Soroban smart contracts.

## 🔗 Live Links

- **App Demo (APK)**: _https://expo.dev/accounts/tonelico/projects/savewise/builds/e1f80d46-00d4-471c-b3a9-8dccb09eafaa_
- **Demo Video**: _https://youtu.be/KAHHFsGdv1o_
- **Pitch Deck**: _https://canva.link/lp4oolxxmr15vxz_

## ⛓️ Blockchain

- **Network**: Stellar Testnet
- **Smart Contract (Soroban)**: `CBU3EVA63V5XMVDEVKE473JAAQLBOEF7J2UQSNMAPP5Q2YP2SNKCOUOO`
- **Contract functions**: `deposit_savings`, `withdraw_savings`, `get_savings_balance`
- View it on [Stellar Expert (Testnet)](https://stellar.expert/explorer/testnet/contract/CBU3EVA63V5XMVDEVKE473JAAQLBOEF7J2UQSNMAPP5Q2YP2SNKCOUOO)

## What It Does

Users scan a merchant's QR code after a purchase. SaveWise rounds the amount up to the nearest RM0.50, and the round-up difference is automatically deposited into the user's personal Stellar savings vault — a real, on-chain transaction, not a simulation.

### Core Features
- ✅ Round-up savings via QR code scanning
- ✅ Savings goals with progress tracking and auto-completion
- ✅ Real Stellar wallet auto-created per user (no manual wallet setup needed)
- ✅ On-chain deposits/withdrawals via a deployed Soroban smart contract
- ✅ Manual top-ups, withdrawals and fund transfers between goals
- ✅ Spending analytics and transaction history
- ✅ 6-digit passcode app lock + full authentication flow
- ✅ In-app notifications for savings activity

## Tech Stack

**Frontend**
- React Native (Expo), TypeScript
- NativeWind, Tailwind CSS for
- React Navigation, React Query, React Hook Form + Zod

**Backend**
- Supabase (PostgreSQL, Auth, Row-Level Security)

**Blockchain**
- Stellar Testnet + Soroban smart contracts (Rust)
- `@stellar/stellar-sdk` for client-side contract interaction

## Running Locally

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android/iOS), or press `a`/`w` for Android emulator/web.

You'll need a `.env` file with:
```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Built For

Stellar Hackathon 2026 — targeting ASEAN users seeking accessible, low-friction ways to build savings habits using blockchain-backed transparency.
