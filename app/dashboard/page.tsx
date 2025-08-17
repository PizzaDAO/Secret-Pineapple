'use client';

import { useRouter } from 'next/navigation';
import { useHypergraphAuth } from '@graphprotocol/hypergraph-react';
import { Button } from '@/Components/ui/button';

export default function DashboardPage() {
  const router = useRouter();
  const { authenticated, identity } = useHypergraphAuth();

  // Redirect if not authenticated
  if (!authenticated) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
        <p className="text-gray-600 mb-4">Welcome to your merchant dashboard!</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Receipts</h2>
            <p className="text-gray-600">Manage your receipts and transactions</p>
            <Button 
              className="mt-4" 
              onClick={() => router.push('/private-space')}
            >
              View Receipts
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Settings</h2>
            <p className="text-gray-600">Configure your merchant account</p>
            <Button className="mt-4" variant="outline">
              Settings
            </Button>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Analytics</h2>
            <p className="text-gray-600">View your business analytics</p>
            <Button className="mt-4" variant="outline">
              View Analytics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}