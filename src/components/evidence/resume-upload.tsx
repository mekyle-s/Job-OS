'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';

type UploadState = 'idle' | 'uploading' | 'complete' | 'error';

type ResumeUploadProps = {
  onUploadComplete: (sourceId: string) => void;
};

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

export function ResumeUpload({ onUploadComplete }: ResumeUploadProps) {
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a PDF or DOCX file.';
    }

    // Check file extension as backup
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return 'Invalid file extension. Please upload a PDF or DOCX file.';
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${formatFileSize(file.size)}). Maximum size is 4 MB.`;
    }

    return null;
  };

  const handleUpload = async (file: File) => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setState('error');
      return;
    }

    // Reset error and set uploading state
    setError(null);
    setState('uploading');

    try {
      // Create FormData and upload
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/evidence/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Success - notify parent with sourceId
      setState('complete');
      onUploadComplete(data.sourceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload file';
      setError(message);
      setState('error');
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (state === 'idle' || state === 'error') {
      fileInputRef.current?.click();
    }
  };

  const handleTryAgain = () => {
    setState('idle');
    setError(null);
  };

  // Uploading state
  if (state === 'uploading') {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-700 font-medium">Uploading...</p>
          <p className="text-sm text-gray-500 mt-1">Please wait while we upload your resume</p>
        </div>
      </div>
    );
  }

  // Complete state
  if (state === 'complete') {
    return (
      <div className="border-2 border-green-300 rounded-lg p-8 text-center bg-green-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-green-800 font-medium">Upload successful!</p>
          <p className="text-sm text-green-700 mt-1">Starting resume parsing...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="border-2 border-red-300 rounded-lg p-8 text-center bg-red-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-red-800 font-medium mb-2">Upload failed</p>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={handleTryAgain}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Idle state - drop zone
  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
        isDragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />
      <div className="flex flex-col items-center">
        <svg
          className="w-12 h-12 text-gray-400 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-gray-700 font-medium mb-1">Drop your resume here or click to browse</p>
        <p className="text-sm text-gray-500">PDF or DOCX, max 4 MB</p>
      </div>
    </div>
  );
}
