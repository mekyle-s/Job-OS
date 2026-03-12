'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ParseStatus = 'pending' | 'processing' | 'completed' | 'failed';

type StatusResponse = {
  status: ParseStatus;
  error?: string | null;
  itemCount?: number;
};

type ParseStatusProps = {
  sourceId: string;
};

export function ParseStatus({ sourceId }: ParseStatusProps) {
  const [status, setStatus] = useState<StatusResponse>({ status: 'pending' });
  const [dots, setDots] = useState('');
  const router = useRouter();

  // Poll for status updates
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/evidence/status/${sourceId}`);
        if (response.ok) {
          const data: StatusResponse = await response.json();
          setStatus(data);

          // Stop polling on terminal states
          if (data.status === 'completed' || data.status === 'failed') {
            clearInterval(pollInterval);

            // Auto-redirect after 3 seconds on completion
            if (data.status === 'completed') {
              setTimeout(() => {
                router.push('/dashboard/evidence');
              }, 3000);
            }
          }
        }
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    };

    // Initial poll
    pollStatus();

    // Poll every 2 seconds
    pollInterval = setInterval(pollStatus, 2000);

    // Cleanup
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sourceId, router]);

  // Animated dots for processing state
  useEffect(() => {
    if (status.status === 'processing') {
      const dotsInterval = setInterval(() => {
        setDots((prev) => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);

      return () => clearInterval(dotsInterval);
    }
  }, [status.status]);

  // Pending state
  if (status.status === 'pending') {
    return (
      <div className="border-2 border-blue-300 rounded-lg p-8 text-center bg-blue-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-blue-800 font-medium">Queued for parsing...</p>
          <p className="text-sm text-blue-700 mt-1">Your resume will be processed shortly</p>
        </div>
      </div>
    );
  }

  // Processing state
  if (status.status === 'processing') {
    return (
      <div className="border-2 border-blue-300 rounded-lg p-8 text-center bg-blue-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-blue-800 font-medium">
            Parsing your resume with AI
            <span className="inline-block w-6 text-left">{dots}</span>
          </p>
          <p className="text-sm text-blue-700 mt-1">This may take a minute</p>
        </div>
      </div>
    );
  }

  // Completed state
  if (status.status === 'completed') {
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
          <p className="text-green-800 font-medium mb-1">Resume parsed successfully!</p>
          <p className="text-sm text-green-700 mb-4">
            {status.itemCount} evidence {status.itemCount === 1 ? 'item' : 'items'} found.
          </p>
          <Link
            href="/dashboard/evidence"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
          >
            View Evidence
          </Link>
          <p className="text-xs text-green-600 mt-2">Redirecting automatically in 3 seconds...</p>
        </div>
      </div>
    );
  }

  // Failed state
  if (status.status === 'failed') {
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-red-800 font-medium mb-2">Parsing failed</p>
          <p className="text-sm text-red-700 mb-4">
            {status.error || 'An error occurred during parsing'}
          </p>
          <Link
            href="/dashboard/evidence/upload"
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
          >
            Try uploading again
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
