import { Token, TokenStorage } from "./token.types";

class InmemoryTokenStorage implements TokenStorage {
  private store: { [address: string]: Token } = {};

  async save(token: Token): Promise<void> {
    this.store[token.address] = token;
  }

  async findByAddress(address: string): Promise<Token> {
    const token = this.store[address];
    if (!token) {
      throw new Error(`Token not found for address: ${address}`);
    }
    return token;
  }

  async find(addresses: string[]): Promise<Token[]> {
    return addresses.map((address) => this.store[address]).filter((token): token is Token => !!token);
  }
}

export const inmemoryTokenStorage = new InmemoryTokenStorage();
