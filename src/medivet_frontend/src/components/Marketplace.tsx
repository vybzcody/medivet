import React, { useEffect, useState } from 'react';
import { ShoppingCart, Eye, Calendar, User, Tag, DollarSign, Filter, Search, RefreshCw } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';
import useMarketplaceStore, { MarketplaceListing } from '../stores/useMarketplaceStore';
import useAuthStore from '../stores/useAuthStore';
import { TokenService } from '../stores/tokenStore';

interface MarketplaceProps {
  userRole?: 'Patient' | 'Provider';
}

const Marketplace: React.FC<MarketplaceProps> = ({ userRole = 'Provider' }) => {
  const { principal } = useAuthStore();
  const { 
    listings, 
    isLoading, 
    error, 
    fetchMarketplaceListings, 
    purchaseRecord 
  } = useMarketplaceStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [purchasing, setPurchasing] = useState<number | null>(null);

  const categories = [
    'All Categories',
    'General Health',
    'Cardiology',
    'Diabetes Care',
    'Laboratory',
    'Mental Health',
    'Dermatology',
    'Orthopedics',
    'Neurology',
    'Other'
  ];

  const priceRanges = [
    'All Prices',
    'Under 0.01 MDT',
    '0.01 - 0.1 MDT',
    '0.1 - 1 MDT',
    'Over 1 MDT'
  ];

  useEffect(() => {
    if (principal) {
      fetchMarketplaceListings();
    }
  }, [principal, fetchMarketplaceListings]);

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !categoryFilter || categoryFilter === 'All Categories' || 
                           listing.category === categoryFilter;
    
    let matchesPrice = true;
    if (priceFilter && priceFilter !== 'All Prices') {
      const priceInMDT = parseFloat(TokenService.formatTokenAmount(listing.price, 8));
      switch (priceFilter) {
        case 'Under 0.01 MDT':
          matchesPrice = priceInMDT < 0.01;
          break;
        case '0.01 - 0.1 MDT':
          matchesPrice = priceInMDT >= 0.01 && priceInMDT <= 0.1;
          break;
        case '0.1 - 1 MDT':
          matchesPrice = priceInMDT > 0.1 && priceInMDT <= 1;
          break;
        case 'Over 1 MDT':
          matchesPrice = priceInMDT > 1;
          break;
      }
    }
    
    return matchesSearch && matchesCategory && matchesPrice;
  });

  const handlePurchase = async (listingId: number) => {
    if (!principal) {
      alert('Please authenticate to purchase records');
      return;
    }

    const listing = listings.find(l => l.id === listingId);
    if (!listing) {
      alert('Listing not found');
      return;
    }

    // Check if user is trying to buy their own record
    if (listing.sellerId.toString() === principal.toString()) {
      alert('You cannot purchase your own health record');
      return;
    }

    const confirmMessage = `Are you sure you want to purchase "${listing.title}" for ${TokenService.formatTokenAmount(listing.price, 8)} MDT?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setPurchasing(listingId);
    try {
      await purchaseRecord(listingId);
      alert('Purchase successful! You now have access to this health record.');
    } catch (error: any) {
      alert(`Purchase failed: ${error.message}`);
    } finally {
      setPurchasing(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp / 1000000).toLocaleDateString(); // Convert from nanoseconds
  };

  if (!principal) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Health Data Marketplace</h2>
          <p className="text-gray-600 mb-6">
            Please authenticate to browse and purchase health records
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Health Data Marketplace</h1>
            <p className="text-gray-600 mt-2">
              Browse and purchase anonymized health records for research and analysis
            </p>
          </div>
          <Button
            onClick={fetchMarketplaceListings}
            disabled={isLoading}
            variant="outline"
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border shadow-sm mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search health records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger>
                  <DollarSign className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Price Range" />
                </SelectTrigger>
                <SelectContent>
                  {priceRanges.map(range => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading marketplace listings...</p>
        </div>
      )}

      {!isLoading && filteredListings.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Health Records Available</h2>
          <p className="text-gray-600">
            {searchQuery || categoryFilter || priceFilter 
              ? 'No records match your current filters. Try adjusting your search criteria.'
              : 'There are currently no health records available for purchase in the marketplace.'
            }
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredListings.map((listing) => (
          <div key={listing.id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate pr-2">
                  {listing.title}
                </h3>
                <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                  <DollarSign className="h-3 w-3 mr-1" />
                  {TokenService.formatTokenAmount(listing.price, 8)} MDT
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Tag className="h-4 w-4 mr-2" />
                  {listing.category}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  {formatDate(listing.createdAt)}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  Seller: {listing.sellerId.toString().slice(0, 8)}...
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {listing.description}
              </p>

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    // TODO: Implement record preview
                    alert('Record preview functionality will be implemented');
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handlePurchase(listing.id)}
                  disabled={purchasing === listing.id || listing.sellerId.toString() === principal?.toString()}
                >
                  {purchasing === listing.id ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Purchasing...
                    </div>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Purchase
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && filteredListings.length > 0 && (
        <div className="mt-8 text-center text-sm text-gray-500">
          Showing {filteredListings.length} of {listings.length} available health records
        </div>
      )}
    </div>
  );
};

export default Marketplace;
