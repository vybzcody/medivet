import React from 'react';
import Card from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import Badge from '../ui/Badge';
import { DollarSign, TrendingUp, Calendar, FileText } from 'lucide-react';

interface BillingTransaction {
  id: string;
  recordTitle: string;
  date: string;
  buyer: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed';
}

// Mock data - in real app this would come from stores
const mockBillingData: BillingTransaction[] = [
  {
    id: 'txn_1',
    recordTitle: 'Annual Physical Exam 2024',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    buyer: 'Dr. Emily Carter',
    amount: 75.50,
    status: 'Completed',
  },
  {
    id: 'txn_2',
    recordTitle: 'Blood Glucose Monitoring Data',
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    buyer: 'Wellness Research Group',
    amount: 120.00,
    status: 'Completed',
  },
  {
    id: 'txn_3',
    recordTitle: 'Cardiology Consultation Notes',
    date: new Date(Date.now() - 86400000 * 10).toISOString(),
    buyer: 'Heartbeat Analytics Inc.',
    amount: 250.75,
    status: 'Completed',
  },
  {
    id: 'txn_4',
    recordTitle: 'Dermatology Photo Set',
    date: new Date(Date.now() - 86400000 * 15).toISOString(),
    buyer: 'Dr. John Smith',
    amount: 95.25,
    status: 'Pending',
  },
];

const PatientBilling: React.FC = () => {
  const totalEarnings = mockBillingData
    .filter(item => item.status === 'Completed')
    .reduce((acc, item) => acc + item.amount, 0);

  const completedTransactions = mockBillingData.filter(item => item.status === 'Completed').length;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Pending': return 'warning';
      case 'Failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing History</h1>
        <p className="text-gray-600 mt-1">
          Review your earnings from monetized health records.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <div className="text-2xl font-bold text-green-600">${totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                from {completedTransactions} completed transactions
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <div className="text-2xl font-bold text-blue-600">
                ${mockBillingData
                  .filter(item => item.status === 'Completed' &&
                    new Date(item.date) > new Date(Date.now() - 30 * 86400000))
                  .reduce((acc, item) => acc + item.amount, 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                +12% from last month
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <div className="text-2xl font-bold text-yellow-600">
                ${mockBillingData
                  .filter(item => item.status === 'Pending')
                  .reduce((acc, item) => acc + item.amount, 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {mockBillingData.filter(item => item.status === 'Pending').length} transactions
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction History */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Transaction History
          </h2>
          <p className="text-gray-600 mt-1">A log of all your data sales.</p>
        </div>

        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockBillingData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.recordTitle}</TableCell>
                  <TableCell>{item.buyer}</TableCell>
                  <TableCell className="text-right font-medium">${item.amount.toFixed(2)}</TableCell>
                  <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status) as any}>
                      {item.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {mockBillingData.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-600">
              Start monetizing your health records to see transactions here.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PatientBilling;
