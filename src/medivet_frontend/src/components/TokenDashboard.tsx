import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import tokenService, { 
  tokenMetadata, 
  userTokenBalance, 
  isTokenServiceInitialized,
  TokenMetadata,
  TokenAccount,
  TransferArgs,
  TokenService
} from '../stores/tokenStore';

interface TokenDashboardProps {
  userPrincipal?: Principal;
  isAuthenticated: boolean;
}

const TokenDashboard: React.FC<TokenDashboardProps> = ({ userPrincipal, isAuthenticated }) => {
  const [metadata, setMetadata] = useState<TokenMetadata | null>(null);
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Transfer form state
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [recipientPrincipal, setRecipientPrincipal] = useState<string>('');
  const [transferLoading, setTransferLoading] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to token metadata store
    const unsubscribeMetadata = tokenMetadata.subscribe((value: TokenMetadata | null) => {
      setMetadata(value);
    });

    // Subscribe to user balance store
    const unsubscribeBalance = userTokenBalance.subscribe((value: bigint) => {
      setBalance(value);
    });

    // Subscribe to initialization status
    const unsubscribeInitialized = isTokenServiceInitialized.subscribe((value: boolean) => {
      setIsInitialized(value);
    });

    return () => {
      unsubscribeMetadata();
      unsubscribeBalance();
      unsubscribeInitialized();
    };
  }, []);

  useEffect(() => {
    if (isInitialized && isAuthenticated && userPrincipal) {
      loadUserBalance();
    }
  }, [isInitialized, isAuthenticated, userPrincipal]);

  const loadUserBalance = async () => {
    if (!userPrincipal) return;

    try {
      setLoading(true);
      const account: TokenAccount = {
        owner: userPrincipal,
        subaccount: undefined
      };
      const userBalance = await tokenService.getBalance(account);
      setBalance(userBalance);
      userTokenBalance.set(userBalance);
    } catch (err) {
      console.error('Error loading user balance:', err);
      setError('Failed to load token balance');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !userPrincipal) {
      setError('Please authenticate to perform transfers');
      return;
    }

    try {
      setTransferLoading(true);
      setError(null);

      const recipient = Principal.fromText(recipientPrincipal);
      const amount = TokenService.parseTokenAmount(transferAmount, metadata?.decimals || 8);

      const transferArgs: TransferArgs = {
        to: {
          owner: recipient,
          subaccount: undefined
        },
        amount,
        from_subaccount: undefined,
        fee: metadata?.fee,
        memo: undefined,
        created_at_time: undefined
      };

      const result = await tokenService.transfer(transferArgs);

      if (result.Ok !== undefined) {
        setTransferAmount('');
        setRecipientPrincipal('');
        await loadUserBalance(); // Refresh balance
        alert(`Transfer successful! Transaction index: ${result.Ok}`);
      } else if (result.Err) {
        let errorMessage = 'Transfer failed: ';
        if (result.Err.InsufficientFunds) {
          errorMessage += `Insufficient funds. Balance: ${TokenService.formatTokenAmount(result.Err.InsufficientFunds.balance, metadata?.decimals || 8)} ${metadata?.symbol}`;
        } else if (result.Err.BadFee) {
          errorMessage += `Bad fee. Expected: ${TokenService.formatTokenAmount(result.Err.BadFee.expected_fee, metadata?.decimals || 8)} ${metadata?.symbol}`;
        } else if (result.Err.GenericError) {
          errorMessage += result.Err.GenericError.message;
        } else {
          errorMessage += JSON.stringify(result.Err);
        }
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Transfer error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setTransferLoading(false);
    }
  };

  const formatBalance = (balance: bigint, decimals: number = 8): string => {
    return TokenService.formatTokenAmount(balance, decimals);
  };

  if (!isInitialized) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing token service...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-gradient-to-r from-green-400 to-blue-500 px-6 py-4">
          <h1 className="text-2xl font-bold text-white flex items-center">
            {metadata?.logo && (
              <img src={metadata.logo} alt="Token Logo" className="w-8 h-8 mr-3" />
            )}
            {metadata?.name || 'MediToken'} Dashboard
          </h1>
        </div>

        {/* Token Information */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Token Name</h3>
              <p className="text-lg font-semibold text-gray-900">{metadata?.name || 'Loading...'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Symbol</h3>
              <p className="text-lg font-semibold text-gray-900">{metadata?.symbol || 'Loading...'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Total Supply</h3>
              <p className="text-lg font-semibold text-gray-900">
                {metadata ? formatBalance(metadata.totalSupply, metadata.decimals) : 'Loading...'} {metadata?.symbol}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Transfer Fee</h3>
              <p className="text-lg font-semibold text-gray-900">
                {metadata ? formatBalance(metadata.fee, metadata.decimals) : 'Loading...'} {metadata?.symbol}
              </p>
            </div>
          </div>

          {/* User Balance */}
          {isAuthenticated && userPrincipal && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-blue-900">Your Balance</h3>
                  <p className="text-2xl font-bold text-blue-800">
                    {loading ? 'Loading...' : `${formatBalance(balance, metadata?.decimals || 8)} ${metadata?.symbol}`}
                  </p>
                </div>
                <button
                  onClick={loadUserBalance}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>
          )}

          {/* Transfer Form */}
          {isAuthenticated && userPrincipal && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Transfer Tokens</h3>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
                    Recipient Principal
                  </label>
                  <input
                    type="text"
                    id="recipient"
                    value={recipientPrincipal}
                    onChange={(e) => setRecipientPrincipal(e.target.value)}
                    placeholder="Enter recipient's principal ID"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount ({metadata?.symbol})
                  </label>
                  <input
                    type="number"
                    id="amount"
                    step="any"
                    min="0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={transferLoading || !transferAmount || !recipientPrincipal}
                  className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {transferLoading ? 'Processing Transfer...' : 'Send Tokens'}
                </button>
              </form>
            </div>
          )}

          {/* Authentication Notice */}
          {!isAuthenticated && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Please authenticate with Internet Identity to view your balance and perform token operations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenDashboard;
