import { create } from 'zustand';
import { HealthRecord } from '../types';
import useAuthStore from './useAuthStore';
import { createAuthenticatedActor } from '../services/actorService';
import tokenService, { TokenService } from './tokenStore';
import { Principal } from '@dfinity/principal';

export interface MarketplaceListing {
  id: number;
  recordId: number;
  sellerId: Principal;
  title: string;
  category: string;
  description: string;
  price: bigint; // Price in MDT tokens
  isActive: boolean;
  createdAt: number;
  record?: HealthRecord;
}

export interface PurchaseRecord {
  id: number;
  listingId: number;
  buyerId: Principal;
  sellerId: Principal;
  recordId: number;
  price: bigint;
  purchasedAt: number;
  transactionHash?: string;
}

interface MarketplaceState {
  listings: MarketplaceListing[];
  myListings: MarketplaceListing[];
  purchases: PurchaseRecord[];
  isLoading: boolean;
  error: string | null;
  
  // Methods
  fetchMarketplaceListings: () => Promise<void>;
  fetchMyListings: () => Promise<void>;
  fetchPurchases: () => Promise<void>;
  createListing: (recordId: number, price: string, description?: string) => Promise<void>;
  updateListing: (listingId: number, price: string, description?: string) => Promise<void>;
  deactivateListing: (listingId: number) => Promise<void>;
  purchaseRecord: (listingId: number) => Promise<void>;
  setPrice: (recordId: number, price: string) => Promise<void>;
}

const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  listings: [],
  myListings: [],
  purchases: [],
  isLoading: false,
  error: null,

  fetchMarketplaceListings: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Fetch monetizable records from backend
      const result = await actor.getMonetizableRecords();
      
      if ('ok' in result) {
        // Convert to marketplace listings format
        const listings: MarketplaceListing[] = result.ok.map((record: any, index: number) => ({
          id: index + 1,
          recordId: Number(record.id),
          sellerId: record.owner,
          title: record.title,
          category: record.category,
          description: record.category,
          price: BigInt(1000000), // Default price: 0.01 MDT (1000000 units with 8 decimals)
          isActive: record.status === 'Monetizable',
          createdAt: Number(record.createdAt),
          record: {
            id: Number(record.id),
            title: record.title,
            category: record.category,
            provider: 'Unknown',
            record_type: record.category,
            record_date: Number(record.createdAt),
            encrypted_content: new Uint8Array(record.encryptedBlob),
            attachment_id: record.attachment ? Number(record.attachment) : null,
            user_permissions: [],
            access_count: Number(record.accessCount),
            created_at: Number(record.createdAt),
            updated_at: Number(record.modifiedAt),
            owner: record.owner.toString()
          }
        }));
        
        set({ 
          listings,
          isLoading: false 
        });
      } else {
        throw new Error(result.err || 'Failed to fetch marketplace listings');
      }
    } catch (error: any) {
      console.error("Error fetching marketplace listings:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMyListings: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity, principal } = useAuthStore.getState();
      
      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }
      
      // For now, filter from all listings by current user's principal
      await get().fetchMarketplaceListings();
      
      const allListings = get().listings;
      const myListings = allListings.filter(listing => 
        listing.sellerId.toString() === principal.toString()
      );
      
      set({ 
        myListings,
        isLoading: false 
      });
    } catch (error: any) {
      console.error("Error fetching my listings:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchPurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Get the authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Fetch access logs (which represent purchases)
      const result = await actor.getAccessLogs();
      
      if ('ok' in result) {
        // Transform access logs to purchase records
        const purchases: PurchaseRecord[] = result.ok.map((log: any) => ({
          id: Number(log.id),
          listingId: Number(log.recordId), // Use recordId as listing ID
          buyerId: log.provider,
          sellerId: Principal.anonymous(), // We don't have seller info in access logs
          recordId: Number(log.recordId),
          price: BigInt(log.paidMT),
          purchasedAt: Number(log.ts),
        }));
        
        set({ 
          purchases,
          isLoading: false 
        });
      } else {
        throw new Error(result.err || 'Failed to fetch purchases');
      }
    } catch (error: any) {
      console.error("Error fetching purchases:", error);
      set({ error: error.message, isLoading: false });
    }
  },

  createListing: async (recordId: number, price: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { identity, principal } = useAuthStore.getState();
      
      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }
      
      // Parse price (convert from MDT to units)
      const priceInUnits = TokenService.parseTokenAmount(price, 8);
      
      // For now, we just simulate creating a listing since the backend doesn't have marketplace functionality
      console.log(`Creating listing for record ${recordId} at price ${price} MDT`);
      
      // In a real implementation, you would call a backend method here
      // await actor.createMarketplaceListing(recordId, priceInUnits, description);
      
      // Refresh listings
      await get().fetchMyListings();
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error creating listing:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateListing: async (listingId: number, price: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      // Parse price
      const priceInUnits = TokenService.parseTokenAmount(price, 8);
      
      console.log(`Updating listing ${listingId} with price ${price} MDT`);
      
      // In a real implementation, you would call a backend method here
      // await actor.updateMarketplaceListing(listingId, priceInUnits, description);
      
      // Refresh listings
      await get().fetchMyListings();
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error updating listing:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deactivateListing: async (listingId: number) => {
    set({ isLoading: true, error: null });
    try {
      const { identity } = useAuthStore.getState();
      
      if (!identity) {
        throw new Error('User not authenticated');
      }
      
      console.log(`Deactivating listing ${listingId}`);
      
      // In a real implementation, you would call a backend method here
      // await actor.deactivateMarketplaceListing(listingId);
      
      // Refresh listings
      await get().fetchMyListings();
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error("Error deactivating listing:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  purchaseRecord: async (listingId: number) => {
    set({ isLoading: true, error: null });
    try {
      const { identity, principal } = useAuthStore.getState();
      
      if (!identity || !principal) {
        throw new Error('User not authenticated');
      }
      
      // Find the listing
      const listing = get().listings.find(l => l.id === listingId);
      if (!listing) {
        throw new Error('Listing not found');
      }
      
      // Check if user has enough tokens
      const userAccount = TokenService.createAccount(Principal.fromText(principal.toString()));
      const balance = await tokenService.getBalance(userAccount);
      
      if (balance < listing.price) {
        throw new Error(`Insufficient funds. You have ${TokenService.formatTokenAmount(balance)} MDT, but need ${TokenService.formatTokenAmount(listing.price)} MDT`);
      }
      
      // Create seller account
      const sellerAccount = TokenService.createAccount(listing.sellerId);
      
      // Transfer tokens to seller (simulated - in real implementation this would be handled by the backend)
      const transferResult = await tokenService.transfer({
        to: sellerAccount,
        amount: listing.price,
        from_subaccount: undefined,
        fee: undefined,
        memo: undefined,
        created_at_time: undefined
      });
      
      if (transferResult.Err) {
        throw new Error('Token transfer failed');
      }
      
      // Access the record through the backend (this logs the purchase)
      const { actor } = await createAuthenticatedActor(identity);
      const recordResult = await actor.queryRecord(BigInt(listing.recordId));
      
      if ('ok' in recordResult) {
        console.log(`Successfully purchased record ${listing.recordId} for ${TokenService.formatTokenAmount(listing.price)} MDT`);
        
        // Refresh purchases
        await get().fetchPurchases();
        
        set({ isLoading: false });
        return recordResult.ok;
      } else {
        throw new Error(recordResult.err || 'Failed to access purchased record');
      }
    } catch (error: any) {
      console.error("Error purchasing record:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setPrice: async (recordId: number, price: string) => {
    // This is a convenience method to set a price for a record
    // It would typically update the record's marketplace status
    try {
      await get().createListing(recordId, price);
    } catch (error) {
      console.error("Error setting price:", error);
      throw error;
    }
  }
}));

export default useMarketplaceStore;
