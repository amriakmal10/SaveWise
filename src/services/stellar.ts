import {
  Keypair,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Address,
  nativeToScVal,
  scValToNative,
  rpc as SorobanRpc,
} from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------
// Network config — testnet for the hackathon build
// ---------------------------------------------------------------------
export const STELLAR_NETWORK = "TESTNET";
export const STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";

// Deployed SaveWise savings vault contract (see Soroban Studio deploy)
export const SAVINGS_VAULT_CONTRACT_ID =
  "CBU3EVA63V5XMVDEVKE473JAAQLBOEF7J2UQSNMAPP5Q2YP2SNKCOUOO";

const server = new SorobanRpc.Server(SOROBAN_RPC_URL);

// ---------------------------------------------------------------------
// Wallet generation
// ---------------------------------------------------------------------
export type GeneratedWallet = {
  publicKey: string;
  secretKey: string;
};


export function generateWallet(): GeneratedWallet {
  const keypair = Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}


export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const response = await fetch(`${FRIENDBOT_URL}/?addr=${encodeURIComponent(publicKey)}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Friendbot funding failed: ${body}`);
  }
}

// ---------------------------------------------------------------------
// Contract interaction
// ---------------------------------------------------------------------
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


async function invokeContract(
  secretKey: string,
  functionName: string,
  args: any[]
): Promise<string> {
  const sourceKeypair = Keypair.fromSecret(secretKey);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
  const contract = new Contract(SAVINGS_VAULT_CONTRACT_ID);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);
  preparedTx.sign(sourceKeypair);

  const sendResponse = await server.sendTransaction(preparedTx);

  if (sendResponse.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${JSON.stringify(sendResponse.errorResult)}`);
  }

  // Poll until the transaction is actually confirmed (or fails/times out)
  let getResponse = await server.getTransaction(sendResponse.hash);
  let attempts = 0;
  while (getResponse.status === "NOT_FOUND" && attempts < 15) {
    await sleep(1000);
    getResponse = await server.getTransaction(sendResponse.hash);
    attempts++;
  }

  if (getResponse.status !== "SUCCESS") {
    throw new Error(`Transaction did not succeed: ${getResponse.status}`);
  }

  return sendResponse.hash;
}

/**
 * Deposits `amountCents` (an integer — RM converted to cents, since the
 * contract has no real currency conversion) into the user's on-chain
 * savings balance. Returns the transaction hash once confirmed.
 */
export async function depositSavings(
  secretKey: string,
  publicKey: string,
  amountCents: number
): Promise<string> {
  const userAddress = Address.fromString(publicKey).toScVal();
  const amountScVal = nativeToScVal(amountCents, { type: "i128" });
  return invokeContract(secretKey, "deposit_savings", [userAddress, amountScVal]);
}

/**
 * Withdraws `amountCents` from the user's on-chain savings balance.
 */
export async function withdrawSavings(
  secretKey: string,
  publicKey: string,
  amountCents: number
): Promise<string> {
  const userAddress = Address.fromString(publicKey).toScVal();
  const amountScVal = nativeToScVal(amountCents, { type: "i128" });
  return invokeContract(secretKey, "withdraw_savings", [userAddress, amountScVal]);
}

/**
 * Reads the user's current on-chain balance (in cents) via simulation —
 * no signature or fee needed since this doesn't change state.
 */
export async function getOnChainBalance(publicKey: string): Promise<number> {
  const contract = new Contract(SAVINGS_VAULT_CONTRACT_ID);
  const userAddress = Address.fromString(publicKey).toScVal();

  // A throwaway source account is fine for simulation-only reads — any
  // funded testnet account works since we're not submitting/signing.
  const sourceAccount = await server.getAccount(publicKey);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_savings_balance", userAddress))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if ("result" in simResult && simResult.result?.retval) {
    return Number(scValToNative(simResult.result.retval));
  }
  return 0;
}