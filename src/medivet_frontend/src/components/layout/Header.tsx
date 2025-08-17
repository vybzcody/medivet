import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { Avatar, AvatarFallback } from '../ui/Avatar';
import PrincipalPill from '../ui/PrincipalPill';
import { LogOut, Sun, Moon, User, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import useAuthStore from '../../stores/useAuthStore';
import useProfileStore from '../../stores/useProfileStore';
import useUserMappingStore from '../../stores/useUserMappingStore';
import { UserRoleValue } from '../../types';

const Header: React.FC = () => {
  const { principal, userRole, logout } = useAuthStore();
  const { patientProfile, healthcareProviderProfile } = useProfileStore();
  const { addOrUpdateUser, getDisplayName } = useUserMappingStore();
  const [isDark, setIsDark] = useState(false);

  // Update user mapping when profile data is available
  useEffect(() => {
    if (!principal) return;

    let fullName = '';
    let username = '';

    if (userRole === UserRoleValue.Patient && patientProfile?.full_name) {
      fullName = patientProfile.full_name;
      // Generate a simple username from the full name
      username = fullName.toLowerCase().replace(/\s+/g, '.');
    } else if (userRole === UserRoleValue.HealthcareProvider && healthcareProviderProfile?.full_name) {
      fullName = healthcareProviderProfile.full_name;
      // Generate a simple username from the full name
      username = `dr.${fullName.toLowerCase().replace(/\s+/g, '.')}`;
    }

    if (fullName) {
      addOrUpdateUser(principal, {
        fullName,
        username,
        role: userRole || undefined,
      });
    }
  }, [principal, userRole, patientProfile, healthcareProviderProfile, addOrUpdateUser]);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const getUserInitials = () => {
    if (!principal) return 'U';
    
    if (userRole === UserRoleValue.Patient && patientProfile?.full_name) {
      return patientProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    } else if (userRole === UserRoleValue.HealthcareProvider && healthcareProviderProfile?.full_name) {
      return healthcareProviderProfile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    
    return 'U';
  };

  const getUserName = () => {
    if (!principal) return 'User';
    
    if (userRole === UserRoleValue.Patient && patientProfile?.full_name) {
      return patientProfile.full_name;
    } else if (userRole === UserRoleValue.HealthcareProvider && healthcareProviderProfile?.full_name) {
      return healthcareProviderProfile.full_name;
    }
    
    return 'User';
  };

  const getProfileLink = () => {
    return '/profile';
  };

  const getRoleDisplayName = () => {
    switch (userRole) {
      case UserRoleValue.Patient:
        return 'Patient';
      case UserRoleValue.HealthcareProvider:
        return 'Provider';
      default:
        return 'User';
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">MediVet</h1>
          </Link>
          <div className="hidden md:flex items-center space-x-1 text-sm text-gray-500">
            <span>•</span>
            <span className="capitalize">{getRoleDisplayName()}</span>
            {userRole === UserRoleValue.HealthcareProvider && (
              <>
                <span>•</span>
                <span className="text-green-600">Verified</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Principal Pill for easy sharing */}
          {principal && (
            <div className="hidden sm:block">
              <PrincipalPill 
                principal={principal}
                variant="compact"
                showRole={true}
                className="transition-transform hover:scale-105"
              />
            </div>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="transition-colors duration-200"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-600 text-white text-xs">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium">
                  {getUserName()}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <Link to={getProfileLink()}>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
