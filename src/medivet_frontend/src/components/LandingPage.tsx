import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, isLoading } = useAuthStore();
  
  useEffect(() => {
    console.log('LandingPage useEffect - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('LandingPage: User is authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    try {
      await login();
      // Redirect will happen automatically via the useEffect above
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-4">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center">
            <img 
              src="/logo2.svg" 
              alt="MediVet Logo" 
              className="h-10 w-auto mr-3" 
            />
            <h1 className="text-3xl font-bold text-blue-800">MediVet</h1>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Login with Internet Identity'}
          </button>
        </header>

        <main className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              Secure Healthcare Records on the Internet Computer
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              MediVet provides a secure, decentralized platform for managing healthcare records
              with end-to-end encryption and granular access control.
            </p>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-100 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">End-to-End Encryption</h3>
                  <p className="text-gray-600">Your health data is encrypted on your device before being stored.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Granular Access Control</h3>
                  <p className="text-gray-600">Share specific records with healthcare providers of your choice.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Comprehensive Audit Logs</h3>
                  <p className="text-gray-600">Track every access to your health records.</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-lg font-medium disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Get Started Now'}
            </button>
          </div>
          <div className="hidden md:block">
            <img 
              src="/hero.png" 
              alt="Healthcare illustration" 
              className="w-full h-auto" 
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
