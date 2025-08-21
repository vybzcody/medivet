import React, { useState } from 'react';
import { createAuthenticatedActor } from '../services/actorService';
import useAuthStore from '../stores/useAuthStore';
import Button from './ui/Button';
import Card from './ui/Card';

const TestProviderData: React.FC = () => {
  const { identity, principal } = useAuthStore();
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testSharedRecords = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      if (!identity || !principal) {
        throw new Error('Not authenticated');
      }

      console.log('🧪 Testing shared records with principal:', principal.toString());
      
      // Get authenticated actor
      const { actor } = await createAuthenticatedActor(identity);
      
      // Test the backend call
      const result = await actor.getSharedHealthRecords();
      
      console.log('🧪 Raw backend result:', result);
      
      if ('ok' in result) {
        setTestResult({
          success: true,
          recordsCount: result.ok.length,
          records: result.ok,
          principal: principal.toString()
        });
      } else {
        setError(result.err || 'Unknown error');
      }
    } catch (err: any) {
      console.error('🧪 Test error:', err);
      setError(err.message);
    }
    
    setIsLoading(false);
  };

  const testUserInfo = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);

    try {
      if (!identity) {
        throw new Error('Not authenticated');
      }

      const { actor } = await createAuthenticatedActor(identity);
      const userResult = await actor.getUser();
      
      console.log('🧪 User info result:', userResult);
      
      if ('ok' in userResult) {
        setTestResult({
          success: true,
          user: userResult.ok,
          principal: principal?.toString()
        });
      } else {
        setError(userResult.err || 'Unknown error');
      }
    } catch (err: any) {
      console.error('🧪 User test error:', err);
      setError(err.message);
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="p-6 bg-blue-50 border-blue-200">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-blue-800">
          🧪 Provider Data Test
        </h2>
        <p className="text-blue-700 text-sm mt-1">
          Test the provider data fetching functionality
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={testUserInfo}
            disabled={isLoading}
            size="sm"
          >
            Test User Info
          </Button>
          <Button 
            onClick={testSharedRecords}
            disabled={isLoading}
            size="sm"
          >
            Test Shared Records
          </Button>
        </div>
        
        {isLoading && (
          <div className="text-blue-600">Loading...</div>
        )}
        
        {error && (
          <div className="text-red-600 bg-red-50 p-2 rounded">
            Error: {error}
          </div>
        )}
        
        {testResult && (
          <div className="mt-4">
            <strong>Test Result:</strong>
            <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-x-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TestProviderData;
