import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Label from '../ui/Label';
import Badge from '../ui/Badge';
import { UserCircle, Stethoscope, Shield, ArrowRight } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import { UserRoleValue, UserRoleType } from '../../types';

interface RoleOption {
  type: UserRoleType;
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
  badge: string;
}

const Onboarding: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRoleType | null>(null);
  const [profileData, setProfileData] = useState<any>({});
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const roles: RoleOption[] = [
    {
      type: UserRoleValue.Patient,
      icon: UserCircle,
      title: 'Patient',
      description: 'Manage your health records and monetize your data',
      color: 'bg-blue-600',
      badge: 'Own Your Data'
    },
    {
      type: UserRoleValue.HealthcareProvider,
      icon: Stethoscope,
      title: 'Healthcare Provider',
      description: 'Access shared records and contribute to research',
      color: 'bg-green-600',
      badge: 'Research Access'
    },
    {
      type: UserRoleValue.Admin,
      icon: Shield,
      title: 'Administrator',
      description: 'Platform management and governance',
      color: 'bg-red-600',
      badge: 'Platform Control'
    }
  ];

  const handleRoleSelect = (role: UserRoleType) => {
    setSelectedRole(role);
    setProfileData({});
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData({ ...profileData, [field]: value });
  };

  const handleMockLogin = (roleType: UserRoleType) => {
    let mockProfile: any;
    let navigatePath: string;

    switch (roleType) {
      case UserRoleValue.Patient:
        mockProfile = {
          fullName: 'Mock Patient',
          dob: '1990-01-01',
          contact: 'mock.patient@example.com',
          emergency: 'Mock Emergency - +1 555-0000',
          monetizeEnabled: true
        };
        navigatePath = '/dashboard';
        break;
      case UserRoleValue.HealthcareProvider:
        mockProfile = {
          name: 'Dr. Mock Provider',
          license: 'MDMOCK123',
          specialty: 'General Practice',
          contact: 'mock.provider@example.com',
          whitelisted: true,
          reputation: 90,
          organization: 'Mock Clinic',
          lastInteraction: new Date().toISOString()
        };
        navigatePath = '/dashboard';
        break;
      case UserRoleValue.Admin:
        mockProfile = {
          name: 'Mock Admin',
          license: 'ADMINMOCK',
          specialty: 'System Admin',
          contact: 'mock.admin@example.com',
          whitelisted: true,
          reputation: 100,
          organization: 'MediVet Corp'
        };
        navigatePath = '/dashboard';
        break;
      default:
        return;
    }

    // Mock login process
    console.log('Mock login:', { role: roleType, profile: mockProfile });
    alert(`Welcome to MediVet! Logged in as ${roleType}`);
    navigate(navigatePath);
  };

  const handleSubmit = () => {
    if (!selectedRole) return;

    let profile: any;

    switch (selectedRole) {
      case UserRoleValue.Patient:
        profile = {
          fullName: profileData.fullName || 'Demo Patient',
          dob: profileData.dob || '1985-03-15',
          contact: profileData.contact || 'demo@patient.com',
          emergency: profileData.emergency || 'Emergency Contact',
          monetizeEnabled: true
        };
        break;
      case UserRoleValue.HealthcareProvider:
        profile = {
          name: profileData.name || 'Dr. Demo Provider',
          license: profileData.license || 'MD' + Date.now(),
          specialty: profileData.specialty || 'General Medicine',
          contact: profileData.contact || 'demo@provider.com',
          whitelisted: false,
          reputation: 85
        };
        break;
      case UserRoleValue.Admin:
        profile = {
          name: 'Admin User',
          license: 'ADMIN001',
          specialty: 'Platform Administration',
          contact: 'admin@medivet.com',
          whitelisted: true,
          reputation: 100
        };
        break;
      default:
        return;
    }

    console.log('Profile setup:', { role: selectedRole, profile });
    alert(`Welcome to MediVet! Logged in as ${selectedRole}`);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">MediVet</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Decentralized Medical Records with Data Monetization
          </p>
          <Badge variant="secondary" className="mt-2">
            Internet Computer • Privacy First • Patient Owned
          </Badge>
        </div>

        {!selectedRole ? (
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map((role) => {
              const Icon = role.icon;
              return (
                <Card 
                  key={role.type} 
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105"
                  onClick={() => handleRoleSelect(role.type)}
                >
                  <div className="p-6 text-center">
                    <div className={`w-16 h-16 ${role.color} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center justify-center space-x-2">
                      <span>{role.title}</span>
                      <Badge variant="secondary">{role.badge}</Badge>
                    </h3>
                    <p className="text-gray-600 mb-4">{role.description}</p>
                    <Button 
                      className="w-full" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMockLogin(role.type);
                      }}
                    >
                      Try Mock Login
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="max-w-md mx-auto">
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Complete Your Profile</h2>
                <p className="text-gray-600 mt-1">
                  {selectedRole === UserRoleValue.Admin 
                    ? 'Admin access will be granted automatically'
                    : 'Fill in your details to get started'
                  }
                </p>
              </div>
              
              <div className="space-y-4">
                {selectedRole === UserRoleValue.Patient && (
                  <>
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        placeholder="Enter your full name"
                        value={profileData.fullName || ''}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact">Email</Label>
                      <Input
                        id="contact"
                        type="email"
                        placeholder="your.email@example.com"
                        value={profileData.contact || ''}
                        onChange={(e) => handleInputChange('contact', e.target.value)}
                      />
                    </div>
                  </>
                )}
                
                {selectedRole === UserRoleValue.HealthcareProvider && (
                  <>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Dr. Your Name"
                        value={profileData.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="specialty">Specialty</Label>
                      <Input
                        id="specialty"
                        placeholder="e.g., Cardiology, General Medicine"
                        value={profileData.specialty || ''}
                        onChange={(e) => handleInputChange('specialty', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact">Contact Email</Label>
                      <Input
                        id="contact"
                        type="email"
                        placeholder="doctor@clinic.com"
                        value={profileData.contact || ''}
                        onChange={(e) => handleInputChange('contact', e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="flex space-x-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedRole(null)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                  >
                    {selectedRole === UserRoleValue.Admin ? 'Access Admin Panel' : 'Complete Setup'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
