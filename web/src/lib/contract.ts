import { monadTestnet } from "wagmi/chains";

export const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ??
  "0x3Ddd8AA67C2E6F773091c490BE5AfbF35dF05335") as `0x${string}`;

export const PUBLIC_GOODS_ADDRESS =
  "0x4aEbc0bACaC7C7d32D718aE4B76f2b025D9e6B26" as `0x${string}`;

export const CHAIN = monadTestnet;

export const EXPLORER = "https://testnet.monadscan.com";

// Message status enum, mirrors the contract.
export const STATUS = ["None", "Pending", "Refunded", "Donated", "Reclaimed"] as const;
export type StatusName = (typeof STATUS)[number];

export const ESCROW_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reject",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reclaim",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getMessage",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "sender", type: "address" },
          { name: "recipient", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "nextId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "publicGoods",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  { type: "error", name: "InvalidRecipient", inputs: [] },
  { type: "error", name: "ZeroDeposit", inputs: [] },
  { type: "error", name: "BadDeadline", inputs: [] },
  { type: "error", name: "NotFound", inputs: [] },
  { type: "error", name: "NotPending", inputs: [] },
  { type: "error", name: "NotRecipient", inputs: [] },
  { type: "error", name: "NotSender", inputs: [] },
  { type: "error", name: "DeadlinePassed", inputs: [] },
  { type: "error", name: "DeadlineNotReached", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
    ],
  },
] as const;
