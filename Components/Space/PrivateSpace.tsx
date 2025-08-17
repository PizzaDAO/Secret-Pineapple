'use client';

import {
  HypergraphSpaceProvider,
  preparePublish,
  publishOps,
  useCreateEntity,
  useDeleteEntity,
  useHypergraphApp,
  useQuery,
  useSpace,
  useSpaces,
  useHypergraphAuth,
} from '@graphprotocol/hypergraph-react';
import { useState, useEffect } from 'react';

import { Receipt, ReceiptItem, SharedReceipt, Store, StoreItem } from '@/app/schema';
import { Button } from '../ui/button';

import { useSelector } from '@xstate/store/react';
import { store, Messages } from '@graphprotocol/hypergraph';


export function PrivateSpaceWrapper({ spaceid }: Readonly<{ spaceid: string }>) {
  return (
    <HypergraphSpaceProvider space={spaceid}>
      <PrivateSpace />
    </HypergraphSpaceProvider>
  );
}


function CreateInSharedSpace() {
  const { name, ready, id: spaceId } = useSpace({ space: "5330ea1e-41e1-4d66-90af-74caaa9dd57b", mode: 'private' });
  console.log('CreateInSharedSpace using space:', spaceId);
  console.log('Space name:', name);
  console.log('Space ready:', ready);

  const createSharedReceipt = useCreateEntity(SharedReceipt, { space: "5330ea1e-41e1-4d66-90af-74caaa9dd57b" });
  //const createReceiptItem = useCreateEntity(ReceiptItem);

  //const { listSpaces,  } = useHypergraphApp();
  //console.log('Available spaces:', listSpaces());

  // Mock realistic receipt data
  const handleCreate = () => {
    console.log('CreateInSharedSpace using space:', spaceId);
    console.log('Space name:', name);
    console.log('Space ready:', ready);
    /*
    // Create mock receipt items first
    const mockItems = [
      { name: "Coffee", quantity: 2, price: 4 },
      { name: "Croissant", quantity: 1, price: 3 },
      { name: "Orange Juice", quantity: 1, price: 2 }
    ];

    // Create ReceiptItem entities
    const createdItems = [];
    for (const item of mockItems) {
      const receiptItem = createReceiptItem({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      });
      createdItems.push(receiptItem.id);
    }

    console.log('Created ReceiptItems:', createdItems);
    

    // Calculate total
    const total = mockItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
*/
    const response = createSharedReceipt({
      date: new Date(),
      total: 15, // 10.50
      //items: createdItems,
      notes: "Morning breakfast at local café",
      currency: "USDC",
      address: "0x742d35Cc6688C02532Eb13857B2f67b6FE157d5c"
    });

    console.log('Shared receipt created');
    console.log('Response:', response);
    //console.log('Total amount:', total);
  };

  return <Button onClick={handleCreate}>Create Shared Receipt</Button>;
}


function PrivateSpace() {
  const { name, ready, id: spaceId } = useSpace({ mode: 'private' });
  const { data: receipts } = useQuery(Receipt, { mode: 'private' });
  const { data: receiptItems } = useQuery(ReceiptItem, { mode: 'private' });
  const { data: stores } = useQuery(Store, { mode: 'private' });
  const { data: storeItems } = useQuery(StoreItem, { mode: 'private' });
  
  console.log('User receipts:', receipts);
  console.log('User stores:', stores);
  console.log('User store items:', storeItems);
  
  const [selectedSpace, setSelectedSpace] = useState<string>('');
  const createReceipt = useCreateEntity(Receipt);
  const createReceiptItem = useCreateEntity(ReceiptItem);
  const createStore = useCreateEntity(Store);
  const createStoreItem = useCreateEntity(StoreItem);

  // Store form states
  const [storeName, setStoreName] = useState<string>('');
  const [storeDescription, setStoreDescription] = useState<string>('');
  
  // Store item form states
  const [storeItemName, setStoreItemName] = useState<string>('');
  const [storeItemPrice, setStoreItemPrice] = useState<number>();
  const [storeItemColor, setStoreItemColor] = useState<string>('');

  const [receiptDate, setReceiptDate] = useState<Date>();
  const [receiptTotal, setReceiptTotal] = useState<number>();
  const [receiptItemsState, setReceiptItems] = useState<Array<{ name: string; quantity: number; price: number }>>([]);
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [receiptCurrency, setReceiptCurrency] = useState<string>('USDC');
  const [receiptAddress, setReceiptAddress] = useState<string>('');


  const { getSmartSessionClient } = useHypergraphApp();
  const deleteEvent = useDeleteEntity();
  const { inviteToSpace } = useHypergraphApp();
  const { acceptInvitation } = useHypergraphApp();

  const { authenticated, identity } = useHypergraphAuth();
  console.log('authenticated', authenticated)
  console.log('identity', identity)
  console.log('receipts', receipts)

  const { listInvitations } = useHypergraphApp();
  const [inviteAddress, setInviteAddress] = useState('');

  // Add this to get the full space object from the store
  const currentSpace = useSelector(store, (state) =>
    state.context.spaces.find(space => space.id === spaceId)
  );

  // Move listInvitations call to useEffect
  useEffect(() => {
    if (ready && authenticated) {
      listInvitations();
    }
  }, [ready, authenticated, listInvitations]);

  const invitations = useSelector(store, (state) => state.context.invitations);
  console.log('invitations', invitations);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading space...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!receiptDate || receiptTotal === undefined) {
      alert('Please fill in all required fields');
      return;
    }

    // Create ReceiptItem entities first
    const createdItems = [];
    for (const item of receiptItemsState) {
      const receiptItem = createReceiptItem({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      });
      createdItems.push(receiptItem.id);
    }

    // Create Receipt with ReceiptItem IDs
    const result = createReceipt({
      date: receiptDate,
      total: receiptTotal,
      //items: createdItems, // Array of ReceiptItem IDs
      notes: receiptNotes,
      currency: receiptCurrency,
      address: receiptAddress
    });
    console.log('result', result);

    //setReceiptId('');
    setReceiptDate(undefined);
    setReceiptTotal(undefined);
    setReceiptItems([]);
    setReceiptNotes('');
    setReceiptCurrency('USDC');
    setReceiptAddress('');
  };

  const publishToPublicSpace = async (receipt: Receipt) => {
    if (!selectedSpace) {
      alert('No space selected');
      return;
    }
    try {
      const { ops } = await preparePublish({ entity: receipt, publicSpace: selectedSpace });
      const smartSessionClient = await getSmartSessionClient();
      if (!smartSessionClient) {
        throw new Error('Missing smartSessionClient');
      }
      const publishResult = await publishOps({
        ops,
        space: selectedSpace,
        name: 'Publish Project',
        walletClient: smartSessionClient,
      });
      console.log(publishResult, ops);
      alert('Project published to public space');
    } catch (error) {
      console.error(error);
      alert('Error publishing project to public space');
    }
  };

  // Remove the loose inviteToSpace call and create a handler function
  const handleInvite = async () => {
    if (!inviteAddress.trim()) {
      alert('Please enter an address to invite');
      return;
    }

    if (!ready || !currentSpace) {
      alert('Space not ready');
      return;
    }

    console.log('Current space:', currentSpace);

    try {
      await inviteToSpace({
        space: currentSpace, // Pass the full SpaceStorageEntry object
        invitee: {
          accountAddress: inviteAddress as `0x${string}`,
        },
      });
      alert(`Invitation sent to ${inviteAddress}`);
      setInviteAddress(''); // Clear the input
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Failed to send invitation');
    }
  };

  // Add handler for accepting invitations
  const handleAcceptInvitation = async (invitation: Messages.Invitation) => {
    console.log('Accepting invitation:', invitation);
    try {
      const result = await acceptInvitation({
        invitation,
      });
      console.log('Accept invitation result:', result);
      alert('Invitation accepted successfully!');
      // Refresh invitations list
      listInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation');
    }
  };

  const handleStoreSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!storeName.trim()) {
      alert('Please enter a store name');
      return;
    }

    const result = createStore({
      name: storeName,
      description: storeDescription || undefined,
      // logo: undefined, // Add logo handling if needed
    });
    console.log('Store created:', result);

    setStoreName('');
    setStoreDescription('');
  };

  const handleStoreItemSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!storeItemName.trim() || storeItemPrice === undefined) {
      alert('Please fill in required fields');
      return;
    }

    const result = createStoreItem({
      name: storeItemName,
      price: storeItemPrice,
      color: storeItemColor || undefined,
    });
    console.log('Store item created:', result);

    setStoreItemName('');
    setStoreItemPrice(undefined);
    setStoreItemColor('');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-slate-600 mt-1 text-sm">Private Space</p>
          <h1 className="text-3xl font-bold text-slate-900">{name}</h1>
          <p className="text-slate-600 mt-1 text-sm">ID: {spaceId}</p>
          <p className="text-muted-foreground mt-6">Manage your private projects and publish them to public spaces</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Create Forms Column */}
          <div className="space-y-6">
            {/* Create Receipt Form */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Create New Receipt</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="receipt-date" className="text-sm font-medium text-card-foreground">
                    Date
                  </label>
                  <input
                    id="receipt-date"
                    type="date"
                    value={receiptDate ? receiptDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setReceiptDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="receipt-total" className="text-sm font-medium text-card-foreground">
                    Total Amount
                  </label>
                  <input
                    id="receipt-total"
                    type="number"
                    step="0.01"
                    value={receiptTotal || ''}
                    onChange={(e) => setReceiptTotal(parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="receipt-notes" className="text-sm font-medium text-card-foreground">
                    Notes
                  </label>
                  <input
                    id="receipt-notes"
                    type="text"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    placeholder="Enter notes..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="receipt-currency" className="text-sm font-medium text-card-foreground">
                    Currency
                  </label>
                  <select
                    id="receipt-currency"
                    value={receiptCurrency}
                    onChange={(e) => setReceiptCurrency(e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  >
                    <option value="USDC">USDC</option>
                    <option value="EUR">EURc</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="receipt-address" className="text-sm font-medium text-card-foreground">
                    Address
                  </label>
                  <input
                    id="receipt-address"
                    type="text"
                    value={receiptAddress}
                    onChange={(e) => setReceiptAddress(e.target.value)}
                    placeholder="Enter address..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                {/* Receipt Items Section */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-card-foreground">Receipt Items</label>
                  <div className="space-y-3">
                    {receiptItemsState.map((item, index) => (
                      <div key={index} className="border border-input rounded-md p-3 bg-background">
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) => {
                              const newItems = [...receiptItemsState];
                              newItems[index].name = e.target.value;
                              setReceiptItems(newItems);
                            }}
                            className="px-2 py-1 border border-input rounded text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...receiptItemsState];
                              newItems[index].quantity = parseInt(e.target.value) || 0;
                              setReceiptItems(newItems);
                            }}
                            className="px-2 py-1 border border-input rounded text-sm"
                          />
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Price"
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...receiptItemsState];
                                newItems[index].price = parseFloat(e.target.value) || 0;
                                setReceiptItems(newItems);
                              }}
                              className="px-2 py-1 border border-input rounded text-sm flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newItems = receiptItemsState.filter((_, i) => i !== index);
                                setReceiptItems(newItems);
                              }}
                              className="px-2"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setReceiptItems([...receiptItemsState, { name: '', quantity: 1, price: 0 }]);
                      }}
                      className="w-full"
                    >
                      Add Item
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!receiptDate || receiptTotal === undefined || !receiptNotes.trim() || !receiptAddress.trim()}
                >
                  Create Receipt
                </Button>
              </form>
            </div>

            {/* Create Store Form */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Create New Store</h2>
              <form onSubmit={handleStoreSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="store-name" className="text-sm font-medium text-card-foreground">
                    Store Name
                  </label>
                  <input
                    id="store-name"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Enter store name..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="store-description" className="text-sm font-medium text-card-foreground">
                    Description (Optional)
                  </label>
                  <textarea
                    id="store-description"
                    value={storeDescription}
                    onChange={(e) => setStoreDescription(e.target.value)}
                    placeholder="Enter description..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    rows={3}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!storeName.trim()}
                >
                  Create Store
                </Button>
              </form>
            </div>

            {/* Create Store Item Form */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Create New Store Item</h2>
              <form onSubmit={handleStoreItemSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="item-name" className="text-sm font-medium text-card-foreground">
                    Item Name
                  </label>
                  <input
                    id="item-name"
                    type="text"
                    value={storeItemName}
                    onChange={(e) => setStoreItemName(e.target.value)}
                    placeholder="Enter item name..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="item-price" className="text-sm font-medium text-card-foreground">
                    Price
                  </label>
                  <input
                    id="item-price"
                    type="number"
                    step="0.01"
                    value={storeItemPrice || ''}
                    onChange={(e) => setStoreItemPrice(parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="item-color" className="text-sm font-medium text-card-foreground">
                    Color (Optional)
                  </label>
                  <input
                    id="item-color"
                    type="text"
                    value={storeItemColor}
                    onChange={(e) => setStoreItemColor(e.target.value)}
                    placeholder="Enter color..."
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!storeItemName.trim() || storeItemPrice === undefined}
                >
                  Create Store Item
                </Button>
              </form>
            </div>

            {/* Add Invite Section */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">Invite to Space</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="invite-address" className="text-sm font-medium text-card-foreground">
                    Wallet Address
                  </label>
                  <input
                    id="invite-address"
                    type="text"
                    value={inviteAddress}
                    onChange={(e) => setInviteAddress(e.target.value)}
                    placeholder="0x1234567890123456789012345678901234567890"
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  />
                </div>
                <Button
                  onClick={handleInvite}
                  className="w-full"
                  disabled={!inviteAddress.trim()}
                >
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>

          {/* Your Receipts Column */}
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">
                Your Receipts ({receipts?.length || 0})
              </h2>

              {receipts && receipts.length > 0 ? (
                <div className="space-y-4">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="border border-border rounded-lg p-4 bg-background">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">ID:</p>
                          <p className="text-xs font-mono">{receipt.id}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Date:</p>
                          <p className="text-xs">{receipt.date.toLocaleDateString()}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Address:</p>
                          <p className="text-xs font-mono truncate max-w-32">{receipt.address}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Currency:</p>
                          <p className="text-xs">{receipt.currency}</p>
                        </div>
                      </div>

                      {/* Receipt Items */}
                      <div className="space-y-2 mb-4">
                        {receiptItems.map((item) => (
                          <div key={item.id} className="flex justify-between items-center text-xs bg-muted/50 rounded p-2">
                            <span>{item.name}</span>
                            <span>{item.quantity} × ${item.price.toFixed(2)}</span>
                          </div>))}
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-foreground">Notes: {receipt.notes}</h3>
                        <span className="text-sm font-semibold text-primary">Total: {receipt.total} {receipt.currency}</span>
                      </div>

                      <div className="space-y-3">
                        {/*
                        <div className="space-y-2">
                          <label htmlFor="space" className="text-xs font-medium text-muted-foreground">
                            Select Public Space to Publish
                          </label>
                          <select
                            name="space"
                            value={selectedSpace}
                            onChange={(e) => setSelectedSpace(e.target.value)}
                            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                          >
                            <option value="">Choose a public space...</option>
                            {publicSpaces?.map((space) => (
                              <option key={space.id} value={space.id}>
                                {space.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        */}

                        <div className="flex gap-2">
                          <Button
                            onClick={() => deleteEvent(receipt.id)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Delete Receipt
                          </Button>


                          <HypergraphSpaceProvider space="5330ea1e-41e1-4d66-90af-74caaa9dd57b">
                            <CreateInSharedSpace />
                          </HypergraphSpaceProvider>

                          {/* 
                          <Button
                            onClick={() => publishToPublicSpace(receipt)}
                            disabled={!selectedSpace}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            Publish to Public Space
                          </Button>
                          */}

                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">
                    <svg
                      className="mx-auto h-12 w-12 mb-4 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">No projects created yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first project using the form</p>
                </div>
              )}
            </div>

            {/* Pending Invitations Section */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">
                Pending Invitations ({invitations?.length || 0})
              </h2>

              {invitations && invitations.length > 0 ? (
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="border border-border rounded-lg p-4 bg-background">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Space Invitation</span>
                          <span className="text-xs text-muted-foreground">
                            {invitation.id.slice(0, 8)}...
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Space ID: {invitation.spaceId}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
                            onClick={() => handleAcceptInvitation(invitation)}
                          >
                            Accept
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm">No pending invitations</p>
                </div>
              )}
            </div>
          </div>

          {/* Stores and Store Items Column */}
          <div className="space-y-6">
            {/* Your Stores */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">
                Your Stores ({stores?.length || 0})
              </h2>

              {stores && stores.length > 0 ? (
                <div className="space-y-4">
                  {stores.map((store) => (
                    <div key={store.id} className="border border-border rounded-lg p-4 bg-background">
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{store.name}</h3>
                          <Button
                            onClick={() => deleteEvent(store.id)}
                            variant="outline"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </div>
                        
                        {store.description && (
                          <p className="text-sm text-muted-foreground">{store.description}</p>
                        )}
                        
                        <p className="text-xs text-muted-foreground font-mono">ID: {store.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">
                    <svg
                      className="mx-auto h-12 w-12 mb-4 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">No stores created yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first store using the form</p>
                </div>
              )}
            </div>

            {/* Your Store Items */}
            <div className="bg-card border rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-card-foreground mb-4">
                Your Store Items ({storeItems?.length || 0})
              </h2>

              {storeItems && storeItems.length > 0 ? (
                <div className="space-y-4">
                  {storeItems.map((item) => (
                    <div key={item.id} className="border border-border rounded-lg p-4 bg-background">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-foreground">{item.name}</h3>
                          <Button
                            onClick={() => deleteEvent(item.id)}
                            variant="outline"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-primary">${item.price.toFixed(2)}</span>
                          {item.color && (
                            <span className="text-sm text-muted-foreground">Color: {item.color}</span>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground font-mono">ID: {item.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">
                    <svg
                      className="mx-auto h-12 w-12 mb-4 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">No store items created yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first item using the form</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
