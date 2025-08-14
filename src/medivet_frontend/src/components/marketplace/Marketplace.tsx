import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog';
import Label from '../ui/Label';
import { 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  TrendingUp,
  Eye,
  Filter,
  Gavel,
  Database,
  CheckCircle,
  ShieldCheck
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import useAuthStore from '../../stores/useAuthStore';
import { UserRoleValue } from '../../types';

// Mock marketplace data
const mockListings = [
  {
    id: 1,
    recordId: 101,
    title: 'Comprehensive Cardiology Dataset',
    description: 'Anonymized cardiovascular health data from 500+ patients including ECG readings, blood pressure trends, and medication responses.',
    category: 'Cardiology',
    patient: 'patient-123',
    minimumBid: 150,
    currentHighestBid: 275,
    bidCount: 8,
    dataPoints: 12500,
    correctness: 98,
    anonymization: 'HIPAA Compliant',
    status: 'active',
    expiresAt: Date.now() + 86400000 * 3, // 3 days from now
    createdAt: Date.now() - 86400000 * 2
  },
  {
    id: 2,
    recordId: 102,
    title: 'Diabetes Management Records',
    description: 'Long-term glucose monitoring data with lifestyle factors and treatment outcomes over 2 years.',
    category: 'Diabetes Care',
    patient: 'patient-456',
    minimumBid: 200,
    currentHighestBid: 320,
    bidCount: 12,
    dataPoints: 8750,
    correctness: 96,
    anonymization: 'De-identified',
    status: 'active',
    expiresAt: Date.now() + 86400000 * 5,
    createdAt: Date.now() - 86400000 * 1
  },
  {
    id: 3,
    recordId: 103,
    title: 'Mental Health Assessment Data',
    description: 'Structured psychological evaluation results and treatment progress tracking.',
    category: 'Mental Health',
    patient: 'patient-789',
    minimumBid: 100,
    currentHighestBid: null,
    bidCount: 0,
    dataPoints: 3200,
    correctness: 94,
    anonymization: 'Fully Anonymous',
    status: 'active',
    expiresAt: Date.now() + 86400000 * 7,
    createdAt: Date.now() - 86400000 * 0.5
  },
  {
    id: 4,
    recordId: 104,
    title: 'Laboratory Results Collection',
    description: 'Comprehensive lab work including blood chemistry, lipid panels, and biomarker analysis.',
    category: 'Laboratory',
    patient: 'patient-321',
    minimumBid: 180,
    currentHighestBid: 245,
    bidCount: 6,
    dataPoints: 15600,
    correctness: 99,
    anonymization: 'HIPAA Compliant',
    status: 'active',
    expiresAt: Date.now() + 86400000 * 4,
    createdAt: Date.now() - 86400000 * 3
  }
];

const Marketplace: React.FC = () => {
  const { principal, userRole } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [bidModalOpen, setBidModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');

  const categories = ['all', 'General Health', 'Cardiology', 'Diabetes Care', 'Laboratory', 'Mental Health'];
  
  const filteredListings = mockListings.filter(listing => {
    const matchesSearch = listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         listing.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || listing.category === categoryFilter;
    const isActive = listing.status === 'active';
    return matchesSearch && matchesCategory && isActive;
  });

  const handlePlaceBid = () => {
    if (!principal || !selectedListing || !bidAmount) {
      alert('Please enter a valid bid amount');
      return;
    }

    const amount = parseFloat(bidAmount);
    const minimumBid = selectedListing.currentHighestBid 
      ? selectedListing.currentHighestBid + 1 
      : selectedListing.minimumBid;

    if (amount < minimumBid) {
      alert(`Bid must be at least ${minimumBid} MT`);
      return;
    }

    // In a real app, this would call the backend
    console.log('Placing bid:', { listingId: selectedListing.id, amount });
    alert('Bid placed successfully!');
    setBidModalOpen(false);
    setBidAmount('');
    setSelectedListing(null);
  };

  const isMyListing = (listing: any) => principal === listing.patient;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Health Data Marketplace
          </h1>
          <p className="text-gray-600 mt-1">
            Discover and bid on anonymized health research data
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <DollarSign className="h-3 w-3 mr-1" />
            {filteredListings.length} Active Listings
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Listings</p>
              <div className="text-2xl font-bold text-gray-900">{mockListings.filter(l => l.status === 'active').length}</div>
              <p className="text-xs text-gray-500 mt-1">Active marketplace items</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Price</p>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(mockListings.reduce((sum, l) => sum + (l.currentHighestBid || l.minimumBid), 0) / mockListings.length) || 0} MT
              </div>
              <p className="text-xs text-gray-500 mt-1">Average bid value</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bids</p>
              <div className="text-2xl font-bold text-yellow-600">
                {mockListings.reduce((sum, l) => sum + l.bidCount, 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Across all listings</p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <div className="text-2xl font-bold text-blue-600">
                {Math.round((mockListings.filter(l => l.status === 'sold').length / mockListings.length) * 100) || 85}%
              </div>
              <p className="text-xs text-gray-500 mt-1">Listings sold</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full md:w-auto">
            <Filter className="mr-2 h-4 w-4" />
            More Filters
          </Button>
        </div>
      </Card>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredListings.map((listing) => {
          const timeLeft = listing.expiresAt - Date.now();
          const isOwner = isMyListing(listing);
          
          return (
            <Card key={listing.id} className="p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{listing.title}</h3>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary">{listing.category}</Badge>
                      {isOwner && <Badge variant="default">Your Listing</Badge>}
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-3">
                  {listing.description}
                </p>

                <div className="border-t border-b border-gray-200 py-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                      <Database className="h-3 w-3 mr-1.5" />
                      Data Points
                    </span>
                    <span className="font-medium">{listing.dataPoints.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1.5" />
                      Correctness
                    </span>
                    <span className="font-medium text-green-600">{listing.correctness}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                      <ShieldCheck className="h-3 w-3 mr-1.5" />
                      Anonymization
                    </span>
                    <span className="font-medium">{listing.anonymization}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-sm text-gray-500">Current Price</p>
                    <p className="text-2xl font-bold text-green-600">
                      {listing.currentHighestBid || listing.minimumBid} MT
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Bids</p>
                    <p className="text-lg font-semibold">{listing.bidCount}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>
                    {timeLeft > 0 
                      ? `Ends ${formatDistance(new Date(listing.expiresAt), new Date(), { addSuffix: true })}`
                      : 'Auction ended'
                    }
                  </span>
                </div>

                <div className="flex space-x-2">
                  {isOwner ? (
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => alert('View your listing details')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedListing(listing);
                          setBidModalOpen(true);
                        }}
                        disabled={userRole !== UserRoleValue.HealthcareProvider}
                      >
                        <Gavel className="mr-2 h-4 w-4" />
                        Place Bid
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredListings.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No listings found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        </Card>
      )}

      {/* Bid Modal */}
      <Dialog open={bidModalOpen} onOpenChange={setBidModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Place a Bid</DialogTitle>
            <DialogDescription>
              {selectedListing && `Bidding on "${selectedListing.title}"`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedListing && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Current Highest Bid</p>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedListing.currentHighestBid || selectedListing.minimumBid} MT
                    </p>
                  </div>
                  <Badge variant="secondary">{selectedListing.category}</Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="bidAmount">Your Bid (MT)</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  placeholder={`Minimum: ${(selectedListing.currentHighestBid || selectedListing.minimumBid) + 1}`}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum bid: {(selectedListing.currentHighestBid || selectedListing.minimumBid) + 1} MT
                </p>
              </div>

              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setBidModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePlaceBid}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  disabled={!bidAmount}
                >
                  <Gavel className="mr-2 h-4 w-4" />
                  Place Bid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marketplace;
