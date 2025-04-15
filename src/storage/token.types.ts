export type Token = {
  address: string; // Primary key
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
};

export interface TokenStorage {
  save(token: Token): Promise<void>;
  findByAddress(address: string): Promise<Token>;
  find(addresses: string[]): Promise<Token[]>;
}
