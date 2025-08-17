'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';
import Image from 'next/image';

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

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [isCreatingReceipts, setIsCreatingReceipts] = useState(false);
    const [receiptsCreated, setReceiptsCreated] = useState(false);

    useEffect(() => {
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
                
                // Automatically create receipts on page load
                createReceipts(data);
            } catch (error) {
                console.error('Error parsing payment data:', error);
            }
        }
    }, [searchParams]);

    const createReceipts = async (data: PaymentData) => {
        setIsCreatingReceipts(true);
        
        try {
            const response = await fetch('/api/create-receipts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    item: data.item,
                    storeName: data.storeName,
                    txHash: data.txHash,
                    timestamp: data.timestamp,
                    userAddress: localStorage.getItem('userWalletAddress'), // Store this during payment
                    merchantAddress: localStorage.getItem('merchantWalletAddress')
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Receipts created successfully:', result);
                setReceiptsCreated(true);
            } else {
                console.error('Failed to create receipts');
            }
        } catch (error) {
            console.error('Error creating receipts:', error);
        } finally {
            setIsCreatingReceipts(false);
        }
    };

    const handleViewReceipt = () => {
        // Navigate to user's receipt view
        router.push('/my-receipts');
    };

    const handleBackToStore = () => {
        router.push('/dashboard');
    };

    if (!paymentData) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-lg">Loading payment confirmation...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
                {/* Header with Pineapple */}
                <div className="bg-yellow-400 text-center p-8 relative">
                    <div className="text-6xl mb-4">🍍</div>
                    <h1 className="text-4xl font-bold text-black mb-2">Thank You!</h1>
                    <p className="text-green-600 font-semibold">Your secret is safe with us.</p>
                </div>

                {/* Receipt Section */}
                <div className="p-6 bg-white">
                    <div className="text-center mb-6">
                        <h2 className="text-gray-400 text-lg mb-4">Your Receipt</h2>
                        
                        <div className="bg-gray-100 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-4">
                                <div 
                                    className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold text-black border-2 border-black"
                                    style={{ backgroundColor: paymentData.item.color || '#FFD700' }}
                                >
                                    1
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-lg">{paymentData.item.name}</h3>
                                    <p className="text-lg font-semibold">{paymentData.item.price}</p>
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
                        {isCreatingReceipts && (
                            <div className="text-blue-600 mb-4">
                                Creating receipts...
                            </div>
                        )}

                        {receiptsCreated && (
                            <div className="text-green-600 mb-4">
                                ✅ Receipt saved securely
                            </div>
                        )}
                    </div>

                    <Button 
                        onClick={handleViewReceipt}
                        disabled={!receiptsCreated}
                        className="w-full bg-black text-white py-4 rounded-full text-lg font-bold mb-3 hover:bg-gray-800"
                    >
                        View my receipt
                    </Button>

                    <Button 
                        onClick={handleBackToStore}
                        className="w-full bg-white text-black border-2 border-black py-4 rounded-full text-lg font-bold hover:bg-gray-50"
                    >
                        Back to store
                    </Button>
                </div>
            </div>
        </div>
    );
}