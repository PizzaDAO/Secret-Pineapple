/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';
import Image from 'next/image';

interface Item {
  name: string;
  price: string;
  color?: string;
  // Add other properties as needed
}

export default function UserPaymentPage() {
    const searchParams = useSearchParams();
    const [item, setItem] = useState<Item | null>(null);
    const [storeName, setStoreName] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [account, setAccount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Your wallet address (replace with your actual wallet address)
    const MERCHANT_WALLET = "0x742d35Cc6634C0532925a3b8D39c8bC0C1b4a41E";

    useEffect(() => {
        // Get order details from URL parameters
        const itemParam = searchParams.get('item');
        const storeParam = searchParams.get('store');

        if (itemParam) {
            try {
                const parsedItem = JSON.parse(itemParam);
                setItem(parsedItem);
            } catch (error) {
                console.error('Error parsing item data:', error);
            }
        }

        if (storeParam) {
            setStoreName(storeParam);
        }

        // Check if wallet is already connected
        checkWalletConnection();
    }, [searchParams]);

    const checkWalletConnection = async () => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    setIsConnected(true);
                    setAccount(accounts[0]);
                }
            } catch (error) {
                console.error('Error checking wallet connection:', error);
            }
        }
    };

    const connectWallet = async () => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                setIsConnected(true);
                setAccount(accounts[0]);
            } catch (error) {
                console.error('Error connecting wallet:', error);
                alert('Failed to connect wallet. Please try again.');
            }
        } else {
            alert('Please install MetaMask or another Web3 wallet to make payments.');
        }
    };

    const handlePayment = async () => {
        if (!isConnected) {
            await connectWallet();
            return;
        }

        if (!item || !(window as any).ethereum) {
            alert('Payment setup error. Please refresh and try again.');
            return;
        }

        setIsProcessing(true);

        try {
            // Convert price to Wei (assuming price is in ETH)
            const priceInEth = 0.00001; // Convert dollars to ETH (rough conversion)
            const priceInWei = (priceInEth * Math.pow(10, 18)).toString(16);

            const transactionParameters = {
                to: MERCHANT_WALLET,
                from: account,
                value: '0x' + priceInWei,
                gas: '0x5208', // 21000 in hex
            };

            const txHash = await (window as any).ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters],
            });

            console.log('Transaction sent:', txHash);
            alert(`Payment successful! Transaction hash: ${txHash}`);
            
            // You can redirect to a success page or update the UI
            // window.location.href = '/payment-success';

        } catch (error) {
            console.error('Payment failed:', error);
            const err = error as any;
            if (err.code === 4001) {
                alert('Payment cancelled by user.');
            } else {
                alert('Payment failed. Please try again.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    if (!item) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-lg">Loading order details...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl overflow-hidden min-h-[600px]">
                {/* Header */}
                <div className="bg-red-500 text-white p-6 text-center">
                    <h1 className="text-xl font-bold">{storeName}</h1>
                </div>

                {/* Order Details */}
                <div className="p-6 bg-white flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-6">
                        <h2 className="text-lg font-bold">Your order</h2>
                        <span className="text-yellow-500">🔒</span>
                    </div>
                    
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-8">
                        <div className="flex items-center gap-4">
                            <div 
                                className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold text-black"
                                style={{ backgroundColor: item.color || '#FFD700' }}
                            >
                                1
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">{item.name}</h3>
                                <p className="text-lg font-semibold">{item.price}</p>
                            </div>
                        </div>
                    </div>

                    {/* Wallet Status */}
                    {isConnected && (
                        <div className="text-sm text-gray-600 mb-4">
                            Connected: {account.slice(0, 6)}...{account.slice(-4)}
                        </div>
                    )}

                    <div className="flex-1 min-h-[200px]"></div>

                    <div className="flex justify-between items-center text-2xl font-bold mb-6">
                        <span>Total</span>
                        <span>{item.price}</span>
                    </div>

                    <Button 
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white py-4 rounded-full text-lg font-bold border-4 border-black shadow-lg mb-4"
                    >
                        {isProcessing ? 'Processing...' : isConnected ? 'Pay now' : 'Connect Wallet & Pay'}
                    </Button>
                </div>
            </div>
        </div>
    );
}