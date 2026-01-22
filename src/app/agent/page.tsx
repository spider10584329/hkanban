'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Helper function to decode JWT token
function decodeToken(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export default function AgentPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [agentId, setAgentId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    // Decode token to get agent ID
    const decodedToken = decodeToken(token || '');
    if (decodedToken) {
      setAgentId(decodedToken.userId);
    }

    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, [router]);

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
      
      {/* Welcome Section with Admin ID */}
      <div className="bg-white rounded-lg shadow p-6 h-[calc(100vh-190px)]">
        
      </div>
    </div>
  );
}
