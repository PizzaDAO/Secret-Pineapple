'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHypergraphAuth, useSpaces, HypergraphSpaceProvider, useQuery, useSpace, useCreateEntity } from '@graphprotocol/hypergraph-react';
import { Button } from '@/Components/ui/button';
import { Store, StoreItem } from '@/app/schema';

type StoreItemType = {
    id: string;
    name: string;
    price: number; 
    color?: string;
};

export default function DashboardWrapper() {
    const { data: privateSpaces, isPending: privateSpacesPending } = useSpaces({ mode: 'private' });
    const isLoading = privateSpacesPending;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-lg">Loading...</div>
            </div>
        );
    }

    if (!privateSpaces || privateSpaces.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-lg">No private spaces found</div>
            </div>
        );
    }

    return (
        <HypergraphSpaceProvider space={privateSpaces?.[0]?.id}>
            <DashboardPage />
        </HypergraphSpaceProvider>
    );
}

function DashboardPage() {
    const router = useRouter();
    const { authenticated } = useHypergraphAuth();
    const { data: store } = useQuery(Store, { mode: 'private' });
    const { data: storeItems } = useQuery(StoreItem, { mode: 'private' });
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<StoreItemType | null>(null);

    // Redirect if not authenticated
    if (!authenticated) {
        router.push('/');
        return null;
    }

    // Get store name, fallback to "Your Shop" if no store found
    const storeName = store && store.length > 0 ? store[0].name : "Your Shop";
    console.log('storeItems: ',storeItems)

    const handleAddItem = () => {
        setShowAddItemModal(true);
    };

    const handleItemClick = (item: StoreItemType) => {
        setSelectedItem(item);
        setShowOrderModal(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Main Content */}
            <div className="flex-1">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-4 py-4">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <div className="flex items-center">
                            <button className="mr-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <span className="text-lg font-medium">Dashboard</span>
                        </div>
                        <h1 className="text-xl font-bold text-center">{storeName}</h1>
                        <Button
                            onClick={handleAddItem}
                            className="bg-white text-black border-2 border-black rounded-full px-6 py-2 hover:bg-gray-50 flex items-center gap-2"
                        >
                            <span className="text-lg">+</span>
                            Add Item
                        </Button>
                    </div>
                </div>

                {/* Main content */}
                <div className="p-4">
                    {storeItems && storeItems.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
                            {storeItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-2xl border-4 border-black p-6 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                                    style={{ backgroundColor: item.color }}
                                    onClick={() => handleItemClick(item)}
                                >
                                    <h3 className="text-xl font-bold text-black mb-2">{item.name}</h3>
                                    <p className="text-2xl font-bold text-black">{item.price}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full">
                            <div className="text-center">
                                <h2 className="text-xl font-medium text-gray-800 mb-8">
                                    You haven&apos;t added any items to your shop
                                </h2>
                                <Button
                                    onClick={handleAddItem}
                                    className="bg-white text-black border-2 border-black rounded-full px-8 py-3 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <span className="text-xl">+</span>
                                    Add Item
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Modal - Positioned over Add Item button */}
            {showOrderModal && selectedItem && (
                <div className="fixed inset-0 flex items-start justify-end pr-4 pt-20 z-50">
                    <div className="w-96 h-[calc(95vh-4rem)] bg-white border-4 border-black shadow-xl rounded-lg overflow-hidden">
                        <OrderModal 
                            item={selectedItem} 
                            storeName={storeName}
                            onClose={() => {
                                setShowOrderModal(false);
                                setSelectedItem(null);
                            }} 
                        />
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddItemModal && (
                <AddItemModal onClose={() => setShowAddItemModal(false)} />
            )}
        </div>
    );
}

function AddItemModal({ onClose }: { onClose: () => void }) {
    const [itemName, setItemName] = useState('');
    const [price, setPrice] = useState('');
    const [selectedColor, setSelectedColor] = useState('#F4D03F'); // Default to yellow

    const colors = [
        '#F4D03F', // Yellow
        '#7FB3D3', // Light Blue
        '#D2B4DE', // Light Purple
        '#AED6F1', // Light Green
        '#A569BD', // Purple
        '#808B96', // Gray
        '#F1948A', // Light Red/Pink
        '#BDC3C7', // Light Gray
        '#A3E4D7', // Light Mint
    ];
    const createStoreItem = useCreateEntity(StoreItem);
    const { name, ready, id: spaceId } = useSpace({ mode: 'private' });


    const handleSave = () => {
        const result = createStoreItem({
            name: itemName,
            price: Number(price),
            color: selectedColor,
        });
        console.log('Create Store Item Result:', result);

        // TODO: Save item with name, price, and color
        console.log('Saving item:', { itemName, price, selectedColor });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-white bg-opacity-10 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl mx-4 relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <button onClick={onClose} className="flex items-center text-gray-600 hover:text-gray-800">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                    <h2 className="text-2xl font-bold">Add an Item</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column - Item Details */}
                    <div>
                        <h3 className="text-xl font-bold mb-6">Item Details</h3>

                        <div className="space-y-6">
                            <div>
                                <label htmlFor="itemName" className="block text-lg font-medium text-gray-700 mb-2">
                                    Item Name
                                </label>
                                <input
                                    type="text"
                                    id="itemName"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-gray-500"
                                    placeholder=""
                                />
                            </div>

                            <div>
                                <label htmlFor="price" className="block text-lg font-medium text-gray-700 mb-2">
                                    Price
                                </label>
                                <input
                                    type="text"
                                    id="price"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-gray-500"
                                    placeholder=""
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Color Picker */}
                    <div>
                        <h3 className="text-xl font-bold mb-6">Pick a color</h3>

                        <div className="grid grid-cols-3 gap-4">
                            {colors.map((color, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-16 h-16 rounded-full border-4 ${selectedColor === color ? 'border-black' : 'border-transparent'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Buttons */}
                <div className="flex justify-end gap-4 mt-8">
                    <Button
                        onClick={onClose}
                        className="bg-white text-black border-2 border-black rounded-full px-8 py-3 hover:bg-gray-50"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-green-500 text-white rounded-full px-8 py-3 hover:bg-green-600"
                    >
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OrderModal({ item, storeName, onClose }: { item: any, storeName: string, onClose: () => void }) {
    const router = useRouter();

    const handleAcceptPayment = () => {
        // Navigate to payment page with order details
        router.push(`/payment?item=${encodeURIComponent(JSON.stringify({
            name: item.name,
            price: item.price,
            color: item.color
        }))}&store=${encodeURIComponent(storeName)}`);
    };

    return (
        <div className="h-full p-6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">New Order</h2>
                <div className="flex gap-2 items-center">
                    <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">1</span>
                    <Button
                        onClick={onClose}
                        className="bg-white text-black border-2 border-black rounded-full px-4 py-1 hover:bg-gray-50 text-sm"
                    >
                        Clear Order
                    </Button>
                </div>
            </div>

            {/* Order Item */}
            <div className="bg-gray-100 rounded-xl p-4 mb-8">
                <div className="flex items-center gap-4">
                    <div 
                        className="w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center text-lg font-bold"
                        style={{ backgroundColor: item.color }}
                    >
                        1
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        <p className="text-gray-600">{item.price}</p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Spacer to push total and buttons to bottom */}
            <div className="flex-1"></div>

            {/* Total */}
            <div className="flex justify-between items-center text-xl font-bold mb-6">
                <span>Total</span>
                <span>{item.price}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
                <Button 
                    onClick={handleAcceptPayment}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-full text-lg font-semibold"
                >
                    Accept Payment
                </Button>
                <button 
                    onClick={onClose}
                    className="w-full text-gray-600 hover:text-gray-800 py-2 text-lg"
                >
                    Cancel Order
                </button>
            </div>
        </div>
    );
}