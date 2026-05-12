"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
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
  const { publicKey, signTransaction, signMessage } = useWallet();
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
      const sdkAny = sdk as Any;
      const { getUmbraClient } = sdk;
      const walletAddress = publicKey?.toBase58();

      if (!walletAddress) {
        throw new Error("Connected wallet address is not available.");
      }

      if (!signTransaction) {
        throw new Error("Connected wallet cannot sign transactions.");
      }

      if (!signMessage) {
        throw new Error("Connected wallet cannot sign messages.");
      }

      const encoder = sdkAny.getTransactionEncoder();
      const decoder = sdkAny.getTransactionDecoder();
      const signUmbraTransaction = async (transaction: Any) => {
        const wireBytes = encoder.encode(transaction);

        try {
          const versionedTx = VersionedTransaction.deserialize(wireBytes);
          const signedTx = await signTransaction(versionedTx);
          return decoder.decode(signedTx.serialize());
        } catch {
          const legacyTx = Transaction.from(wireBytes);
          const signedTx = await signTransaction(legacyTx);
          return decoder.decode(
            signedTx.serialize({ requireAllSignatures: false, verifySignatures: false })
          );
        }
      };

      const signer = {
        address: walletAddress as Any,
        signTransaction: signUmbraTransaction,
        signTransactions: async (transactions: readonly Any[]) => {
          const signedTransactions: Any[] = [];
          for (const transaction of transactions) {
            signedTransactions.push(await signUmbraTransaction(transaction));
          }
          return signedTransactions;
        },
        signMessage: async (message: Uint8Array) => {
          const signature = await signMessage(message);
          return {
            message,
            signature,
            signer: walletAddress,
          };
        },
      } as Any;

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
  }, [publicKey, signTransaction, signMessage]);

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
