"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function Dashboard() {
  const searchParams = useSearchParams();
  const [connectionId, setConnectionId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const workspaceId = process.env.NEXT_PUBLIC_UNIFIED_WORKSPACE_ID;

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setConnectionId(id);
      localStorage.setItem('demo_id', id);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      const saved = localStorage.getItem('demo_id');
      if (saved) setConnectionId(saved);
    }
  }, [searchParams]);

  const startAuth = (integrationId: string) => {
    if (!workspaceId) {
      alert("CRITICAL ERROR: Workspace ID is missing from .env.local");
      return;
    }
    const redirect = window.location.origin;
    // This URL bypasses the component and opens the auth directly
    const url = `https://api.unified.to/unified/integration/auth/${workspaceId}/${integrationId}?redirect=true&success_redirect=${redirect}`;
    window.location.href = url;
  };

  const fetchData = async (cat: string, end: string) => {
    setLoading(true);
    const res = await fetch(`/api/unified?connectionId=${connectionId}&category=${cat}&endpoint=${end}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  return (
    <div className="p-10 max-w-4xl mx-auto font-sans">
      <h1 className="text-3xl font-bold mb-4">Unified Demo (Direct Auth)</h1>

      {/* DEBUG BOX */}
      {!workspaceId && (
        <div className="p-4 bg-red-100 text-red-700 border-2 border-red-500 mb-6 rounded-lg">
          <strong>Error:</strong> NEXT_PUBLIC_UNIFIED_WORKSPACE_ID is not set in .env.local
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* STEP 1 */}
        <div className="p-6 border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white">
          <h2 className="font-bold uppercase mb-4">1. Connect Platform</h2>
          <div className="flex flex-col gap-2">
            <button onClick={() => startAuth('shopify')} className="w-full py-3 bg-[#95BF47] text-white font-bold rounded-xl border-2 border-black">Connect Shopify</button>
            <button onClick={() => startAuth('tiktok')} className="w-full py-3 bg-black text-white font-bold rounded-xl border-2 border-black">Connect TikTok</button>
          </div>

          <div className="mt-6 p-3 bg-slate-100 rounded-lg border-2 border-black overflow-hidden">
            <p className="text-[10px] uppercase font-bold text-slate-500">Active Connection:</p>
            <p className="text-[11px] font-mono break-all">{connectionId || "None"}</p>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="space-y-4">
          <h2 className="font-bold uppercase">2. Fetch Data</h2>
          <button
            disabled={!connectionId}
            onClick={() => fetchData('commerce', 'item')}
            className="w-full py-4 border-4 border-black rounded-2xl font-black text-lg hover:bg-yellow-400 transition-colors disabled:opacity-20"
          >
            📦 GET PRODUCTS
          </button>

          <div className="bg-slate-900 rounded-2xl p-4 h-64 overflow-auto border-4 border-black text-green-400 font-mono text-[10px]">
            {loading ? "SYNCING..." : <pre>{JSON.stringify(data || "// Ready", null, 2)}</pre>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <Suspense><Dashboard /></Suspense>;
}
