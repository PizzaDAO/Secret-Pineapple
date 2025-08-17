'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { useHypergraphAuth, useSpaces, HypergraphSpaceProvider, useQuery, useCreateEntity, useSpace } from '@graphprotocol/hypergraph-react';

import { Receipt } from '@/app/schema';
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
            <MerchantReceiptSuccessPage />
        </HypergraphSpaceProvider>
    );
}

interface PaymentData {
    item: {
        name: string;
        price: string;
        color?: string;
    };
    storeName: string;
    txHash: string;
    timestamp: number;
}

function MerchantReceiptSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [receiptSaved, setReceiptSaved] = useState(false);
    const processedRef = useRef(false);


    const { name, ready, id: spaceId } = useSpace({ mode: 'private' });
    const { authenticated, identity } = useHypergraphAuth();
    const [businessName, setBusinessName] = useState('');
    const { data: stores } = useQuery(Receipt, { mode: 'private' });
    const createReceipt = useCreateEntity(Receipt);


    const createMerchantReceipt = useCallback(async (data: PaymentData) => {
        try {
            // Create receipt in merchant's private space using Hypergraph
            console.log('Creating merchant receipt:', data);

            const result = createReceipt({
                date: new Date(),
                total: Number(data.item.price),
                notes: data.item.name,
                currency: 'USDC',
                address: "0xAf9261a0aF3cbaFaB8a4Fa622283c5a1607ED042",
            });

            console.log('User receipt created:', result);
            
            setReceiptSaved(true);

        } catch (error) {
            console.error('Error creating merchant receipt:', error);
        }
    }, []);

    useEffect(() => {
        // Prevent multiple executions
        if (processedRef.current) return;

        // Get payment details from URL parameters
        const itemParam = searchParams.get('item');
        const storeParam = searchParams.get('store');
        const txHashParam = searchParams.get('txHash');
        const timestampParam = searchParams.get('timestamp');

        if (itemParam && storeParam && txHashParam && timestampParam) {
            try {
                const parsedItem = JSON.parse(itemParam);
                const data: PaymentData = {
                    item: parsedItem,
                    storeName: storeParam,
                    txHash: txHashParam,
                    timestamp: parseInt(timestampParam)
                };
                setPaymentData(data);

                // Create merchant receipt immediately
                createMerchantReceipt(data);

                // Mark as processed
                processedRef.current = true;

            } catch (error) {
                console.error('Error parsing payment data:', error);
            }
        }
    }, [searchParams, createMerchantReceipt]);

    const handleViewReceipts = () => {
        router.push('/merchant-receipts');
    };

    const handleBackToPayments = () => {
        router.push('/payment');
    };

    if (!paymentData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-lg">Loading merchant receipt...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-green-400 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-green-400 text-center p-8 relative">
                    <div className="text-6xl mb-4">💰</div>
                    <h1 className="text-4xl font-bold text-black mb-2">Payment Received!</h1>
                    <p className="text-green-800 font-semibold">Merchant Receipt Created</p>
                </div>

                {/* Receipt Section */}
                <div className="p-6 bg-white">
                    <div className="text-center mb-6">
                        <h2 className="text-gray-400 text-lg mb-4">Merchant Receipt</h2>

                        <div className="bg-gray-100 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold text-black border-2 border-black"
                                    style={{ backgroundColor: paymentData.item.color || '#90EE90' }}
                                >
                                    1
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-lg">{paymentData.item.name}</h3>
                                    <p className="text-lg font-semibold">${paymentData.item.price}</p>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Details */}
                        <div className="text-sm text-gray-600 mb-4">
                            <p>Transaction: {paymentData.txHash.slice(0, 10)}...{paymentData.txHash.slice(-8)}</p>
                            <p>Store: {paymentData.storeName}</p>
                            <p>Time: {new Date(paymentData.timestamp).toLocaleString()}</p>
                        </div>

                        {/* Receipt Status */}
                        {!receiptSaved && (
                            <div className="text-blue-600 mb-4">
                                Creating merchant receipt...
                            </div>
                        )}

                        {receiptSaved && (
                            <div className="text-green-600 mb-4">
                                ✅ Merchant receipt saved securely
                            </div>
                        )}
                    </div>

                    <Button
                        onClick={handleViewReceipts}
                        disabled={!receiptSaved}
                        className="w-full bg-black text-white py-4 rounded-full text-lg font-bold mb-3 hover:bg-gray-800"
                    >
                        View merchant receipts
                    </Button>

                    <Button
                        onClick={handleBackToPayments}
                        className="w-full bg-white text-black border-2 border-black py-4 rounded-full text-lg font-bold hover:bg-gray-50"
                    >
                        Back to payments
                    </Button>
                </div>
            </div>
        </div>
    );
}