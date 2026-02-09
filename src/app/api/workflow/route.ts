import { NextResponse } from "next/server"
import { unifiedFetch } from "@/lib/unified"

export async function POST() {
    try {
        const data = await unifiedFetch("/tasks", {
            method: "POST",
            body: JSON.stringify({
                title: "Creator onboarding",
                description: "Auto-created from Unified demo",
                tool: "trello",
            }),
        })

        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json(
            {
                error: err.message,
            },
            { status: 500 }
        )
    }
}
