"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  UMBRA_RPC_URL,
  UMBRA_RPC_WS_URL,
  UMBRA_INDEXER_URL,
  UMBRA_RELAYER_URL,
} from "@/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type UmbraStatus = "disconnected" | "connecting" | "connected" | "registering" | "registered" | "error";

interface UmbraContextValue {
  status: UmbraStatus;
  umbraAddress: string | null;
  error: string | null;
  register: () => Promise<Any>;
  deposit: (mint: string, amount: bigint) => Promise<Any>;
  withdraw: (destinationAddress: string, mint: string, amount: bigint) => Promise<Any>;
  createUtxo: (destinationAddress: string, mint: string, amount: bigint) => Promise<Any>;
  scanUtxos: () => Promise<Any>;
  claimUtxo: (utxos: Any[]) => Promise<Any>;
}

const UmbraContext = createContext<UmbraContextValue | null>(null);

export function useUmbraContext() {
  const ctx = useContext(UmbraContext);
  if (!ctx) throw new Error("useUmbraContext must be used within UmbraProvider");
  return ctx;
}

export function UmbraProvider({ children }: { children: ReactNode }) {
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();
  const [status, setStatus] = useState<UmbraStatus>("disconnected");
  const [umbraAddress, setUmbraAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Any>(null);
  const initializingRef = useRef(false);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, label: string, ms = 30000) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`${label} timed out after ${ms / 1000}s`));
          }, ms);
        }),
      ]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  const initAndRegister = useCallback(async () => {
    initializingRef.current = true;
    setStatus("connecting");
    setError(null);

    try {
      const sdk = await import("@umbra-privacy/sdk");
      const { getUmbraClient, createSignerFromWalletAccount } = sdk;
      const walletAddress = publicKey?.toBase58();

      if (!walletAddress) {
        throw new Error("Connected wallet address is not available.");
      }

      const standardWallet = (wallet?.adapter as Any)?.wallet as Any | undefined;
      if (!standardWallet) {
        throw new Error("Connected wallet does not expose Wallet Standard accounts.");
      }

      const account =
        standardWallet.accounts?.find((candidate: Any) => candidate.address === walletAddress) ??
        standardWallet.accounts?.[0];

      if (!account) {
        throw new Error("Connected wallet does not expose an authorized account.");
      }

      const signer = createSignerFromWalletAccount(standardWallet, account);

      const client = await withTimeout(
        getUmbraClient({
          signer,
          network: "devnet" as Any,
          rpcUrl: UMBRA_RPC_URL as Any,
          rpcSubscriptionsUrl: UMBRA_RPC_WS_URL as Any,
          indexerApiEndpoint: UMBRA_INDEXER_URL,
        }),
        "Umbra client initialization"
      );

      clientRef.current = client;
      setUmbraAddress(String(signer.address));
      setStatus("connected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      clientRef.current = null;
      setStatus("error");
      setError(msg);
      initializingRef.current = false;
    }
  }, [publicKey, wallet]);

  // Initialize the client on wallet connect.
  useEffect(() => {
    if (publicKey && !clientRef.current && !initializingRef.current) {
      void initAndRegister();
    }

    if (!publicKey && clientRef.current) {
      queueMicrotask(() => {
        clientRef.current = null;
        initializingRef.current = false;
        setStatus("disconnected");
        setUmbraAddress(null);
        setError(null);
      });
    }
  }, [publicKey, initAndRegister]);

  const register = useCallback(async () => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");
    if (!publicKey) throw new Error("Wallet not connected");

    const solBalance = await connection.getBalance(publicKey);
    if (solBalance < 5_000_000) {
      throw new Error("Umbra registration needs a small amount of devnet SOL for fees.");
    }

    setStatus("registering");
    try {
      const sdk = await import("@umbra-privacy/sdk");
      const proverMod = await import("@umbra-privacy/web-zk-prover");
      const { getUserRegistrationFunction } = sdk;
      const { getUserRegistrationProver } = proverMod;
      const zkProver = getUserRegistrationProver();
      const registerFn = getUserRegistrationFunction({ client }, { zkProver });
      const sigs = await registerFn({ confidential: true, anonymous: true });
      setStatus("registered");
      return sigs;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus("connected");
      setError(msg);
      throw err;
    }
  }, [connection, publicKey]);

  const deposit = useCallback(async (mint: string, amount: bigint) => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");
    const sdk = await import("@umbra-privacy/sdk");
    const { getPublicBalanceToEncryptedBalanceDirectDepositorFunction } = sdk;
    const depositFn = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
    return depositFn(client.signer.address, mint as Any, amount as Any);
  }, []);

  const withdraw = useCallback(async (destinationAddress: string, mint: string, amount: bigint) => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");
    const sdk = await import("@umbra-privacy/sdk");
    const { getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction } = sdk;
    const withdrawFn = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
    return withdrawFn(destinationAddress as Any, mint as Any, amount as Any);
  }, []);

  const createUtxo = useCallback(async (destinationAddress: string, mint: string, amount: bigint) => {
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
  }, []);

  const scanUtxos = useCallback(async () => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");
    const sdk = await import("@umbra-privacy/sdk");
    const { getClaimableUtxoScannerFunction } = sdk;
    const fetchUtxos = getClaimableUtxoScannerFunction({ client });
    return fetchUtxos(0 as Any, 0 as Any);
  }, []);

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

  return (
    <UmbraContext.Provider
      value={{ status, umbraAddress, error, register, deposit, withdraw, createUtxo, scanUtxos, claimUtxo }}
    >
      {children}
    </UmbraContext.Provider>
  );
}
