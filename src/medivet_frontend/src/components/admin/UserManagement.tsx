import React, { useState } from 'react';
import Card from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/DropdownMenu';
import ConfirmationDialog from '../ui/ConfirmationDialog';

const mockUsers = [
  {
    id: 'usr_1',
    name: 'Alice Johnson',
    email: 'alice.j@email.com',
    role: 'Patient',
    status: 'Active',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'usr_2',
    name: 'Dr. Emily Carter',
    email: 'emily.carter@med.pro',
    role: 'Provider',
    status: 'Verified',
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: 'usr_3',
    name: 'Bob Williams',
    email: 'bobbyw@email.com',
    role: 'Patient',
    status: 'Active',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'usr_4',
    name: 'Dr. John Smith',
    email: 'john.smith@clinic.co',
    role: 'Provider',
    status: 'Pending',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'usr_5',
    name: 'System Administrator',
    email: 'admin@medivet.com',
    role: 'Admin',
    status: 'Active',
    createdAt: new Date(Date.now() - 86400000 * 100).toISOString(),
  },
];

const UserManagement: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ 
    title: '', 
    description: '', 
    onConfirm: () => {} 
  });

  const openConfirmationDialog = (title: string, description: string, onConfirm: () => void) => {
    setDialogConfig({ title, description, onConfirm });
    setDialogOpen(true);
  };

  const handleSuspendUser = (userName: string) => {
    openConfirmationDialog(
      'Suspend User?',
      `Are you sure you want to suspend ${userName}? They will lose access to the platform.`,
      () => alert('User suspension feature not implemented yet.')
    );
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Admin': return 'destructive';
      case 'Provider': return 'primary';
      case 'Patient': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Verified':
      case 'Active': return 'success';
      case 'Pending': return 'warning';
      case 'Suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">
          View and manage all users on the platform.
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
          <p className="text-gray-600 mt-1">A list of all registered users.</p>
        </div>
        <div className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registration Date</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role) as any}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(user.status) as any}>
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Edit User</DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleSuspendUser(user.name)}
                        >
                          Suspend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        onConfirm={dialogConfig.onConfirm}
        variant="destructive"
      />
    </div>
  );
};

export default UserManagement;
