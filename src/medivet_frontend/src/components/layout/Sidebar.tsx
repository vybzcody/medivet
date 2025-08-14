import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import Button from '../ui/Button';
import {
  FileText,
  User,
  ShoppingCart,
  Activity,
  Shield,
  DollarSign,
  Users,
  CreditCard,
  Store,
  History
} from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import { UserRoleValue } from '../../types';

const Sidebar: React.FC = () => {
  const { userRole } = useAuthStore();
  const location = useLocation();

  const getNavigationItems = () => {
    if (!userRole) return [];

    switch (userRole) {
      case UserRoleValue.Patient:
        return [
          { icon: Activity, label: 'Dashboard', path: '/dashboard' },
          { icon: User, label: 'Profile', path: '/profile' },
          { icon: CreditCard, label: 'Billing', path: '/billing' },
          { icon: Store, label: 'Marketplace', path: '/marketplace' },
        ];
      case UserRoleValue.HealthcareProvider:
        return [
          { icon: FileText, label: 'Dashboard', path: '/dashboard' },
          { icon: ShoppingCart, label: 'Purchased', path: '/purchased' },
          { icon: Store, label: 'Marketplace', path: '/marketplace' },
          { icon: User, label: 'Profile', path: '/profile' },
        ];
      default:
        return [
          { icon: Shield, label: 'Admin Panel', path: '/admin' },
          { icon: Users, label: 'Users', path: '/users' },
          { icon: User, label: 'Profile', path: '/profile' },
          { icon: Store, label: 'Marketplace', path: '/marketplace' },
        ];
    }
  };

  const navigationItems = getNavigationItems();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive ? "primary" : "ghost"}
                className={`w-full justify-start transition-colors duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
