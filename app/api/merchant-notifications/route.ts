// api/merchant-notifications/route.ts
const notifications = new Map(); // In-memory storage

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { merchantAddress, paymentData, timestamp } = body;
        
        if (!merchantAddress) {
            return Response.json({ error: 'Merchant address required' }, { status: 400 });
        }
        
        if (!notifications.has(merchantAddress)) {
            notifications.set(merchantAddress, []);
        }
        
        notifications.get(merchantAddress).push({
            paymentData,
            timestamp,
            id: Date.now()
        });
        
        console.log('Notification stored for merchant:', merchantAddress);
        return Response.json({ success: true });
        
    } catch (error) {
        console.error('Error storing notification:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const merchantAddress = searchParams.get('merchantAddress');
        
        if (!merchantAddress) {
            return Response.json({ error: 'Merchant address required' }, { status: 400 });
        }
        
        if (!notifications.has(merchantAddress)) {
            return Response.json({ notifications: [] });
        }
        
        const merchantNotifications = notifications.get(merchantAddress);
        // Clear after reading (consume once)
        notifications.set(merchantAddress, []);
        
        return Response.json({ notifications: merchantNotifications });
        
    } catch (error) {
        console.error('Error retrieving notifications:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}