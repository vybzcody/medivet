import React, { useState } from 'react';
import ImprovedOnboardingModal from '../onboarding/ImprovedOnboardingModal';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Eye, Palette, Zap } from 'lucide-react';

/**
 * OnboardingDemo component showcases the improved onboarding flow
 * This is a demo component to test the UI without backend dependencies
 */
const OnboardingDemo: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            MediVet Onboarding UI Demo
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Experience the improved onboarding flow with modern UI components
          </p>
          
          <Button
            onClick={() => setShowModal(true)}
            size="lg"
            className="px-8 py-4 text-lg"
          >
            Launch Onboarding Demo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center" hover>
            <Eye className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Enhanced UX</h3>
            <p className="text-gray-600 text-sm">
              Improved user experience with progress tracking, better form validation, and smooth transitions.
            </p>
          </Card>

          <Card className="text-center" hover>
            <Palette className="w-12 h-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Modern Design</h3>
            <p className="text-gray-600 text-sm">
              Clean, modern interface with consistent styling, proper spacing, and accessible components.
            </p>
          </Card>

          <Card className="text-center" hover>
            <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reusable Components</h3>
            <p className="text-gray-600 text-sm">
              Built with reusable UI components that maintain consistency across the application.
            </p>
          </Card>
        </div>

        <Card>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Improvements Made</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Progress Tracking</h4>
                <p className="text-gray-600 text-sm">Added visual progress steps to guide users through the onboarding process.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Enhanced Form Components</h4>
                <p className="text-gray-600 text-sm">Created reusable FormInput, Button, and Card components with consistent styling.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Better Visual Hierarchy</h4>
                <p className="text-gray-600 text-sm">Organized information into logical sections with clear headings and proper spacing.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Loading States & Animations</h4>
                <p className="text-gray-600 text-sm">Added smooth transitions, hover effects, and proper loading indicators.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Improved Accessibility</h4>
                <p className="text-gray-600 text-sm">Better form labels, error handling, and keyboard navigation support.</p>
              </div>
            </div>
          </div>
        </Card>

        <ImprovedOnboardingModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      </div>
    </div>
  );
};

export default OnboardingDemo;
