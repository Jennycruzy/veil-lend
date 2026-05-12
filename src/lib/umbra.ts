"use client";

/**
 * VeilLend Umbra SDK Integration
 *
 * ALL functions below use ONLY the verified official Umbra quickstart patterns from:
 * https://sdk.umbraprivacy.com/quickstart
 *
 * Packages: @umbra-privacy/sdk + @umbra-privacy/web-zk-prover
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  UMBRA_RPC_URL,
  UMBRA_RPC_WS_URL,
  UMBRA_INDEXER_URL,
  UMBRA_RELAYER_URL,
} from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type UmbraStatus = "disconnected" | "connecting" | "connected" | "registered" | "error";

export interface UmbraState {
  status: UmbraStatus;
  client: Any | null;
  error: string | null;
  umbraAddress: string | null;
}

/**
 * useUmbra — custom hook wrapping every verified Umbra quickstart function.
 *
 * Uses `any` casts for SDK branded types (Address, U64, U32) since we pass
 * correct runtime values matching the official quickstart exactly.
 */
export function useUmbra(walletPublicKey?: string | null) {
  const { publicKey, wallet } = useWallet();
  const [state, setState] = useState<UmbraState>({
    status: "disconnected",
    client: null,
    error: null,
    umbraAddress: null,
  });
  const clientRef = useRef<Any>(null);
  const initializingRef = useRef(false);

  // Step 2 + 3: Create signer + Umbra client
  const initialize = useCallback(async () => {
    if (initializingRef.current || clientRef.current) return;
    initializingRef.current = true;
    setState((s) => ({ ...s, status: "connecting", error: null }));

    try {
      const sdk = await import("@umbra-privacy/sdk");
      const { createInMemorySigner, createSignerFromWalletAccount, getUmbraClient } = sdk;

      const standardWallet = (wallet?.adapter as Any)?.wallet;
      const walletAddress = publicKey?.toBase58() ?? walletPublicKey;
      const account = standardWallet?.accounts?.find(
        (candidate: Any) => candidate.address === walletAddress
      );
      const signer =
        standardWallet && account
          ? createSignerFromWalletAccount(standardWallet, account)
          : await createInMemorySigner();

      const client = await getUmbraClient({
        signer,
        network: "devnet" as Any,
        rpcUrl: UMBRA_RPC_URL as Any,
        rpcSubscriptionsUrl: UMBRA_RPC_WS_URL as Any,
        indexerApiEndpoint: UMBRA_INDEXER_URL,
      });

      clientRef.current = client;
      const umbraAddress = String(signer.address);
      setState({ status: "connected", client, error: null, umbraAddress });
      return client;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error initializing Umbra";
      setState({ status: "error", client: null, error: msg, umbraAddress: null });
      initializingRef.current = false;
      throw err;
    }
  }, [publicKey, wallet, walletPublicKey]);

  // Step 4: Register account (confidential + anonymous)
  const register = useCallback(async () => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");

    const sdk = await import("@umbra-privacy/sdk");
    const proverMod = await import("@umbra-privacy/web-zk-prover");
    const { getUserRegistrationFunction } = sdk;
    const { getUserRegistrationProver } = proverMod;
    const zkProver = getUserRegistrationProver();
    const registerFn = getUserRegistrationFunction({ client }, { zkProver });
    const signatures = await registerFn({
      confidential: true,
      anonymous: true,
    });
    setState((s) => ({ ...s, status: "registered" }));
    return signatures;
  }, []);

  // Step 5: Deposit tokens (public balance -> encrypted balance)
  const deposit = useCallback(async (mint: string, amount: bigint) => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");

    const sdk = await import("@umbra-privacy/sdk");
    const { getPublicBalanceToEncryptedBalanceDirectDepositorFunction } = sdk;
    const depositFn = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
    return depositFn(client.signer.address, mint as Any, amount as Any);
  }, []);

  // Step 6: Withdraw tokens (encrypted balance -> public balance)
  const withdraw = useCallback(async (destinationAddress: string, mint: string, amount: bigint) => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");

    const sdk = await import("@umbra-privacy/sdk");
    const { getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction } = sdk;
    const withdrawFn = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
    return withdrawFn(destinationAddress as Any, mint as Any, amount as Any);
  }, []);

  // Step 7: Create receiver-claimable UTXO (private payment)
  const createUtxo = useCallback(
    async (destinationAddress: string, mint: string, amount: bigint) => {
      const client = clientRef.current;
      if (!client) throw new Error("Umbra client not initialized");

      const sdk = await import("@umbra-privacy/sdk");
      const proverMod = await import("@umbra-privacy/web-zk-prover");
      const { getPublicBalanceToReceiverClaimableUtxoCreatorFunction } = sdk;
      const { getCreateReceiverClaimableUtxoFromPublicBalanceProver } = proverMod;

      const zkProver = getCreateReceiverClaimableUtxoFromPublicBalanceProver();
      const createUtxoFn = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
        { client },
        { zkProver } as Any
      );
      return createUtxoFn({
        destinationAddress: destinationAddress as Any,
        mint: mint as Any,
        amount: amount as Any,
      });
    },
    []
  );

  // Step 8: Scan for claimable UTXOs
  const scanUtxos = useCallback(async () => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");

    const sdk = await import("@umbra-privacy/sdk");
    const { getClaimableUtxoScannerFunction } = sdk;
    const fetchUtxos = getClaimableUtxoScannerFunction({ client });
    return fetchUtxos(0 as Any, 0 as Any);
  }, []);

  // Step 9: Claim UTXO into encrypted balance (with relayer for gasless)
  const claimUtxo = useCallback(async (utxos: Any[]) => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");

    const sdk = await import("@umbra-privacy/sdk");
    const proverMod = await import("@umbra-privacy/web-zk-prover");
    const {
      getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction,
      getUmbraRelayer,
    } = sdk;
    const { getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver } = proverMod;

    const zkProver = getClaimReceiverClaimableUtxoIntoEncryptedBalanceProver();
    const relayer = getUmbraRelayer({ apiEndpoint: UMBRA_RELAYER_URL });
    const claimFn = getReceiverClaimableUtxoToEncryptedBalanceClaimerFunction(
      { client },
      { zkProver, relayer } as Any
    );
    return claimFn(utxos);
  }, []);

  // Auto-initialize and register when wallet connects
  useEffect(() => {
    if (walletPublicKey && !clientRef.current) {
      initialize().then(() => {
        // Auto-register after initialization
        return register();
      }).catch(() => {
        // Registration may fail if already registered — that's fine
      });
    }
  }, [walletPublicKey, initialize, register]);

  return {
    ...state,
    initialize,
    register,
    deposit,
    withdraw,
    createUtxo,
    scanUtxos,
    claimUtxo,
  };
}
