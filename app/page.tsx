'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LoginButton } from '@/Components/Login/LoginButton';
import { Button } from '@/Components/ui/button';
import {
  useHypergraphApp,
  useHypergraphAuth,
} from '@graphprotocol/hypergraph-react';

export default function HomePage() {
  const navigation = useRouter();

  const { authenticated } = useHypergraphAuth();
  const { redirectToConnect, logout } = useHypergraphApp();

  // Redirect to merchant account creation after authentication
  useEffect(() => {
    if (authenticated) {
      navigation.push('/create-merchant-account');
    }
  }, [authenticated, navigation]);

  const handleSignIn = () => {
    redirectToConnect({
      storage: localStorage,
      connectUrl: 'https://connect.geobrowser.io/',
      successUrl: `${window.location.origin}/authenticate-success`,
      redirectFn: (url: URL) => {
        window.location.href = url.toString();
      },
    });
    
  };
  
  const handleLogout = () => {
    logout();
    navigation.push('/');
  };

  return (
    <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center">
      <div className="container mx-auto px-4 py-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/secretPineapple-logo.png"
            alt="Secret Pineapple Logo"
            width={400}
            height={300}
            priority
            className="mx-auto"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
          {authenticated ? (
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          ) : (
            <Button onClick={handleSignIn}>Sign in</Button>
          )}
        </div>
      </div>
    </div>
  );
}
