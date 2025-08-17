'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/Components/ui/button';
import { useHypergraphAuth, useSpaces, HypergraphSpaceProvider, useQuery, useCreateEntity, useSpace } from '@graphprotocol/hypergraph-react';

import { Store } from '@/app/schema';
import { useSelector } from '@xstate/store/react';


export default function PrivateSpaceWrapper() {
    const { data: privateSpaces, isPending: privateSpacesPending } = useSpaces({ mode: 'private' });
    const isLoading = privateSpacesPending;

    if (isLoading) {
        return (
            <ul className="grid w-[300px] gap-3 p-4">
                <li className="text-sm text-muted-foreground">Loading spaces...</li>
            </ul>
        );
    }


    if (!privateSpaces || privateSpaces.length === 0) {
        return (
            <ul className="grid w-[300px] gap-3 p-4">
                <li className="text-sm text-muted-foreground">No private spaces found</li>
            </ul>
        );
    }

    console.log('privateSpaces: ', privateSpaces?.[0]?.id);


    return (
        <HypergraphSpaceProvider space={privateSpaces?.[0]?.id}>
            <CreateMerchantAccountPage />
        </HypergraphSpaceProvider>
    );
}

function CreateMerchantAccountPage() {
    const { name, ready, id: spaceId } = useSpace({ mode: 'private' });

    console.log('Creating merchant account for spaceId:', spaceId);
    const router = useRouter();
    const { authenticated, identity } = useHypergraphAuth();

    const [businessName, setBusinessName] = useState('');
    const { data: store } = useQuery(Store, { mode: 'private' });
    //console.log('Store data:', store);

    const createStore = useCreateEntity(Store);

    // Redirect if not authenticated
    if (!authenticated) {
        router.push('/');
        return null;
    }


    if (store.length > 0) {
        console.log('Store already exists:', store);
        router.push('/dashboard');
    }


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log('spaceId:', spaceId);
        // TODO: Here you would typically save the merchant account data
        // For now, we'll just log it and redirect
        console.log('Business name:', businessName);
        console.log('User identity:', identity);

        const result = createStore({
            name: businessName,
        });

        console.log('Create Store Result:', result);

        // Redirect to a dashboard or success page
        router.push('/dashboard'); // You can change this to wherever you want to redirect
    };

    return (
        <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Blurred background logo */}
            <div className="absolute inset-0 flex items-center justify-center">
                <Image
                    src="/secretPineapple-logo.png"
                    alt="Secret Pineapple Logo"
                    width={400}
                    height={400}
                    className="opacity-30 blur-sm"
                />
            </div>

            <div className="bg-white rounded-3xl shadow-lg border-4 border-black p-8 w-full max-w-md relative z-10">
                {/* Title */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-black">Create a shop account</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="businessName" className="flex items-center text-lg font-medium text-black mb-3">
                            <span className="mr-2">🏪</span>
                            Shop Name
                        </label>
                        <input
                            type="text"
                            id="businessName"
                            name="businessName"
                            required
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-100 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-yellow-500"
                            placeholder=""
                        />
                    </div>

                    {/* Action Button */}
                    <div className="pt-6">
                        <Button
                            type="submit"
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-full text-lg"
                        >
                            Create Account
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}