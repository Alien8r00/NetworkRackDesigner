import React, { useState, useEffect, useRef } from 'react';
import Xarrow, { Xwrapper } from 'react-xarrows';


// --- HARDWARE CATALOG ---
const HARDWARE_MODELS = {
  FIREWALL: { name: 'NextGen Firewall', size: 1, ports: 8, color: 'bg-red-900', type: 'NET' },
  SWITCH_24: { name: 'Layer 3 24-Port', size: 1, ports: 24, color: 'bg-slate-800', type: 'NET' },
  SERVER_2U: { name: 'Storage Server', size: 2, ports: 4, color: 'bg-blue-900', type: 'SRV' },
  PATCH_PANEL: { name: 'Cat6 Patch Panel', size: 1, ports: 24, color: 'bg-zinc-900', type: 'PATCH' },
};


const NetworkRackApp = () => {
  // --- STATE ---
  const [devices, setDevices] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pendingConn, setPendingConn] = useState(null); 
  const [hoveredPort, setHoveredPort] = useState(null);
  const rackRef = useRef(null);


  // --- LOAD/SAVE ---
  useEffect(() => {
    const saved = localStorage.getItem('rack-designer-pro');
    if (saved) {
      const { devices: d, connections: c } = JSON.parse(saved);
      setDevices(d);
      setConnections(c);
    }
  }, []);


  useEffect(() => {
    localStorage.setItem('rack-designer-pro', JSON.stringify({ devices, connections }));
  }, [devices, connections]);


  // --- DEVICE LOGIC ---
  const addDevice = (modelKey) => {
    const model = HARDWARE_MODELS[modelKey];
    const newId = `dev-${Date.now()}`;
    
    // Find first available slot from bottom
    let startU = 1;
    for (let u = 1; u <= 42 - model.size; u++) {
      const collision = devices.some(d => u < (d.startU + d.size) && (u + model.size) > d.startU);
      if (!collision) { startU = u; break; }
    }


    setDevices([...devices, { 
      id: newId, 
      ...model, 
      startU,
      portData: Array.from({ length: model.ports }, (_, i) => ({ id: i + 1, vlan: 10 }))
    }]);
  };


  const handleDragEnd = (e, id) => {
    if (!rackRef.current) return;
    const rect = rackRef.current.getBoundingClientRect();
    const relativeY = rect.bottom - e.clientY;
    const newU = Math.max(1, Math.min(42, Math.ceil(relativeY / 40)));
    
    setDevices(prev => {
      const dev = prev.find(d => d.id === id);
      const collision = prev.some(other => 
        other.id !== id && newU < (other.startU + other.size) && (newU + dev.size) > other.startU
      );
      return collision ? prev : prev.map(d => d.id === id ? { ...d, startU: newU } : d);
    });
  };


  // --- CABLING LOGIC ---
  const handlePortClick = (devId, portId, label, e) => {
    const portKey = `${devId}-p${portId}`;
    if (!pendingConn) {
      setPendingConn(portKey);
    } else if (pendingConn === portKey) {
      setPendingConn(null);
    } else {
      setConnections([...connections, { 
        id: `c-${Date.now()}`, 
        start: pendingConn, 
        end: portKey, 
        color: '#38bdf8' 
      }]);
      setPendingConn(null);
    }
  };


  const deleteCable = (id) => setConnections(prev => prev.filter(c => c.id !== id));
  const clearRack = () => { if(window.confirm("Clear all?")) { setDevices([]); setConnections([]); }};


  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden select-none">
      
      {/* LEFT SIDEBAR: ASSETS */}
      <div className="w-80 bg-slate-900 p-6 border-r border-slate-800 flex flex-col">
        <h1 className="text-xl font-bold text-blue-500 mb-6 flex items-center gap-2">
          <span className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          Rack Designer Pro
        </h1>
        
        <div className="space-y-3 mb-8">
          <p className="text-[10px] uppercase font-bold text-slate-500">Hardware Catalog</p>
          {Object.entries(HARDWARE_MODELS).map(([key, m]) => (
            <button 
              key={key} 
              onClick={() => addDevice(key)}
              className="w-full flex justify-between items-center p-3 bg-slate-800 border border-slate-700 rounded hover:border-blue-500 transition-all text-sm group"
            >
              <span>{m.name}</span>
              <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded group-hover:bg-blue-600">{m.size}U</span>
            </button>
          ))}
        </div>


        <div className="flex-1 overflow-y-auto">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-3">Active Connections</p>
          <div className="space-y-2">
            {connections.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono">
                <span className="truncate w-40">{c.start} ↔ {c.end}</span>
                <button onClick={() => deleteCable(c.id)} className="text-red-500 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
        </div>


        <button onClick={clearRack} className="mt-4 text-xs text-slate-500 hover:text-red-400 underline decoration-dotted">
          Reset Environment
        </button>
      </div>


      {/* MAIN VIEWPORT: THE RACK */}
      <div className="flex-1 relative overflow-y-auto p-12 bg-slate-950 flex justify-center">
        <Xwrapper>
          <div 
            ref={rackRef}
            className="relative w-[600px] bg-slate-900 border-x-[20px] border-slate-800 shadow-2xl h-[1680px]" // 42U * 40px
          >
            {/* Grid Units */}
            {Array.from({ length: 42 }).map((_, i) => (
              <div key={i} className="h-10 border-b border-slate-800/50 flex items-center px-4 text-[9px] text-slate-600 font-mono italic">
                {42 - i}U
              </div>
            ))}


            {/* Render Devices */}
            {devices.map((dev) => (
              <div
                key={dev.id}
                draggable
                onDragEnd={(e) => handleDragEnd(e, dev.id)}
                className={`absolute left-0 right-0 ${dev.color} border-y border-white/10 z-10 p-2 shadow-inner group cursor-grab active:cursor-grabbing`}
                style={{ bottom: `${(dev.startU - 1) * 40}px`, height: `${dev.size * 40}px` }}
              >
                <div className="flex justify-between items-center h-full px-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{dev.name}</span>
                    <span className="text-[8px] text-white/40 font-mono">SN: {dev.id.toUpperCase()}</span>
                  </div>
                  
                  {/* Port Grid */}
                  <div className="grid grid-cols-12 gap-1.5 p-1 bg-black/30 rounded border border-white/5">
                    {dev.portData.map(p => {
                      const pKey = `${dev.id}-p${p.id}`;
                      const isPending = pendingConn === pKey;
                      return (
                        <div 
                          key={p.id} id={pKey}
                          onClick={(e) => handlePortClick(dev.id, p.id, p.label, e)}
                          onMouseEnter={(e) => {
                            const r = e.target.getBoundingClientRect();
                            setHoveredPort({ label: `Port ${p.id}`, vlan: p.vlan, x: r.left, y: r.top });
                          }}
                          onMouseLeave={() => setHoveredPort(null)}
                          className={`w-3 h-3 border rounded-sm transition-all duration-150 cursor-pointer
                            ${isPending ? 'bg-yellow-400 scale-125 animate-pulse border-white' : 'bg-black border-white/20 hover:border-blue-500 hover:bg-slate-800'}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}


            {/* Render Cables */}
            {connections.map((c) => (
              <Xarrow
                key={c.id} start={c.start} end={c.end}
                color={c.color} strokeWidth={2.5} curveness={0.85}
                path="smooth" headSize={0}
              />
            ))}
          </div>
        </Xwrapper>


        {/* FLOATING PORT LABEL */}
        {hoveredPort && (
          <div 
            className="fixed z-[100] pointer-events-none bg-slate-800 border-l-4 border-blue-500 p-2 shadow-2xl rounded-r"
            style={{ left: hoveredPort.x + 20, top: hoveredPort.y - 10 }}
          >
            <div className="text-[10px] font-bold text-white uppercase">{hoveredPort.label}</div>
            <div className="text-[8px] text-blue-400 font-mono">STATUS: UP | VLAN: {hoveredPort.vlan}</div>
          </div>
        )}
      </div>


      {/* RIGHT SIDEBAR: QUICK HELP */}
      <div className="w-64 bg-slate-900 p-6 border-l border-slate-800 hidden xl:block">
        <h3 className="text-[10px] uppercase font-bold text-slate-500 mb-4 tracking-widest">Interface Tips</h3>
        <div className="space-y-4 text-xs text-slate-400 leading-relaxed">
          <p><strong className="text-slate-200">Mounting:</strong> Drag hardware anywhere on the rack rails. It will snap to the closest Unit.</p>
          <p><strong className="text-slate-200">Patching:</strong> Click a port (it will blink yellow), then click a destination port to run a cable.</p>
          <p><strong className="text-slate-200">Labels:</strong> Hover over any port to see metadata and VLAN info.</p>
        </div>
        <div className="mt-10 p-4 bg-blue-500/10 border border-blue-500/20 rounded">
          <p className="text-[10px] text-blue-400 italic font-mono">“Cables will dynamically stretch when you move the hardware.”</p>
        </div>
      </div>
    </div>
  );
};


export default NetworkRackApp;