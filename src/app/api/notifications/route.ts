import { NextResponse } from 'next/server';

// GET for pulling products/orders
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const category = searchParams.get('category') || 'commerce';
    const endpoint = searchParams.get('endpoint') || 'item';

    const url = `https://api.unified.to/${category}/${connectionId}/${endpoint}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${process.env.UNIFIED_API_KEY}` }
        });
        return NextResponse.json(await res.json());
    } catch (err) {
        return NextResponse.json({ error: "Fetch Failed" }, { status: 500 });
    }
}

// POST for sending Slack Alerts
export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const body = await request.json();

    // Unified Slack Endpoint: messaging/[id]/message
    const url = `https://api.unified.to/messaging/${connectionId}/message`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.UNIFIED_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: body.message || "🔔 System Alert: Sales benchmark hit!"
            })
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: "Slack Post Failed" }, { status: 500 });
    }
}