const UNIFIED_BASE_URL = "https://api.unified.to"

export async function unifiedFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${UNIFIED_BASE_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${process.env.UNIFIED_API_KEY}`,
            "Content-Type": "application/json",
            ...(options?.headers || {}),
        },
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Unified API error: ${res.status}`)
    }

    return res.json()
}
