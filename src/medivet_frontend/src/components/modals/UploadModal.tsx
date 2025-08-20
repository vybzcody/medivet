import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/Dialog';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Label from '../ui/Label';
import Textarea from '../ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { UploadCloud, FileText, Check } from 'lucide-react';
import useAuthStore from '../../stores/useAuthStore';
import useHealthRecordStore from '../../stores/useHealthRecordStore';
import { useToast } from '../../hooks/useToast';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ open, onOpenChange }) => {
  const { principal } = useAuthStore();
  const { createRecord } = useHealthRecordStore();
  const { showSuccess, showError, showWarning } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    status: 'Monetizable'
  });

  const categories = [
    'General Health',
    'Cardiology',
    'Diabetes Care',
    'Laboratory',
    'Mental Health',
    'Dermatology',
    'Orthopedics',
    'Neurology',
    'Other'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadingFiles(files);
  };

  const handleUpload = async () => {
    if (!principal || !formData.title || !formData.category) {
      showWarning('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (uploadingFiles.length === 0) {
      showWarning('No Files Selected', 'Please select at least one file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    // Simulate file upload with progress
    for (let i = 0; i <= 100; i += 10) {
      setUploadProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      // Create the health record using the store (this will handle encryption)
      const recordId = await createRecord(
        formData.title,
        formData.category,
        'Self-Upload', // provider
        formData.category, // recordType
        formData.description || `Uploaded files: ${uploadingFiles.map(f => f.name).join(', ')}`
      );

      setUploading(false);
      setUploadProgress(0);
      
      showSuccess(
        'Upload Successful!',
        `Health record "${formData.title}" uploaded and encrypted. Record ID: ${recordId}`
      );
    } catch (error) {
      console.error('Error creating health record:', error);
      setUploading(false);
      setUploadProgress(0);
      showError(
        'Upload Failed',
        error instanceof Error ? error.message : 'Failed to upload health record. Please try again.'
      );
      return;
    }
    
    onOpenChange(false);
    setFormData({
      title: '',
      category: '',
      description: '',
      status: 'Monetizable'
    });
    setUploadingFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UploadCloud className="h-5 w-5" />
            <span>Upload Health Record</span>
          </DialogTitle>
          <DialogDescription>
            Securely upload and encrypt your medical data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Annual Physical Exam 2024"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Additional notes or context..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="status">Monetization Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monetizable">Monetizable - Can be sold on marketplace</SelectItem>
                <SelectItem value="NonMonetizable">Non-Monetizable - Private only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File upload area */}
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors hover:border-blue-500 cursor-pointer"
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">
              Drop files here or click to browse
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button variant="outline" size="sm">
              Choose Files
            </Button>
            {uploadingFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Selected files:</p>
                {uploadingFiles.map((file, index) => (
                  <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-center text-gray-600">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              disabled={uploading || !formData.title || !formData.category || uploadingFiles.length === 0}
            >
              {uploading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Encrypting...</span>
                </div>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Upload Record
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadModal;
