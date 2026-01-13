import React, { useState, useEffect, useRef } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';
import { Trash2, Plus, X, ChevronUp, ChevronDown } from 'lucide-react';

const HARDWARE_MODELS = {
  FIREWALL: { name: 'Firewall', size: 1, ports: 8, color: 'bg-red-900' },
  SWITCH_24: { name: 'Switch 24', size: 1, ports: 24, color: 'bg-slate-800' },
  SERVER_2U: { name: 'Server 2U', size: 2, ports: 4, color: 'bg-blue-900' },
};

const NetworkRackApp = () => {
  const [devices, setDevices] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pendingConn, setPendingConn] = useState(null); 
  const [showLibrary, setShowLibrary] = useState(false);
  const rackRef = useRef(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('rack-pro-v2');
    if (saved) {
      const { devices: d, connections: c } = JSON.parse(saved);
      setDevices(d); setConnections(c);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('rack-pro-v2', JSON.stringify({ devices, connections }));
  }, [devices, connections]);

  const addDevice = (modelKey) => {
    const model = HARDWARE_MODELS[modelKey];
    const newId = `dev-${Date.now()}`;
    setDevices([...devices, { 
      id: newId, ...model, startU: 1,
      portData: Array.from({ length: model.ports }, (_, i) => ({ id: i + 1 }))
    }]);
    setShowLibrary(false);
  };

  const removeDevice = (id) => {
    setDevices(devices.filter(d => d.id !== id));
    setConnections(connections.filter(c => !c.start.includes(id) && !c.end.includes(id)));
  };

  const handleDragEnd = (e, id) => {
    const rect = rackRef.current.getBoundingClientRect();
    const touch = e.changedTouches ? e.changedTouches[0] : e;
    const relativeY = rect.bottom - touch.clientY;
    const newU = Math.max(1, Math.min(42, Math.ceil(relativeY / 40)));
    
    setDevices(prev => prev.map(d => d.id === id ? { ...d, startU: newU } : d));
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-200 overflow-hidden flex flex-col font-sans">
      
      {/* HEADER / TOP NAV */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between px-4 z-50">
        <h1 className="text-sm font-bold text-blue-500 tracking-tighter uppercase">RackDesigner</h1>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowLibrary(!showLibrary)}
            className="bg-blue-600 p-2 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            {showLibrary ? <X size={20}/> : <Plus size={20}/>}
          </button>
        </div>
      </div>

      {/* THE RACK VIEWPORT */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-32 touch-pan-y" ref={rackRef}>
        <Xwrapper>
          <div className="relative w-full max-w-[400px] mx-auto bg-slate-900 border-x-[12px] border-slate-800 h-[1680px] shadow-2xl">
            {/* 1U Markers */}
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-10 border-b border-slate-800/30 flex items-center px-2 text-[8px] text-slate-700 font-mono">
                {42 - i}
              </div>
            ))}

            {/* Devices */}
            {devices.map((dev) => (
              <div
                key={dev.id}
                draggable
                onDragEnd={(e) => handleDragEnd(e, dev.id)}
                className={`absolute left-0 right-0 ${dev.color} border-y border-white/10 z-10 flex flex-col justify-center px-2 active:brightness-125`}
                style={{ bottom: `${(dev.startU - 1) * 40}px`, height: `${dev.size * 40}px` }}
              >
                <div className="flex items-center justify-between pointer-events-none">
                  <div className="flex flex-col max-w-[40%]">
                    <span className="text-[9px] font-bold leading-none truncate">{dev.name}</span>
                  </div>
                  
                  {/* Ports Grid */}
                  <div className="grid grid-cols-8 gap-1 pointer-events-auto">
                    {dev.portData.slice(0, 16).map(p => (
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
                        className={`w-2.5 h-2.5 rounded-[1px] border ${pendingConn === `${dev.id}-p${p.id}` ? 'bg-yellow-400' : 'bg-black border-slate-600'}`}
                      />
                    ))}
                  </div>

                  {/* Remove Button */}
                  <button 
                    onClick={() => removeDevice(dev.id)}
                    className="pointer-events-auto p-1 text-white/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}

            {/* Cables */}
            {connections.map((c) => (
              <Xarrow key={c.id} start={c.start} end={c.end} color={c.color} strokeWidth={2} curveness={0.9} headSize={0} />
            ))}
          </div>
        </Xwrapper>
      </div>

      {/* MOBILE LIBRARY DRAWER */}
      {showLibrary && (
        <div className="absolute inset-x-0 bottom-0 bg-slate-900 border-t border-slate-700 p-6 z-[60] animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-sm text-slate-400 uppercase">Hardware Library</h2>
            <button onClick={() => setShowLibrary(false)}><X/></button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(HARDWARE_MODELS).map(([key, m]) => (
              <button 
                key={key} 
                onClick={() => addDevice(key)}
                className="w-full flex justify-between items-center p-4 bg-slate-800 rounded-xl border border-slate-700 active:bg-blue-900"
              >
                <span className="text-sm font-medium">{m.name}</span>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded-md">{m.size}U</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CONNECTION STATUS BAR */}
      {pendingConn && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-6 py-2 rounded-full font-bold text-xs shadow-2xl animate-pulse z-[70]">
          Select target port...
        </div>
      )}
    </div>
  );
};

export default NetworkRackApp;

