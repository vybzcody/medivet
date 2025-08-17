import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import { canisterId, createActor } from '../../../declarations/meditoken';

// Simple React-compatible observable store implementation
class Store<T> {
  private value: T;
  private subscribers: Array<(value: T) => void> = [];

  constructor(initialValue: T) {
    this.value = initialValue;
  }

  get(): T {
    return this.value;
  }

  set(newValue: T): void {
    this.value = newValue;
    this.subscribers.forEach(callback => callback(this.value));
  }

  subscribe(callback: (value: T) => void): () => void {
    this.subscribers.push(callback);
    callback(this.value); // Call immediately with current value
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
}

export interface TokenAccount {
  owner: Principal;
  subaccount?: Uint8Array;
}

export interface TransferArgs {
  to: TokenAccount;
  amount: bigint;
  fee?: bigint;
  memo?: Uint8Array;
  from_subaccount?: Uint8Array;
  created_at_time?: bigint;
}

export interface TransferResult {
  Ok?: bigint;
  Err?: TransferError;
}

export interface TransferError {
  GenericError?: { message: string; error_code: bigint };
  TemporarilyUnavailable?: null;
  BadBurn?: { min_burn_amount: bigint };
  Duplicate?: { duplicate_of: bigint };
  BadFee?: { expected_fee: bigint };
  CreatedInFuture?: { ledger_time: bigint };
  TooOld?: null;
  InsufficientFunds?: { balance: bigint };
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  fee: bigint;
  totalSupply: bigint;
  logo?: string;
}

class TokenService {
  private actor: any = null;
  private authClient: AuthClient | null = null;

  async init() {
    this.authClient = await AuthClient.create();
    await this.initializeActor();
  }

  private async initializeActor() {
    const isAuthenticated = await this.authClient?.isAuthenticated();
    
    if (isAuthenticated) {
      const identity = this.authClient?.getIdentity();
      const agent = new HttpAgent({
        identity,
        host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943'
      });

      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey();
      }

      this.actor = createActor(canisterId, { agent });
    } else {
      // Create anonymous actor for read-only operations
      const agent = new HttpAgent({
        host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://127.0.0.1:4943'
      });

      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey();
      }

      this.actor = createActor(canisterId, { agent });
    }
  }

  async getTokenMetadata(): Promise<TokenMetadata> {
    if (!this.actor) {
      throw new Error('Token service not initialized');
    }

    try {
      const [name, symbol, decimals, fee, totalSupply, metadata] = await Promise.all([
        this.actor.icrc1_name(),
        this.actor.icrc1_symbol(),
        this.actor.icrc1_decimals(),
        this.actor.icrc1_fee(),
        this.actor.icrc1_total_supply(),
        this.actor.icrc1_metadata()
      ]);

      const logoEntry = metadata.find(([key]: [string, any]) => key === 'icrc1:logo');
      const logo = logoEntry ? logoEntry[1].Text : undefined;

      return {
        name,
        symbol,
        decimals,
        fee,
        totalSupply,
        logo
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      throw error;
    }
  }

  async getBalance(account: TokenAccount): Promise<bigint> {
    if (!this.actor) {
      throw new Error('Token service not initialized');
    }

    try {
      return await this.actor.icrc1_balance_of(account);
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }

  async transfer(args: TransferArgs): Promise<TransferResult> {
    if (!this.actor) {
      throw new Error('Token service not initialized');
    }

    const isAuthenticated = await this.authClient?.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to perform transfers');
    }

    try {
      const result = await this.actor.icrc1_transfer(args);
      return result;
    } catch (error) {
      console.error('Error performing transfer:', error);
      throw error;
    }
  }

  async mintTokens(to: TokenAccount, amount: bigint): Promise<TransferResult> {
    if (!this.actor) {
      throw new Error('Token service not initialized');
    }

    const isAuthenticated = await this.authClient?.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to mint tokens');
    }

    try {
      const result = await this.actor.mint_tokens(to, amount);
      return result;
    } catch (error) {
      console.error('Error minting tokens:', error);
      throw error;
    }
  }

  async burnTokens(amount: bigint, from_subaccount?: Uint8Array): Promise<TransferResult> {
    if (!this.actor) {
      throw new Error('Token service not initialized');
    }

    const isAuthenticated = await this.authClient?.isAuthenticated();
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to burn tokens');
    }

    try {
      const result = await this.actor.burn_tokens(amount, from_subaccount);
      return result;
    } catch (error) {
      console.error('Error burning tokens:', error);
      throw error;
    }
  }

  async getTotalSupply(): Promise<bigint> {
    if (!this.actor) {
      throw new Error('Token service not initialized');
    }

    try {
      return await this.actor.icrc1_total_supply();
    } catch (error) {
      console.error('Error fetching total supply:', error);
      throw error;
    }
  }

  async getTransactionsCount(): Promise<bigint> {
    if (!this.actor) {
      throw new Error('Token service not initialized');
    }

    try {
      return await this.actor.get_transactions_count();
    } catch (error) {
      console.error('Error fetching transactions count:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.actor) {
      throw new Error('Token service not initialized');
    }

    try {
      return await this.actor.health_check();
    } catch (error) {
      console.error('Error performing health check:', error);
      return false;
    }
  }

  // Helper methods for converting between different formats
  static formatTokenAmount(amount: bigint, decimals: number = 8): string {
    const divisor = BigInt(10 ** decimals);
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;
    
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${wholePart}.${fractionalStr}`;
  }

  static parseTokenAmount(amount: string, decimals: number = 8): bigint {
    const [wholePart = '0', fractionalPart = ''] = amount.split('.');
    const paddedFractional = fractionalPart.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(wholePart) * BigInt(10 ** decimals) + BigInt(paddedFractional);
  }

  static createAccount(principal: Principal, subaccount?: Uint8Array): TokenAccount {
    return {
      owner: principal,
      subaccount
    };
  }
}

// Export TokenService class
export { TokenService };

// Create singleton instance
export const tokenService = new TokenService();

// Stores
export const tokenMetadata = new Store<TokenMetadata | null>(null);
export const userTokenBalance = new Store<bigint>(BigInt(0));
export const isTokenServiceInitialized = new Store<boolean>(false);

// Initialize token service
tokenService.init().then(() => {
  isTokenServiceInitialized.set(true);
  
  // Load token metadata
  tokenService.getTokenMetadata().then(metadata => {
    tokenMetadata.set(metadata);
  }).catch(console.error);
}).catch(console.error);

export default tokenService;
