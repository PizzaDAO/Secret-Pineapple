'use client';

import { useHypergraphApp, useHypergraphAuth, useSpace } from '@graphprotocol/hypergraph-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLayoutEffect, useState, useEffect } from 'react';
import { LoginButton } from '@/Components/Login/LoginButton';

import { SpacesMenu } from './SpacesMenu';
import { Button } from './ui/button';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './ui/NavigationMenu';

export function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const navigation = useRouter();
  const pathname = usePathname();

  const { authenticated } = useHypergraphAuth();
  const { redirectToConnect, logout } = useHypergraphApp();

  useLayoutEffect(() => {
    if (
      pathname.startsWith('/login') ||
      pathname.startsWith('/authenticate-success') ||
      pathname === '/' ||
      pathname === '/explore-public-knowledge' ||
      pathname === '/explore-public-knowledge/projects' ||
      pathname === '/explore-public-knowledge/dapps' ||
      pathname === '/explore-public-knowledge/investors' ||
      pathname === '/explore-public-knowledge/investment-rounds' ||
      pathname === '/explore-public-knowledge/assets'
    ) {
      return;
    }

    // Only redirect to login if not authenticated and not already on login page
    if (!authenticated) {
      void navigation.push('/login');
    }
  }, [authenticated, pathname, navigation]);

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
    navigation.push('/login');
  };

  return (
    <div className="min-h-full flex flex-col">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-[9998]">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <NavigationMenu viewport={false}>
              <NavigationMenuList>

                <NavigationMenuItem>
                  <NavigationMenuTrigger>My Spaces</NavigationMenuTrigger>
                  {authenticated ? (
                    <SpacesMenu />
                  ) : (
                    <NavigationMenuContent>
                      <div className="w-[240px] py-4 text-center text-muted-foreground">
                        <p>
                          Sign in to access your
                          <br />
                          private and public spaces
                        </p>
                      </div>
                    </NavigationMenuContent>
                  )}
                </NavigationMenuItem>
              </NavigationMenuList>

              <LoginButton />


            </NavigationMenu>

            {/* Auth Button */}
            <div className="flex items-center space-x-4">
              {authenticated ? (
                <Button onClick={handleLogout} variant="outline">
                  Logout
                </Button>
              ) : (
                <Button onClick={handleSignIn}>Sign in with Geo Connect</Button>
              )}
            </div>
          </div>
        </div>
      </nav >
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div >
  );
}
