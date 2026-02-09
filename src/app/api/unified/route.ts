import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const category = searchParams.get('category');
    const endpoint = searchParams.get('endpoint');

    if (!connectionId || !category || !endpoint) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const url = `https://api.unified.to/${category}/${connectionId}/${endpoint}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${process.env.UNIFIED_API_KEY}` }
        });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}


