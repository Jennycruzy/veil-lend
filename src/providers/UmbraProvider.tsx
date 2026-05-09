"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
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
  withdraw: (mint: string, amount: bigint) => Promise<Any>;
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
  const { publicKey } = useWallet();
  const [status, setStatus] = useState<UmbraStatus>("disconnected");
  const [umbraAddress, setUmbraAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<Any>(null);
  const initializingRef = useRef(false);

  // Initialize + register on wallet connect
  useEffect(() => {
    if (publicKey && !clientRef.current && !initializingRef.current) {
      initAndRegister();
    }
    if (!publicKey) {
      clientRef.current = null;
      initializingRef.current = false;
      setStatus("disconnected");
      setUmbraAddress(null);
    }
  }, [publicKey]);

  const initAndRegister = async () => {
    initializingRef.current = true;
    setStatus("connecting");
    setError(null);

    try {
      const sdk = await import("@umbra-privacy/sdk");
      const { createInMemorySigner, getUmbraClient } = sdk;

      const signer = await createInMemorySigner();

      const client = await getUmbraClient({
        signer,
        network: "devnet" as Any,
        rpcUrl: UMBRA_RPC_URL as Any,
        rpcSubscriptionsUrl: UMBRA_RPC_WS_URL as Any,
        indexerApiEndpoint: UMBRA_INDEXER_URL,
      });

      clientRef.current = client;
      setUmbraAddress(String(signer.address));
      setStatus("connected");

      // Auto-register
      setStatus("registering");
      const { getUserRegistrationFunction } = sdk;
      const registerFn = getUserRegistrationFunction({ client });
      await registerFn({ confidential: true, anonymous: true });
      setStatus("registered");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // If registration fails (e.g. no SOL), still keep connected status
      if (clientRef.current) {
        setStatus("connected");
        setError(`Registration pending: ${msg}`);
      } else {
        setStatus("error");
        setError(msg);
        initializingRef.current = false;
      }
    }
  };

  const register = useCallback(async () => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");
    setStatus("registering");
    const sdk = await import("@umbra-privacy/sdk");
    const { getUserRegistrationFunction } = sdk;
    const registerFn = getUserRegistrationFunction({ client });
    const sigs = await registerFn({ confidential: true, anonymous: true });
    setStatus("registered");
    return sigs;
  }, []);

  const deposit = useCallback(async (mint: string, amount: bigint) => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");
    const sdk = await import("@umbra-privacy/sdk");
    const { getPublicBalanceToEncryptedBalanceDirectDepositorFunction } = sdk;
    const depositFn = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
    return depositFn(client.signer.address, mint as Any, amount as Any);
  }, []);

  const withdraw = useCallback(async (mint: string, amount: bigint) => {
    const client = clientRef.current;
    if (!client) throw new Error("Umbra client not initialized");
    const sdk = await import("@umbra-privacy/sdk");
    const { getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction } = sdk;
    const withdrawFn = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
    return (withdrawFn as Any)(client.signer.address, mint, amount);
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
    return fetchUtxos(BigInt(0) as Any, BigInt(0) as Any);
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
