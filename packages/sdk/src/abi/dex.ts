export const DEX_ABI = [
  {
    type: "receive",
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "feeReceiver",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "fillQuoteEthToToken",
    inputs: [
      {
        name: "buyTokenAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "target",
        type: "address",
        internalType: "address payable",
      },
      {
        name: "swapCallData",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "partnerData",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "partnerFeeReceiver",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "fillQuoteTokenToEth",
    inputs: [
      {
        name: "sellTokenAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "target",
        type: "address",
        internalType: "address payable",
      },
      {
        name: "swapCallData",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "sellAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "feePercentage",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "partnerFeeReceiver",
        type: "address",
        internalType: "address",
      },
      {
        name: "permit",
        type: "tuple",
        internalType: "struct Permit2",
        components: [
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "signature",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "fillQuoteTokenToToken",
    inputs: [
      {
        name: "sellTokenAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "buyTokenAddress",
        type: "address",
        internalType: "address",
      },
      {
        name: "target",
        type: "address",
        internalType: "address payable",
      },
      {
        name: "swapCallData",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "sellAmount",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "feeToken",
        type: "uint8",
        internalType: "enum FeeToken",
      },
      {
        name: "partnerData",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "partnerFeeReceiver",
        type: "address",
        internalType: "address",
      },
      {
        name: "permit",
        type: "tuple",
        internalType: "struct Permit2",
        components: [
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "signature",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_owner",
        type: "address",
        internalType: "address",
      },
      {
        name: "_swapTargets",
        type: "address[]",
        internalType: "address[]",
      },
      {
        name: "_permit2",
        type: "address",
        internalType: "contract ISignatureTransfer",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "permit2",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ISignatureTransfer",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "send",
    inputs: [
      {
        name: "recipient",
        type: "address",
        internalType: "address payable",
      },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "swapTargets",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "transfer",
    inputs: [
      {
        name: "permitTransferFrom",
        type: "tuple",
        internalType: "struct ISignatureTransfer.PermitTransferFrom",
        components: [
          {
            name: "permitted",
            type: "tuple",
            internalType: "struct ISignatureTransfer.TokenPermissions",
            components: [
              {
                name: "token",
                type: "address",
                internalType: "address",
              },
              {
                name: "amount",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "transferDetails",
        type: "tuple",
        internalType: "struct ISignatureTransfer.SignatureTransferDetails",
        components: [
          {
            name: "to",
            type: "address",
            internalType: "address",
          },
          {
            name: "requestedAmount",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "receiver",
        type: "address",
        internalType: "address",
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateFeeRecipient",
    inputs: [
      {
        name: "feeRecipient",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateSwapTargets",
    inputs: [
      {
        name: "target",
        type: "address",
        internalType: "address",
      },
      {
        name: "add",
        type: "bool",
        internalType: "bool",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "whitelistFeeReceiver",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "withdrawEth",
    inputs: [
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawToken",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address",
      },
      {
        name: "to",
        type: "address",
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "EthWithdrawn",
    inputs: [
      {
        name: "target",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FeeDistributed",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FillQuoteEthToToken",
    inputs: [
      {
        name: "buyToken",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "target",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amountSold",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "amountBought",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "partnerData",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FillQuoteTokenToEth",
    inputs: [
      {
        name: "sellToken",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "target",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amountSold",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "amountBought",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "partnerData",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "FillQuoteTokenToToken",
    inputs: [
      {
        name: "sellToken",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "buyToken",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "user",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "target",
        type: "address",
        indexed: false,
        internalType: "address",
      },
      {
        name: "amountSold",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "amountBought",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "feeToken",
        type: "uint8",
        indexed: false,
        internalType: "enum FeeToken",
      },
      {
        name: "partnerData",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint64",
        indexed: false,
        internalType: "uint64",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Sent",
    inputs: [
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SwapTargetAdded",
    inputs: [
      {
        name: "target",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "SwapTargetRemoved",
    inputs: [
      {
        name: "target",
        type: "address",
        indexed: true,
        internalType: "address",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenSent",
    inputs: [
      {
        name: "receiver",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "sender",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TokenWithdrawn",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "target",
        type: "address",
        indexed: true,
        internalType: "address",
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256",
      },
    ],
    anonymous: false,
  },
  {
    type: "error",
    name: "InvalidInitialization",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidReceiver",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidToAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: [],
  },
  {
    type: "error",
    name: "OwnableInvalidOwner",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "OwnableUnauthorizedAccount",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address",
      },
    ],
  },
  {
    type: "error",
    name: "ReentrancyGuardReentrantCall",
    inputs: [],
  },
];
