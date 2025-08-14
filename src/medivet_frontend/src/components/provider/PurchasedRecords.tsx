import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import Badge from '../ui/Badge';
import { Eye, FileText } from 'lucide-react';
import Button from '../ui/Button';

const mockPurchasedRecords = [
  {
    id: 2,
    title: 'Blood Glucose Monitoring',
    category: 'Diabetes Care',
    purchaseDate: new Date(Date.now() - 86400000 * 1).toISOString(),
    price: 120.00,
  },
  {
    id: 4,
    title: 'Lab Results - Lipid Panel',
    category: 'Laboratory',
    purchaseDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    price: 85.50,
  },
  {
    id: 1,
    title: 'Annual Physical Exam 2024',
    category: 'General Health',
    purchaseDate: new Date(Date.now() - 86400000 * 8).toISOString(),
    price: 75.00,
  },
  {
    id: 6,
    title: 'Cardiology Consultation Notes',
    category: 'Cardiology',
    purchaseDate: new Date(Date.now() - 86400000 * 15).toISOString(),
    price: 200.00,
  },
  {
    id: 8,
    title: 'Mental Health Assessment',
    category: 'Mental Health',
    purchaseDate: new Date(Date.now() - 86400000 * 22).toISOString(),
    price: 150.00,
  },
];

const PurchasedRecords: React.FC = () => {
  const totalSpent = mockPurchasedRecords.reduce((sum, record) => sum + record.price, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchased Records</h1>
          <p className="text-gray-600 mt-1">
            Access and review the health data you have acquired.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Spent</p>
          <p className="text-2xl font-bold text-green-600">${totalSpent.toFixed(2)}</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <div className="text-2xl font-bold text-gray-900">{mockPurchasedRecords.length}</div>
              <p className="text-xs text-gray-500 mt-1">Purchased datasets</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <div className="text-2xl font-bold text-green-600">
                ${mockPurchasedRecords
                  .filter(r => new Date(r.purchaseDate) > new Date(Date.now() - 30 * 86400000))
                  .reduce((sum, r) => sum + r.price, 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Recent purchases</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <div className="text-2xl font-bold text-purple-600">
                {new Set(mockPurchasedRecords.map(r => r.category)).size}
              </div>
              <p className="text-xs text-gray-500 mt-1">Different specialties</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Acquired Data</h2>
          <p className="text-gray-600 mt-1">A list of all health records you have purchased.</p>
        </div>
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockPurchasedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{record.category}</Badge>
                  </TableCell>
                  <TableCell>{new Date(record.purchaseDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-medium">${record.price.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Link to={`/record/${record.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {mockPurchasedRecords.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchased records</h3>
            <p className="text-gray-600 mb-4">
              You haven't purchased any health records yet.
            </p>
            <Link to="/marketplace">
              <Button>Browse Marketplace</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PurchasedRecords;
