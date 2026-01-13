import React, { useState, useEffect, useRef } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import { Trash2, Plus, X, Move } from 'lucide-react';

const HARDWARE_MODELS = {
  FIREWALL: { name: 'Firewall', size: 1, ports: 8, color: 'bg-red-900' },
  SWITCH_24: { name: 'Switch 24p', size: 1, ports: 24, color: 'bg-slate-800' },
  SWITCH_48: { name: 'Switch 48p', size: 1, ports: 48, color: 'bg-slate-700' },
  PATCH_12: { name: 'Patch 12p', size: 1, ports: 12, color: 'bg-zinc-900' },
  PATCH_24: { name: 'Patch 24p', size: 1, ports: 24, color: 'bg-zinc-900' },
  PATCH_48: { name: 'Patch 48p', size: 2, ports: 48, color: 'bg-zinc-900' },
  SERVER_2U: { name: 'Server 2U', size: 2, ports: 4, color: 'bg-blue-900' },
};

const NetworkRackApp = () => {
  const [devices, setDevices] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pendingConn, setPendingConn] = useState(null); 
  const [showLibrary, setShowLibrary] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const rackRef = useRef(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('rack-pro-v3');
    if (saved) {
      const parsed = JSON.parse(saved);
      setDevices(parsed.devices || []);
      setConnections(parsed.connections || []);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rack-pro-v3', JSON.stringify({ devices, connections }));
  }, [devices, connections]);

  // Collision Logic
  const isSlotOccupied = (startU, size, excludeId) => {
    return devices.some(d => {
      if (d.id === excludeId) return false;
      const dEnd = d.startU + d.size - 1;
      const newEnd = startU + size - 1;
      return startU <= dEnd && newEnd >= d.startU;
    });
  };

  const addDevice = (modelKey) => {
    const model = HARDWARE_MODELS[modelKey];
    let startU = 1;
    // Find first available slot from bottom up
    while (isSlotOccupied(startU, model.size, null) && startU < 42) {
      startU++;
    }
    
    if (startU + model.size > 43) {
      alert("No room in the rack!");
      return;
    }

    const newId = `dev-${Date.now()}`;
    setDevices([...devices, { 
      id: newId, ...model, startU,
      portData: Array.from({ length: model.ports }, (_, i) => ({ id: i + 1 }))
    }]);
    setShowLibrary(false);
  };

  const handleDragUpdate = (e, id) => {
    const rect = rackRef.current.getBoundingClientRect();
    const touchY = e.touches ? e.touches[0].clientY : e.clientY;
    const relativeY = rect.bottom - touchY;
    const requestedU = Math.max(1, Math.min(42 - devices.find(d => d.id === id).size + 1, Math.ceil(relativeY / 40)));
    
    // Only update if slot is free
    if (!isSlotOccupied(requestedU, devices.find(d => d.id === id).size, id)) {
      setDevices(prev => prev.map(d => d.id === id ? { ...d, startU: requestedU } : d));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-200 overflow-hidden flex flex-col">
      <div className="h-14 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4 z-50 shadow-md">
        <h1 className="text-xs font-black text-blue-500 uppercase">RackDesigner <span className="text-slate-500">v3.0</span></h1>
        <button onClick={() => setShowLibrary(!showLibrary)} className="bg-blue-600 p-2 rounded-full active:scale-90 transition-all">
          {showLibrary ? <X size={20}/> : <Plus size={20}/>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-40" ref={rackRef}>
        <Xwrapper>
          <div className="relative w-full max-w-[450px] mx-auto bg-slate-900 border-x-[14px] border-slate-800 h-[1680px] shadow-2xl">
            {/* Unit Lines */}
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-10 border-b border-slate-800/40 flex items-center px-2 text-[9px] text-slate-700 font-mono">
                {42 - i}U
              </div>
            ))}

            {/* Hardware Units */}
            {devices.map((dev) => (
              <div
                key={dev.id}
                onTouchMove={(e) => handleDragUpdate(e, dev.id)}
                className={`absolute left-0 right-0 ${dev.color} border-y border-white/20 z-10 flex items-center px-3 transition-shadow ${draggedId === dev.id ? 'shadow-2xl brightness-125 z-20' : ''}`}
                style={{ bottom: `${(dev.startU - 1) * 40}px`, height: `${dev.size * 40}px` }}
              >
                {/* Drag Handle */}
                <div className="mr-2 text-white/20 cursor-grab active:text-blue-400">
                  <Move size={14} />
                </div>

                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <span className="text-[10px] font-bold truncate uppercase tracking-tighter">{dev.name}</span>
                  
                  {/* Dense Port Grid for 48p */}
                  <div className={`grid ${dev.ports > 24 ? 'grid-cols-24' : 'grid-cols-12'} gap-0.5 mt-1`}>
                    {dev.portData.map(p => (
                      <div 
                        key={p.id} id={`${dev.id}-p${p.id}`}
                        onClick={() => {
                          const pKey = `${dev.id}-p${p.id}`;
                          if(!pendingConn) setPendingConn(pKey);
                          else {
                            setConnections([...connections, { id: Date.now(), start: pendingConn, end: pKey, color: '#38bdf8' }]);
                            setPendingConn(null);
                          }
                        }}
                        className={`w-2 h-2 rounded-[1px] border-[0.5px] ${pendingConn === `${dev.id}-p${p.id}` ? 'bg-yellow-400 border-white animate-pulse' : 'bg-black border-slate-600'}`}
                      />
                    ))}
                  </div>
                </div>

                <button onClick={() => setDevices(devices.filter(d => d.id !== dev.id))} className="ml-2 text-white/20 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {connections.map((c) => (
              <Xarrow key={c.id} start={c.start} end={c.end} color={c.color} strokeWidth={1.5} curveness={0.9} headSize={0} />
            ))}
          </div>
        </Xwrapper>
      </div>

      {/* Library Drawer */}
      {showLibrary && (
        <div className="absolute inset-x-0 bottom-0 bg-slate-900 border-t border-slate-700 p-6 z-[60] max-h-[60vh] overflow-y-auto rounded-t-3xl shadow-2xl">
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(HARDWARE_MODELS).map(([key, m]) => (
              <button 
                key={key} 
                onClick={() => addDevice(key)}
                className="flex flex-col items-start p-3 bg-slate-800 rounded-xl border border-slate-700 active:border-blue-500 transition-all"
              >
                <span className="text-xs font-bold">{m.name}</span>
                <span className="text-[10px] text-slate-500">{m.size}U Units</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkRackApp;

