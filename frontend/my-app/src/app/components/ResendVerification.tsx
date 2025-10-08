'use client';

import { useState } from 'react';

interface ResendVerificationProps {
  email?: string;
  onSuccess?: () => void;
}

export default function ResendVerification({ email: initialEmail, onSuccess }: ResendVerificationProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const resendVerification = async () => {
    if (!email.trim()) {
      setMessage('Please enter your email address');
      return;
    }

    setIsResending(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Verification email sent! Please check your inbox.');
        onSuccess?.();
        setTimeout(() => {
          setShowForm(false);
          setMessage('');
        }, 3000);
      } else {
        setMessage(data.detail || 'Failed to resend verification email');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-blue-400 hover:text-blue-300 text-sm underline"
      >
        Didn't receive verification email?
      </button>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg w-64">
      <h3 className="text-white text-sm font-medium mb-3">Resend Verification Email</h3>
      
      <div className="space-y-3">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-600 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        {message && (
          <p className={`text-xs ${message.includes('sent') ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={resendVerification}
            disabled={isResending}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={() => {
              setShowForm(false);
              setMessage('');
            }}
            className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}