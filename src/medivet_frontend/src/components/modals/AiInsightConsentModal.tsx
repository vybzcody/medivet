import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Switch from '../ui/Switch';
import Label from '../ui/Label';
import { Activity, Check, Loader2 } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import { HealthRecord } from '../../types';

interface AiInsightConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsightGenerated: (insight: any) => void;
}

const AiInsightConsentModal: React.FC<AiInsightConsentModalProps> = ({ 
  open, 
  onOpenChange, 
  onInsightGenerated 
}) => {
  const { principal } = useAuthStore();
  const { records } = useHealthRecordStore();
  const [selectedRecords, setSelectedRecords] = useState<number[]>([]);
  const [generateMockInsight, setGenerateMockInsight] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [caption, setCaption] = useState('Encrypting...');

  // Filter user's records
  const userRecords = records.filter(record => record.owner === principal);

  const mockRecordOptions = userRecords.map(record => ({
    id: record.id,
    label: `${record.title} - ${new Date(record.record_date).toLocaleDateString()}`,
  }));

  const handleCheckboxChange = (recordId: number, checked: boolean) => {
    setSelectedRecords(prev =>
      checked ? [...prev, recordId] : prev.filter(id => id !== recordId)
    );
  };

  const runDemo = async () => {
    setProcessing(true);
    setProgress(0);

    const processingSteps = [
      { caption: 'Accessing selected records...', duration: 500 },
      { caption: 'Applying privacy-preserving techniques...', duration: 800 },
      { caption: 'Running diagnostic algorithms...', duration: 1200 },
      { caption: 'Cross-referencing medical literature...', duration: 700 },
      { caption: 'Generating insights...', duration: 800 },
    ];

    let totalDuration = 0;
    processingSteps.forEach(step => totalDuration += step.duration);

    let currentProgress = 0;
    for (const step of processingSteps) {
      setCaption(step.caption);
      const stepProgress = (step.duration / totalDuration) * 100;

      await new Promise(resolve => setTimeout(resolve, step.duration));
      currentProgress += stepProgress;
      setProgress(Math.min(currentProgress, 100));
    }

    setProcessing(false);
    setProgress(100);

    // Generate mock AI result
    const mockInsightData = {
      title: 'Health Trend Analysis',
      summary: 'Your health metrics show positive trends. Continue current lifestyle habits.',
      details: {
        overall_health: 'Good',
        risk_factors: 'Low',
        recommendations: [
          'Continue current diet and exercise routine',
          'Schedule annual check-up',
          'Monitor blood pressure regularly'
        ],
        data_points_analyzed: selectedRecords.length,
        confidence_score: '85%',
        disclaimer: 'This is a mock AI insight for demonstration purposes only and should not be used for medical decisions.'
      }
    };

    // Call the callback to show results
    onInsightGenerated(mockInsightData);

    // Close this modal
    onOpenChange(false);
    
    // Reset state
    setSelectedRecords([]);
    setGenerateMockInsight(true);
    setProgress(0);
    setCaption('Encrypting...');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>AI Health Insights Demo</span>
          </DialogTitle>
          <DialogDescription>
            Select data to analyze and generate a mock AI insight.
          </DialogDescription>
        </DialogHeader>

        {!processing ? (
          <div className="space-y-4">
            <div>
              <Label>Select Data for Analysis</Label>
              <div className="mt-2 space-y-2">
                {mockRecordOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">No records available for analysis.</p>
                ) : (
                  mockRecordOptions.map(option => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`record-${option.id}`}
                        checked={selectedRecords.includes(option.id)}
                        onCheckedChange={(checked) => handleCheckboxChange(option.id, !!checked)}
                      />
                      <Label htmlFor={`record-${option.id}`}>{option.label}</Label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p>Nothing leaves your browser unencrypted.</p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="generate-mock">Generate mock insight</Label>
              <Switch
                id="generate-mock"
                checked={generateMockInsight}
                onCheckedChange={setGenerateMockInsight}
              />
            </div>

            <Button
              onClick={runDemo}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
              disabled={selectedRecords.length === 0}
            >
              <Check className="mr-2 h-4 w-4" />
              Run Demo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-lg font-medium text-blue-600">{caption}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AiInsightConsentModal;
