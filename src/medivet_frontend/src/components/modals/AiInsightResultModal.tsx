import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Activity, Save, Download } from 'lucide-react';

interface AiInsightResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insightData: any;
}

const AiInsightResultModal: React.FC<AiInsightResultModalProps> = ({ 
  open, 
  onOpenChange, 
  insightData 
}) => {
  const handleSave = () => {
    // In a real app, this would save to local storage or user preferences
    console.log('Insight saved to local device!');
    // Show success message (you can integrate with your toast system)
    alert('Insight saved to your local device!');
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(insightData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ai_insight.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    console.log('Insight data exported as JSON!');
    alert('Insight data exported as JSON!');
  };

  if (!insightData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>AI Insight: {insightData.title}</span>
          </DialogTitle>
          <DialogDescription>
            Here's the AI-generated insight based on your selected data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-4">
              <h3 className="font-semibold text-lg text-gray-900">{insightData.summary}</h3>
            </div>
            <div className="space-y-2">
              {Object.entries(insightData.details).map(([key, value]) => {
                if (key === 'recommendations') return null; // Handle separately
                if (key === 'disclaimer') return null; // Handle separately
                
                return (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="font-medium capitalize text-gray-700">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-gray-900">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                );
              })}
              
              {insightData.details.recommendations && (
                <div className="mt-4">
                  <p className="font-medium text-sm mb-2 text-gray-700">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {insightData.details.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {insightData.details.disclaimer && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-gray-700">
              <p className="font-medium text-yellow-800">Disclaimer:</p>
              <p className="text-yellow-700">{insightData.details.disclaimer}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleSave}
              className="flex-1"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Insight
            </Button>
            <Button 
              onClick={handleExport}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data (JSON)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AiInsightResultModal;
