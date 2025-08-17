'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { Button } from '@/Components/ui/button';
import Image from 'next/image';

interface Item {
  name: string;
  price: string;
  color?: string;
}

export default function PaymentPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [item, setItem] = useState<Item | null>(null);
    const [storeName, setStoreName] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        // Get item and store data from URL parameters
        const itemParam = searchParams.get('item');
        const storeParam = searchParams.get('store');

        if (itemParam) {
            try {
                const parsedItem = JSON.parse(decodeURIComponent(itemParam));
                setItem(parsedItem);
            } catch (error) {
                console.error('Error parsing item data:', error);
            }
        }

        if (storeParam) {
            setStoreName(decodeURIComponent(storeParam));
        }
    }, [searchParams]);

    useEffect(() => {
        // Generate QR code for payment using local library
        if (item) {
            // Create URL to userPayment page with order details
            const baseUrl = window.location.origin;
            const paymentUrl = new URL('/userPayment', baseUrl);
            
            // Add order details as query parameters
            paymentUrl.searchParams.append('item', JSON.stringify({
                name: item.name,
                price: item.price,
                color: item.color
            }));
            paymentUrl.searchParams.append('store', storeName);
            paymentUrl.searchParams.append('timestamp', Date.now().toString());
            
            // Generate QR code with the URL
            QRCode.toDataURL(paymentUrl.toString(), {
                width: 120,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            })
            .then(url => {
                setQrCodeUrl(url);
            })
            .catch(err => {
                console.error('Error generating QR code:', err);
            });
        }
    }, [item, storeName]);

    const handleBack = () => {
        router.back();
    };

    if (!item) {
        return (
            <div className="min-h-screen bg-yellow-400 flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-yellow-400 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
                <Button
                    onClick={handleBack}
                    className="flex items-center text-black hover:text-gray-700 bg-transparent border-none shadow-none p-0 h-auto"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm font-medium">Back</span>
                </Button>
                <h1 className="text-lg font-bold text-black">{storeName}</h1>
                <div className="w-12"></div> {/* Spacer for centering */}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8">
                {/* Payment Card */}
                <div className="bg-white rounded-3xl p-8 shadow-lg w-full max-w-md mx-auto mb-8 border-4 border-black">
                    <div className="flex items-center justify-between">
                        {/* Left side with pineapple and text */}
                        <div className="flex items-center gap-3">
                            <Image
                                src="/pineapple-mascot.png"
                                alt="Pineapple Mascot"
                                width={60}
                                height={60}
                                className="object-contain"
                            />
                            <div>
                                <p className="text-base font-bold text-black mb-0">Your total is</p>
                                <p className="text-4xl font-black text-black leading-tight">{item.price}</p>
                            </div>
                        </div>
                        
                        {/* QR Code on the right */}
                        <div className="ml-6">
                            {qrCodeUrl ? (
                                <Image
                                    src={qrCodeUrl} 
                                    alt="Payment QR Code" 
                                    width={100}
                                    height={100}
                                    className="border-2 border-black"
                                />
                            ) : (
                                <div className="w-24 h-24 bg-gray-200 flex items-center justify-center border-2 border-black">
                                    <span className="text-xs text-gray-500">Loading</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Instruction Text */}
                <h2 className="text-4xl font-black text-black text-center" style={{
                    textShadow: '3px 3px 0px white, -2px -2px 0px white, 2px -2px 0px white, -2px 2px 0px white, 0px 2px 0px white, 2px 0px 0px white, 0px -2px 0px white, -2px 0px 0px white'
                }}>
                    Scan the QR to Pay
                </h2>
            </div>
        </div>
    );
}