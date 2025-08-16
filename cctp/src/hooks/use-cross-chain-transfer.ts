"use client";

import { useState } from "react";
import {
  createWalletClient,
  http,
  encodeFunctionData,
  HttpTransport,
  type Chain,
  type Account,
  type WalletClient,
  type Hex,
  TransactionExecutionError,
  parseUnits,
  createPublicClient,
  formatUnits,
  parseEther,
} from "viem";
import { privateKeyToAccount,nonceManager } from "viem/accounts";
import axios from "axios";
import {
  sepolia,
  avalancheFuji,
  baseSepolia,
  sonicBlazeTestnet,
  lineaSepolia,
  arbitrumSepolia,
  worldchainSepolia,
  optimismSepolia,
  unichainSepolia,
  polygonAmoy,
  seiTestnet,
} from "viem/chains";
import { defineChain } from "viem";
// Solana imports
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";
import bs58 from "bs58";
import { hexlify } from "ethers";
// Import BN at top level like Circle's examples
import { BN, AnchorProvider } from "@coral-xyz/anchor";
import {
  SupportedChainId,
  CHAIN_IDS_TO_USDC_ADDRESSES,
  CHAIN_IDS_TO_TOKEN_MESSENGER,
  CHAIN_IDS_TO_MESSAGE_TRANSMITTER,
  DESTINATION_DOMAINS,
  CHAIN_TO_CHAIN_NAME,
  SOLANA_RPC_ENDPOINT,
  IRIS_API_URL,
} from "@/lib/chains";
import { getBytes } from "ethers";
import { SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAccount, useWalletClient } from "wagmi";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

// Custom Codex chain definition with Thirdweb RPC
const codexTestnet = defineChain({
  id: 812242,
  name: "Codex Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Codex",
    symbol: "CDX",
  },
  rpcUrls: {
    default: {
      http: ["https://812242.rpc.thirdweb.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Codex Explorer",
      url: "https://explorer.codex-stg.xyz/",
    },
  },
  testnet: true,
});

export type TransferStep =
  | "idle"
  | "approving"
  | "burning"
  | "waiting-attestation"
  | "minting"
  | "completed"
  | "error";

const chains = {
  [SupportedChainId.ETH_SEPOLIA]: sepolia,
  [SupportedChainId.AVAX_FUJI]: avalancheFuji,
  [SupportedChainId.BASE_SEPOLIA]: baseSepolia,
  [SupportedChainId.SONIC_BLAZE]: sonicBlazeTestnet,
  [SupportedChainId.LINEA_SEPOLIA]: lineaSepolia,
  [SupportedChainId.ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [SupportedChainId.WORLDCHAIN_SEPOLIA]: worldchainSepolia,
  [SupportedChainId.OPTIMISM_SEPOLIA]: optimismSepolia,
  [SupportedChainId.CODEX_TESTNET]: codexTestnet,
  [SupportedChainId.UNICHAIN_SEPOLIA]: unichainSepolia,
  [SupportedChainId.POLYGON_AMOY]: polygonAmoy,
  [SupportedChainId.SEI_TESTNET]: seiTestnet,
};

// Solana RPC endpoint imported from chains.ts

export function useCrossChainTransfer() {
  const [currentStep, setCurrentStep] = useState<TransferStep>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Solana wallet adapter hooks
  const {
    publicKey: solanaPublicKey,
    connected: isSolanaConnected,
    wallet,
  } = useWallet();
  const { connection: solanaConnection } = useConnection();

  const DEFAULT_DECIMALS = 6;

  const addLog = (message: string) =>
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ]);

  // Utility function to check if a chain is Solana
  const isSolanaChain = (chainId: number): boolean => {
    return chainId === SupportedChainId.SOLANA_DEVNET;
  };

  // Solana connection
  const getSolanaConnection = (): Connection => {
    return new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
  };

  const getPublicClient = (chainId: SupportedChainId) => {
    if (isSolanaChain(chainId)) {
      return getSolanaConnection();
    }
    return createPublicClient({
      chain: chains[chainId as keyof typeof chains],
      transport: http(),
    });
  };

  const getClients = (chainId: SupportedChainId) => {
    if (isSolanaChain(chainId)) {
      if (!isSolanaConnected || !solanaPublicKey || !wallet) {
        throw new Error("Solana wallet not connected");
      }
      return wallet.adapter;
    }
    if (!isEvmConnected || !walletClient) {
      throw new Error("EVM wallet not connected");
    }
    return walletClient;
  };

  const getBalance = async (chainId: SupportedChainId) => {
    if (isSolanaChain(chainId)) {
      return getSolanaBalance(chainId);
    }
    return getEVMBalance(chainId);
  };

  const getSolanaBalance = async (chainId: SupportedChainId) => {
    if (!isSolanaConnected || !solanaPublicKey) return "0";
    const connection = getSolanaConnection();

    const usdcMint = new PublicKey(
      CHAIN_IDS_TO_USDC_ADDRESSES[chainId] as string,
    );

    try {
      const associatedTokenAddress = await getAssociatedTokenAddress(
        usdcMint,
        solanaPublicKey,
      );

      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      const balance =
        Number(tokenAccount.amount) / Math.pow(10, DEFAULT_DECIMALS);
      return balance.toString();
    } catch (error) {
      if (
        error instanceof TokenAccountNotFoundError ||
        error instanceof TokenInvalidAccountOwnerError
      ) {
        return "0";
      }
      throw error;
    }
  };

  const getEVMBalance = async (chainId: SupportedChainId) => {
    const publicClient = createPublicClient({
      chain: chains[chainId as keyof typeof chains],
      transport: http(),
    });
    if (!isEvmConnected || !evmAddress) return "0";

    const balance = await publicClient.readContract({
      address: CHAIN_IDS_TO_USDC_ADDRESSES[chainId] as `0x${string}`,
      abi: [
        {
          constant: true,
          inputs: [{ name: "_owner", type: "address" }],
          name: "balanceOf",
          outputs: [{ name: "balance", type: "uint256" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [evmAddress],
    });

    const formattedBalance = formatUnits(balance, DEFAULT_DECIMALS);
    return formattedBalance;
  };

  // EVM functions (existing)
  const approveUSDC = async (
    client: WalletClient<HttpTransport, Chain, Account>,
    sourceChainId: number,
  ) => {
    setCurrentStep("approving");
    addLog("Approving USDC transfer...");

    try {
      const tx = await client.sendTransaction({
        to: CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId] as `0x${string}`,
        data: encodeFunctionData({
          abi: [
            {
              type: "function",
              name: "approve",
              stateMutability: "nonpayable",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
            },
          ],
          functionName: "approve",
          args: [
            CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`,
            10000000000n,
          ],
        }),
      });

      addLog(`USDC Approval Tx: ${tx}`);
      return tx;
    } catch (err) {
      setError("Approval failed");
      throw err;
    }
  };

  // Solana approve function (Note: SPL tokens don't require explicit approval like ERC20)
  const approveSolanaUSDC = async (
    wallet: any,
    sourceChainId: number,
  ) => {
    setCurrentStep("approving");
    // For SPL tokens, we don't need explicit approval like ERC20
    // The burn transaction will handle the token transfer authorization
    return "solana-approve-placeholder";
  };

  const burnUSDC = async (
    client: WalletClient<HttpTransport, Chain, Account>,
    sourceChainId: number,
    amount: bigint,
    destinationChainId: number,
    destinationAddress: string,
    transferType: "fast" | "standard",
  ) => {
    setCurrentStep("burning");
    addLog("Burning USDC...");

    try {
      const finalityThreshold = transferType === "fast" ? 1000 : 2000;
      const maxFee = amount - 1n;

      // Handle Solana destination addresses differently
      let mintRecipient: string;
      if (isSolanaChain(destinationChainId)) {
        // For Solana destinations, use the Solana token account as mintRecipient
        // Get the associated token account for the destination wallet
        const usdcMint = new PublicKey(
          CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.SOLANA_DEVNET] as string,
        );
        const destinationWallet = new PublicKey(destinationAddress);
        const tokenAccount = await getAssociatedTokenAddress(
          usdcMint,
          destinationWallet,
        );
        mintRecipient = hexlify(bs58.decode(tokenAccount.toBase58()));
      } else {
        // For EVM destinations, pad the hex address
        mintRecipient = `0x${destinationAddress
          .replace(/^0x/, "")
          .padStart(64, "0")}`;
      }

      const tx = await client.sendTransaction({
        to: CHAIN_IDS_TO_TOKEN_MESSENGER[sourceChainId] as `0x${string}`,
        data: encodeFunctionData({
          abi: [
            {
              type: "function",
              name: "depositForBurn",
              stateMutability: "nonpayable",
              inputs: [
                { name: "amount", type: "uint256" },
                { name: "destinationDomain", type: "uint32" },
                { name: "mintRecipient", type: "bytes32" },
                { name: "burnToken", type: "address" },
                { name: "hookData", type: "bytes32" },
                { name: "maxFee", type: "uint256" },
                { name: "finalityThreshold", type: "uint32" },
              ],
              outputs: [],
            },
          ],
          functionName: "depositForBurn",
          args: [
            amount,
            DESTINATION_DOMAINS[destinationChainId],
            mintRecipient as Hex,
            CHAIN_IDS_TO_USDC_ADDRESSES[sourceChainId] as `0x${string}`,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            maxFee,
            finalityThreshold,
          ],
        }),
      });

      addLog(`Burn Tx: ${tx}`);
      return tx;
    } catch (err) {
      setError("Burn failed");
      throw err;
    }
  };

  // Solana burn function
  const burnSolanaUSDC = async (
    wallet: any,
    sourceChainId: number,
    amount: bigint,
    destinationChainId: number,
    destinationAddress: string,
    transferType: "fast" | "standard",
  ) => {
    setCurrentStep("burning");
    addLog("Burning Solana USDC...");

    try {
      const {
        getAnchorConnection,
        getPrograms,
        getDepositForBurnPdas,
        evmAddressToBytes32,
        findProgramAddress,
      } = await import("@/lib/solana-utils");
      const {
        getAssociatedTokenAddress,
        createAssociatedTokenAccountInstruction,
        getAccount,
      } = await import("@solana/spl-token");

      const connection = getSolanaConnection();
      const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      const { messageTransmitterProgram, tokenMessengerMinterProgram } =
        getPrograms(provider);

      const usdcMint = new PublicKey(
        CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.SOLANA_DEVNET] as string,
      );

      const pdas = getDepositForBurnPdas(
        { messageTransmitterProgram, tokenMessengerMinterProgram },
        usdcMint,
        DESTINATION_DOMAINS[destinationChainId],
      );

      // Generate event account keypair
      const messageSentEventAccountKeypair = Keypair.generate();

      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        wallet.publicKey,
      );

      // Convert destination address based on chain type
      let mintRecipient: PublicKey;

      if (isSolanaChain(destinationChainId)) {
        // For Solana destinations, use the Solana public key directly
        mintRecipient = new PublicKey(destinationAddress);
      } else {
        // For EVM chains, ensure address is properly formatted
        const cleanAddress = destinationAddress
          .replace(/^0x/, "")
          .toLowerCase();
        if (cleanAddress.length !== 40) {
          throw new Error(
            `Invalid EVM address length: ${cleanAddress.length}, expected 40`,
          );
        }
        const formattedAddress = `0x${cleanAddress}`;
        // Convert address to bytes32 format then to PublicKey
        const bytes32Address = evmAddressToBytes32(formattedAddress);
        mintRecipient = new PublicKey(getBytes(bytes32Address));
      }

      // Get the EVM address that will call receiveMessage
      const evmAccount = privateKeyToAccount(
        `0x${process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY}`,
      );
      const evmAddress = evmAccount.address;
      const destinationCaller = new PublicKey(
        getBytes(evmAddressToBytes32(evmAddress)),
      );

      // Call depositForBurn using Circle's exact approach
      const depositForBurnTx = await (
        tokenMessengerMinterProgram as any
      ).methods
        .depositForBurn({
          amount: new BN(amount.toString()),
          destinationDomain: DESTINATION_DOMAINS[destinationChainId],
          mintRecipient,
          maxFee: new BN((amount - 1n).toString()),
          minFinalityThreshold: transferType === "fast" ? 1000 : 2000,
          destinationCaller,
        })
        .accounts({
          owner: wallet.publicKey,
          eventRentPayer: wallet.publicKey,
          senderAuthorityPda: pdas.authorityPda.publicKey,
          burnTokenAccount: userTokenAccount,
          messageTransmitter: pdas.messageTransmitterAccount.publicKey,
          tokenMessenger: pdas.tokenMessengerAccount.publicKey,
          remoteTokenMessenger: pdas.remoteTokenMessengerKey.publicKey,
          tokenMinter: pdas.tokenMinterAccount.publicKey,
          localToken: pdas.localToken.publicKey,
          burnTokenMint: usdcMint,
          messageSentEventData: messageSentEventAccountKeypair.publicKey,
          messageTransmitterProgram: messageTransmitterProgram.programId,
          tokenMessengerMinterProgram: tokenMessengerMinterProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([messageSentEventAccountKeypair])
        .rpc();

      addLog(`Solana burn transaction: ${depositForBurnTx}`);
      return depositForBurnTx;
    } catch (err) {
      setError("Solana burn failed");
      addLog(
        `Solana burn error: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      throw err;
    }
  };

  const retrieveAttestation = async (
    transactionHash: string,
    sourceChainId: number,
  ) => {
    setCurrentStep("waiting-attestation");
    addLog("Retrieving attestation...");

    const url = `${IRIS_API_URL}/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`;

    while (true) {
      try {
        const response = await axios.get(url);
        if (response.data?.messages?.[0]?.status === "complete") {
          addLog("Attestation retrieved!");
          return response.data.messages[0];
        }
        addLog("Waiting for attestation...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        setError("Attestation retrieval failed");
        addLog(
          `Attestation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        throw error;
      }
    }
  };
    // Utility function to get the appropriate private key for a chain
  const getPrivateKeyForChain = (chainId: number): string => {
    if (isSolanaChain(chainId)) {
      const solanaKey = process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY;
      if (!solanaKey) {
        throw new Error(
          "Solana private key not found. Please set NEXT_PUBLIC_SOLANA_PRIVATE_KEY in your environment.",
        );
      }
      return solanaKey;
    } else {
      const evmKey =
        process.env.NEXT_PUBLIC_EVM_PRIVATE_KEY ||
        process.env.NEXT_PUBLIC_PRIVATE_KEY;
      if (!evmKey) {
        throw new Error(
          "EVM private key not found. Please set NEXT_PUBLIC_EVM_PRIVATE_KEY in your environment.",
        );
      }
      return evmKey;
    }
  };
  const getSenderClient = (chainId: SupportedChainId) => {
    const privateKey = getPrivateKeyForChain(chainId);
    
    const account = privateKeyToAccount(`0x${privateKey.replace(/^0x/, "")}`, {
      nonceManager,
    });
    return createWalletClient({
      chain: chains[chainId as keyof typeof chains],
      transport: http(),
      account,
    });
  };


  const mintUSDC = async (
    client: WalletClient<HttpTransport, Chain, Account>,
    destinationChainId: number,
    attestation: any,
  ) => {
    const MAX_RETRIES = 3;
    let retries = 0;
    setCurrentStep("minting");
    addLog("Minting USDC...");

    while (retries < MAX_RETRIES) {
      try {
        const publicClient = createPublicClient({
          chain: chains[destinationChainId as keyof typeof chains],
          transport: http(),
        });
        const feeData = await publicClient.estimateFeesPerGas();
        const contractConfig = {
          address: CHAIN_IDS_TO_MESSAGE_TRANSMITTER[
            destinationChainId
          ] as `0x${string}`,
          abi: [
            {
              type: "function",
              name: "receiveMessage",
              stateMutability: "nonpayable",
              inputs: [
                { name: "message", type: "bytes" },
                { name: "attestation", type: "bytes" },
              ],
              outputs: [],
            },
          ] as const,
        };

        // Estimate gas with buffer
        const gasEstimate = await publicClient.estimateContractGas({
          ...contractConfig,
          functionName: "receiveMessage",
          args: [attestation.message, attestation.attestation],
          account: client.account,
        });

        // Add 20% buffer to gas estimate
        const gasWithBuffer = (gasEstimate * 120n) / 100n;
        addLog(`Gas Used: ${formatUnits(gasWithBuffer, 9)} Gwei`);

        const tx = await client.sendTransaction({
          to: contractConfig.address,
          data: encodeFunctionData({
            ...contractConfig,
            functionName: "receiveMessage",
            args: [attestation.message, attestation.attestation],
          }),
          gas: gasWithBuffer,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        });

        addLog(`Mint Tx: ${tx}`);
        setCurrentStep("completed");
        break;
      } catch (err) {
        if (err instanceof TransactionExecutionError && retries < MAX_RETRIES) {
          retries++;
          addLog(`Retry ${retries}/${MAX_RETRIES}...`);
          await new Promise((resolve) => setTimeout(resolve, 2000 * retries));
          continue;
        }
        throw err;
      }
    }
  };

  // Solana mint function
  const mintSolanaUSDC = async (
    wallet: any,
    destinationChainId: number,
    attestation: any,
  ) => {
    setCurrentStep("minting");
    addLog("Minting Solana USDC...");

    try {
      const {
        getAnchorConnection,
        getPrograms,
        getReceiveMessagePdas,
        decodeNonceFromMessage,
        evmAddressToBytes32,
      } = await import("@/lib/solana-utils");
      const {
        getAssociatedTokenAddress,
        createAssociatedTokenAccountInstruction,
        getAccount,
      } = await import("@solana/spl-token");

      const provider = new AnchorProvider(getSolanaConnection(), wallet, {
        commitment: "confirmed",
      });
      const { messageTransmitterProgram, tokenMessengerMinterProgram } =
        getPrograms(provider);
      const connection = getSolanaConnection();

      const usdcMint = new PublicKey(
        CHAIN_IDS_TO_USDC_ADDRESSES[SupportedChainId.SOLANA_DEVNET] as string,
      );
      const messageHex = attestation.message;
      const attestationHex = attestation.attestation;

      // Extract the nonce and source domain from the message
      const nonce = decodeNonceFromMessage(messageHex);
      const messageBuffer = Buffer.from(messageHex.replace("0x", ""), "hex");
      const sourceDomain = messageBuffer.readUInt32BE(4);

      // For EVM to Solana, we need to determine the remote token address
      // This would typically be the USDC address on the source chain
      let remoteTokenAddressHex = "";
      // Find the source chain USDC address
      for (const [chainId, usdcAddress] of Object.entries(
        CHAIN_IDS_TO_USDC_ADDRESSES,
      )) {
        if (
          DESTINATION_DOMAINS[parseInt(chainId)] === sourceDomain &&
          !isSolanaChain(parseInt(chainId))
        ) {
          remoteTokenAddressHex = evmAddressToBytes32(usdcAddress as string);
          break;
        }
      }

      // Get PDAs for receive message
      const pdas = await getReceiveMessagePdas(
        { messageTransmitterProgram, tokenMessengerMinterProgram },
        usdcMint,
        remoteTokenAddressHex,
        sourceDomain.toString(),
        nonce,
      );

      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        wallet.publicKey,
      );

      // Build account metas array for remaining accounts
      const accountMetas = [
        {
          isSigner: false,
          isWritable: false,
          pubkey: pdas.tokenMessengerAccount.publicKey,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: pdas.remoteTokenMessengerKey.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: pdas.tokenMinterAccount.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: pdas.localToken.publicKey,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: pdas.tokenPair.publicKey,
        },
        {
          isSigner: false,
          isWritable: true,
          pubkey: pdas.feeRecipientTokenAccount,
        },
        { isSigner: false, isWritable: true, pubkey: userTokenAccount },
        {
          isSigner: false,
          isWritable: true,
          pubkey: pdas.custodyTokenAccount.publicKey,
        },
        { isSigner: false, isWritable: false, pubkey: TOKEN_PROGRAM_ID },
        {
          isSigner: false,
          isWritable: false,
          pubkey: pdas.tokenMessengerEventAuthority.publicKey,
        },
        {
          isSigner: false,
          isWritable: false,
          pubkey: tokenMessengerMinterProgram.programId,
        },
      ];

      // Call receiveMessage using Circle's official structure
      const receiveMessageTx = await (messageTransmitterProgram as any).methods
        .receiveMessage({
          message: Buffer.from(messageHex.replace("0x", ""), "hex"),
          attestation: Buffer.from(attestationHex.replace("0x", ""), "hex"),
        })
        .accounts({
          payer: wallet.publicKey,
          caller: wallet.publicKey,
          authorityPda: pdas.authorityPda,
          messageTransmitter: pdas.messageTransmitterAccount.publicKey,
          usedNonce: pdas.usedNonce,
          receiver: tokenMessengerMinterProgram.programId,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts(accountMetas)
        .rpc();

      addLog(`Solana mint transaction: ${receiveMessageTx}`);
      setCurrentStep("completed");
      return receiveMessageTx;
    } catch (err) {
      console.error("Full Solana mint error:", err);
      setError("Solana mint failed");
      addLog(
        `Solana mint error: ${
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : JSON.stringify(err)
        }`,
      );
      throw err;
    }
  };

  const executeTransfer = async (
    sourceChainId: number,
    destinationChainId: number,
    amount: string,
    transferType: "fast" | "standard",
  ) => {
    try {
      const numericAmount = parseUnits(amount, DEFAULT_DECIMALS);

      // Handle different chain types
      const isSourceSolana = isSolanaChain(sourceChainId);
      const isDestinationSolana = isSolanaChain(destinationChainId);

      let sourceClient: any, defaultDestination: string;

      // Get source client
      sourceClient = getClients(sourceChainId);

      // For cross-chain transfers, destination address should be the connected wallet's address
      if (isDestinationSolana) {
        if (!isSolanaConnected || !solanaPublicKey) {
          throw new Error("Solana wallet for destination not connected.");
        }
        defaultDestination = solanaPublicKey.toString();
      } else {
        if (!isEvmConnected || !evmAddress) {
          throw new Error("EVM wallet for destination not connected.");
        }
        defaultDestination = evmAddress;
      }
      // Check native balance for destination chain
      const checkNativeBalance = async (chainId: SupportedChainId) => {
        if (isSolanaChain(chainId)) {
          if (!isSolanaConnected || !solanaPublicKey)
            throw new Error("Solana wallet not connected");
          const connection = getSolanaConnection();
          const balance = await connection.getBalance(solanaPublicKey);
          return BigInt(balance);
        } else {
          if (!isEvmConnected || !evmAddress)
            throw new Error("EVM wallet not connected");
          const publicClient = createPublicClient({
            chain: chains[chainId as keyof typeof chains],
            transport: http(),
          });
          const balance = await publicClient.getBalance({
            address: evmAddress,
          });
          return balance;
        }
      };

      // Execute approve step
      if (isSourceSolana) {
        await approveSolanaUSDC(sourceClient, sourceChainId);
      } else {
        await approveUSDC(sourceClient, sourceChainId);
      }

      // Execute burn step
      let burnTx: string;
      if (isSourceSolana) {
        burnTx = await burnSolanaUSDC(
          sourceClient,
          sourceChainId,
          numericAmount,
          destinationChainId,
          defaultDestination,
          transferType,
        );
      } else {
        burnTx = await burnUSDC(
          sourceClient,
          sourceChainId,
          numericAmount,
          destinationChainId,
          defaultDestination,
          transferType,
        );
      }

      // Retrieve attestation
      const attestation = await retrieveAttestation(burnTx, sourceChainId);

      // Check destination chain balance
      const minBalance = isSolanaChain(destinationChainId)
        ? BigInt(0.01 * LAMPORTS_PER_SOL) // 0.01 SOL
        : parseEther("0.01"); // 0.01 native token

      const balance = await checkNativeBalance(destinationChainId);
      if (balance < minBalance) {
        throw new Error("Insufficient native token for gas fees");
      }

      // We need a client for the destination chain to mint.
      // The user must switch their wallet to the destination chain.
      const destinationClient = getClients(destinationChainId);

      // Execute mint step
      if (isDestinationSolana) {
        await mintSolanaUSDC(
          destinationClient,
          destinationChainId,
          attestation,
        );
      } else {
        await mintUSDC(getSenderClient(destinationChainId), destinationChainId, attestation);
      }
    } catch (error) {
      setCurrentStep("error");
      addLog(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const reset = () => {
    setCurrentStep("idle");
    setLogs([]);
    setError(null);
  };

  return {
    currentStep,
    logs,
    error,
    executeTransfer,
    getBalance,
    reset,
  };
}
