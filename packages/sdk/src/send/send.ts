import { MiniKit } from "@worldcoin/minikit-js";
import BigNumber from "bignumber.js";
import { DEX_ABI } from "../abi/dex";
import { TokenProvider } from "../token";

/**
 * @typedef SendNativeParams
 * @property {number} amount - The amount of native cryptocurrency (e.g., ETH) to send.
 *                             This value is typically specified in the base unit (e.g., Ether).
 * @property {string} to - The recipient's address to which the native cryptocurrency will be sent.
 *                         This should be a valid Ethereum address.
 */
export type SendNativeParams = {
  amount: number;
  to: string;
};

/**
 * @typedef SendERC20Params
 * @property {number} amount - The amount of ERC20 tokens to send.
 *                             This value is typically specified in the token's base unit (e.g., smallest divisible unit like wei for ETH-based tokens).
 * @property {string} token - The contract address of the ERC20 token to be sent.
 *                            This should be a valid Ethereum address representing the token contract.
 * @property {string} to - The recipient's address to which the ERC20 tokens will be sent.
 *                         This should be a valid Ethereum address.
 */
export type SendERC20Params = {
  amount: number;
  token: string;
  to: string;
};

export class Sender {
  // Holdstation forwarder address, using for gas free transactions
  private readonly spender: string = "0x297eea7f0e6216aeed83651804d091b65c3a8e9c";

  private readonly tokenProvider: TokenProvider;

  constructor(tokenProvider?: TokenProvider) {
    this.tokenProvider = tokenProvider ?? new TokenProvider();
  }

  /**
   * Sends native cryptocurrency (e.g., ETH) to a specified address.
   * @private
   * @param {SendNativeParams} params - Parameters for sending native cryptocurrency.
   * @returns {Promise<any>} - Transaction payload.
   */
  private async native({ amount, to }: SendNativeParams) {
    const value = `0x${new BigNumber(amount).multipliedBy(1e18).toString(16)}`;
    // submit transaction
    const payload = await MiniKit.commandsAsync.sendTransaction({
      transaction: [
        {
          address: this.spender,
          abi: DEX_ABI,
          functionName: "send",
          args: [to],
          value,
        },
      ],
    });

    return payload;
  }

  /**
   * Sends ERC20 tokens to a specified address.
   * @param {SendERC20Params} params - Parameters for sending ERC20 tokens.
   * @returns {Promise<any>} - Transaction payload.
   */
  private async erc20({ amount, token, to }: SendERC20Params) {
    const tokenDetails = await this.tokenProvider.details(token);
    const decimals = tokenDetails[token].decimals;
    const amountIn = new BigNumber(amount).multipliedBy(10 ** decimals).toFixed();
    const deadline = Math.floor((Date.now() + 30 * 60 * 1000) / 1000).toString();

    // Define the permit transfer object, which includes the token address, amount, nonce, and deadline.
    // This is used to structure the permit transfer data.
    const permitTransfer = {
      permitted: {
        token,
        amount: amountIn,
      },
      nonce: Date.now().toString(),
      deadline,
    };

    // Format the permit transfer arguments into an array for use in the transaction.
    const permitTransferArgsForm = [
      [permitTransfer.permitted.token, permitTransfer.permitted.amount],
      permitTransfer.nonce,
      permitTransfer.deadline,
    ];

    // Define the transfer details object, which includes the spender and the requested amount.
    // This is used to structure the transfer data.
    const transferDetails = {
      spender: this.spender,
      requestedAmount: amountIn,
    };

    const transferDetailsArgsForm = [transferDetails.spender, transferDetails.requestedAmount];

    // Define the data object that contains the transaction details and permit information.
    // This is used to structure the entire transaction payload.
    const data = {
      transaction: [
        {
          address: this.spender,
          abi: DEX_ABI,
          functionName: "transfer",
          args: [permitTransferArgsForm, transferDetailsArgsForm, to, "PERMIT2_SIGNATURE_PLACEHOLDER_0"],
        },
      ],
      permit2: [
        {
          ...permitTransfer,
          spender: this.spender,
        },
      ],
    };

    // submit transaction
    const payload = await MiniKit.commandsAsync.sendTransaction(data);

    return payload;
  }

  async send(params: SendNativeParams | SendERC20Params) {
    if ("token" in params) {
      return this.erc20(params);
    }

    return this.native(params);
  }
}
