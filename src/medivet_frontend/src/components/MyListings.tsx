import React, { useEffect, useState } from 'react';
import { Plus, Edit, Eye, Trash2, DollarSign, Calendar, BarChart3, Settings } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Label from './ui/Label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/Dialog';
import useHealthRecordStore from '../stores/useHealthRecordStore';
import useMarketplaceStore from '../stores/useMarketplaceStore';
import useAuthStore from '../stores/useAuthStore';
import { TokenService } from '../stores/tokenStore';
import { HealthRecord } from '../types';

const MyListings: React.FC = () => {
  const { principal } = useAuthStore();
  const { records, fetchRecords } = useHealthRecordStore();
  const { 
    myListings, 
    isLoading, 
    error, 
    fetchMyListings, 
    createListing,
    updateListing,
    deactivateListing 
  } = useMarketplaceStore();

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [priceValue, setPriceValue] = useState('');
  const [description, setDescription] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingListingId, setEditingListingId] = useState<number | null>(null);

  useEffect(() => {
    if (principal) {
      fetchRecords();
      fetchMyListings();
    }
  }, [principal, fetchRecords, fetchMyListings]);

  // Get records that can be monetized
  const monetizableRecords = records.filter(record => {
    // In a real implementation, check the record's monetization status
    return true; // For now, assume all records can be monetized
  });

  // Get records that are not yet listed
  const unlistedRecords = monetizableRecords.filter(record => {
    return !myListings.some(listing => listing.recordId === record.id);
  });

  const handleSetPrice = (record: HealthRecord) => {
    setSelectedRecord(record);
    setIsEditing(false);
    setEditingListingId(null);
    setPriceValue('');
    setDescription('');
    setShowPriceModal(true);
  };

  const handleEditListing = (listingId: number) => {
    const listing = myListings.find(l => l.id === listingId);
    if (listing) {
      setSelectedRecord(null);
      setIsEditing(true);
      setEditingListingId(listingId);
      setPriceValue(TokenService.formatTokenAmount(listing.price, 8));
      setDescription(listing.description);
      setShowPriceModal(true);
    }
  };

  const handleSubmitPrice = async () => {
    if ((!selectedRecord && !editingListingId) || !priceValue) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (isEditing && editingListingId) {
        await updateListing(editingListingId, priceValue, description);
        alert('Listing updated successfully!');
      } else if (selectedRecord) {
        await createListing(selectedRecord.id, priceValue, description);
        alert(`Health record "${selectedRecord.title}" listed for sale at ${priceValue} MDT!`);
      }
      
      setShowPriceModal(false);
      setPriceValue('');
      setDescription('');
      setSelectedRecord(null);
      setEditingListingId(null);
      setIsEditing(false);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleDeactivate = async (listingId: number) => {
    const listing = myListings.find(l => l.id === listingId);
    if (!listing) return;

    if (confirm(`Are you sure you want to remove "${listing.title}" from the marketplace?`)) {
      try {
        await deactivateListing(listingId);
        alert('Listing removed from marketplace successfully!');
      } catch (error: any) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp / 1000000).toLocaleDateString(); // Convert from nanoseconds
  };

  const getTotalEarnings = () => {
    // In a real implementation, this would come from purchase records
    return BigInt(0);
  };

  const getViewCount = (recordId: number) => {
    const record = records.find(r => r.id === recordId);
    return record?.access_count || 0;
  };

  if (!principal) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <Settings className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">My Health Data Listings</h2>
          <p className="text-gray-600">Please authenticate to manage your health record listings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Health Data Listings</h1>
        <p className="text-gray-600">
          Monetize your health data by listing records for sale in the marketplace
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{monetizableRecords.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active Listings</p>
              <p className="text-2xl font-bold text-gray-900">{myListings.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">
                {records.reduce((sum, record) => sum + (record.access_count || 0), 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">
                {TokenService.formatTokenAmount(getTotalEarnings(), 8)} MDT
              </p>
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

      {/* Unlisted Records Section */}
      {unlistedRecords.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available to List</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlistedRecords.map((record) => (
              <div key={record.id} className="bg-white rounded-lg border shadow-sm p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{record.title}</h3>
                <p className="text-sm text-gray-600 mb-1">Category: {record.category}</p>
                <p className="text-sm text-gray-600 mb-4">
                  Created: {formatDate(record.record_date)}
                </p>
                <Button
                  onClick={() => handleSetPrice(record)}
                  className="w-full"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Set Price & List
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Listings Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Listings</h2>
        
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your listings...</p>
          </div>
        )}

        {!isLoading && myListings.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Listings</h3>
            <p className="text-gray-600">
              You haven't listed any health records for sale yet. Start monetizing your data!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myListings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-lg border shadow-sm">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                  <div className="flex items-center bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                    <DollarSign className="h-3 w-3 mr-1" />
                    {TokenService.formatTokenAmount(listing.price, 8)} MDT
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">Category: {listing.category}</p>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Listed: {formatDate(listing.createdAt)}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Eye className="h-4 w-4 mr-2" />
                    Views: {getViewCount(listing.recordId)}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditListing(listing.id)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(listing.id)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Price Setting Modal */}
      <Dialog open={showPriceModal} onOpenChange={setShowPriceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Listing' : 'Set Price for Health Record'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Update the price and description for your listing'
                : `Set a price for "${selectedRecord?.title}" to list it on the marketplace`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="price">Price (MDT) *</Label>
              <Input
                id="price"
                type="number"
                step="0.00000001"
                min="0"
                placeholder="e.g., 0.01"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
              />
              <p className="text-sm text-gray-600 mt-1">
                Recommended price range: 0.001 - 1.0 MDT based on data type and quality
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of the health record..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowPriceModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitPrice}
                className="flex-1"
                disabled={!priceValue}
              >
                {isEditing ? 'Update Listing' : 'List for Sale'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyListings;
