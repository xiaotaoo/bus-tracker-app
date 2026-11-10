import React, { useState, useEffect } from 'react';
import { X, Server, Key, CheckCircle, AlertTriangle, Play, RefreshCw, Code, Copy, Check } from 'lucide-react';

interface DatamallApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatamallApiModal: React.FC<DatamallApiModalProps> = ({ isOpen, onClose }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('arrival');
  const [busStopCode, setBusStopCode] = useState<string>('01012');
  const [serviceNo, setServiceNo] = useState<string>('190');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen]);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch (err) {
      console.error('Failed to fetch /api/health:', err);
    }
  };

  const handleTestEndpoint = async () => {
    setIsLoading(true);
    setTestResponse(null);
    try {
      const params = new URLSearchParams({
        endpoint: selectedEndpoint,
        busStopCode,
        serviceNo,
      });
      const res = await fetch(`/api/bustracker?${params.toString()}`);
      const data = await res.json();
      setTestResponse({
        httpStatus: res.status,
        url: `/api/bustracker?${params.toString()}`,
        payload: data,
      });
    } catch (err: any) {
      setTestResponse({
        httpStatus: 500,
        error: err.message || String(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyCurl = () => {
    const text = `curl -X GET "http://localhost:3000/api/bustracker?endpoint=${selectedEndpoint}&busStopCode=${busStopCode}&serviceNo=${serviceNo}"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const isKeyConfigured = healthData?.datamall?.accountKeyConfigured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-xs">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl text-zinc-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5 bg-zinc-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                LTA Datamall Connection Settings
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono">
                Serverless Proxy at /api/bustracker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Key Status Alert */}
          <div className={`p-3 rounded border flex items-start gap-3 ${
            isKeyConfigured
              ? 'border-[#bbf7d0] bg-[#ecfdf5] text-[#166534]'
              : 'border-[#fde68a] bg-[#fffbeb] text-[#854d0e]'
          }`}>
            <Key className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {isKeyConfigured ? 'AccountKey Loaded from Environment' : 'AccountKey Pending (.env)'}
                </span>
                <span className="metric-badge px-1 py-0.2 rounded border bg-white">
                  Header: AccountKey
                </span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {isKeyConfigured
                  ? 'Active LTA Datamall AccountKey detected. Serverless requests will stream live from the Singapore Datamall servers.'
                  : 'Add your free LTA AccountKey to .env as LTA_DATAMALL_API_KEY="your_key". The endpoints are ready and waiting.'}
              </p>
            </div>
          </div>

          {/* Endpoints Matrix */}
          <div>
            <h4 className="font-semibold text-[#0f172a] uppercase tracking-wide mb-2 text-[11px]">
              Configured LTA Datamall Endpoints
            </h4>
            <div className="space-y-1.5 font-mono text-[10px]">
              <div className="p-2 rounded border border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0f172a]">1. Bus Arrival (v3)</span>
                  <p className="text-[#64748b] text-[9px]">https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival</p>
                </div>
                <span className="metric-badge bg-white px-1.5 py-0.5 rounded border border-[#cbd5e1] text-[#334155]">
                  ?BusStopCode
                </span>
              </div>

              <div className="p-2 rounded border border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0f172a]">2. Bus Routes</span>
                  <p className="text-[#64748b] text-[9px]">https://datamall2.mytransport.sg/ltaodataservice/BusRoutes</p>
                </div>
                <span className="metric-badge bg-white px-1.5 py-0.5 rounded border border-[#cbd5e1] text-[#334155]">
                  ?$skip
                </span>
              </div>

              <div className="p-2 rounded border border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0f172a]">3. Bus Services</span>
                  <p className="text-[#64748b] text-[9px]">https://datamall2.mytransport.sg/ltaodataservice/BusServices</p>
                </div>
                <span className="metric-badge bg-white px-1.5 py-0.5 rounded border border-[#cbd5e1] text-[#334155]">
                  ?$skip
                </span>
              </div>

              <div className="p-2 rounded border border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0f172a]">4. Bus Stops</span>
                  <p className="text-[#64748b] text-[9px]">https://datamall2.mytransport.sg/ltaodataservice/BusStops</p>
                </div>
                <span className="metric-badge bg-white px-1.5 py-0.5 rounded border border-[#cbd5e1] text-[#334155]">
                  ?$skip
                </span>
              </div>

              <div className="p-2 rounded border border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0f172a]">5. Passenger Volume (Bus Stops)</span>
                  <p className="text-[#64748b] text-[9px]">http://datamall2.mytransport.sg/ltaodataservice/PV/Bus</p>
                </div>
                <span className="metric-badge bg-white px-1.5 py-0.5 rounded border border-[#cbd5e1] text-[#334155]">
                  ?Date=YYYYMM
                </span>
              </div>

              <div className="p-2 rounded border border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center">
                <div>
                  <span className="font-bold text-[#0f172a]">6. Passenger Volume (Origin Destination)</span>
                  <p className="text-[#64748b] text-[9px]">http://datamall2.mytransport.sg/ltaodataservice/PV/ODBus</p>
                </div>
                <span className="metric-badge bg-white px-1.5 py-0.5 rounded border border-[#cbd5e1] text-[#334155]">
                  ?Date=YYYYMM
                </span>
              </div>
            </div>
          </div>

          {/* Live Request Tester */}
          <div className="border border-[#cbd5e1] rounded p-3 bg-[#f8fafc] space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-[#0f172a] uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-[#005ec4]" />
                Interactive /api/bustracker Request Tester
              </h4>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 text-[10px] font-mono font-semibold text-[#475569] hover:text-[#0f172a] bg-white px-2 py-0.5 rounded border border-[#cbd5e1]"
              >
                {copied ? <Check className="w-3 h-3 text-[#166534]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy cURL'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-[#64748b] block mb-0.5">Endpoint Action</label>
                <select
                  value={selectedEndpoint}
                  onChange={(e) => setSelectedEndpoint(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white border border-[#cbd5e1] rounded font-mono"
                >
                  <option value="arrival">arrival (BusArrival v3)</option>
                  <option value="routes">routes (BusRoutes)</option>
                  <option value="services">services (BusServices)</option>
                  <option value="stops">stops (BusStops)</option>
                  <option value="pv_bus">pv_bus (Passenger Volume)</option>
                  <option value="pv_od_bus">pv_od_bus (OD Passenger Volume)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#64748b] block mb-0.5">BusStopCode</label>
                <input
                  type="text"
                  value={busStopCode}
                  onChange={(e) => setBusStopCode(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white border border-[#cbd5e1] rounded font-mono"
                  placeholder="01012"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-[#64748b] block mb-0.5">ServiceNo</label>
                <input
                  type="text"
                  value={serviceNo}
                  onChange={(e) => setServiceNo(e.target.value)}
                  className="w-full p-1.5 text-xs bg-white border border-[#cbd5e1] rounded font-mono"
                  placeholder="190"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleTestEndpoint}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0f172a] text-white text-xs font-semibold hover:bg-[#1e293b] disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Send Request</span>
              </button>
            </div>

            {/* Test Output */}
            {testResponse && (
              <div className="mt-2 p-2.5 rounded border border-[#cbd5e1] bg-[#091426] text-white font-mono text-[10px] max-h-48 overflow-y-auto">
                <div className="flex justify-between border-b border-slate-700 pb-1 mb-1.5 text-[9px] text-slate-400">
                  <span>HTTP {testResponse.httpStatus}</span>
                  <span>{testResponse.url}</span>
                </div>
                <pre className="text-emerald-400 whitespace-pre-wrap">
                  {JSON.stringify(testResponse.payload || testResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#e2e8f0] bg-[#f8fafc] flex justify-between items-center text-[11px] text-[#64748b]">
          <span>Endpoints configured in <code className="font-mono text-[#0f172a]">/api/bustracker.ts</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#1e293b] text-white font-semibold hover:bg-[#0f172a]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
