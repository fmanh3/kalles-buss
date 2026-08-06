import React, { useEffect, useState, useRef } from 'react';
import { Tree } from 'react-arborist';
import type { NodeRendererProps } from 'react-arborist';
import './QaDashboard.css';

const isProd = window.location.hostname !== 'localhost';
const ENGINE_URL = import.meta.env.VITE_ENGINE_URL || (isProd ? 'https://kalles-simulation-engine-w7fsmra4yq-ew.a.run.app/world' : 'http://localhost:8087/world');
const PORTAL_URL = isProd ? 'https://kalles-portal-w7fsmra4yq-ew.a.run.app' : 'http://localhost:5173';

const GeneratorEditor = ({ assetData, onSave }: { assetData: any, onSave: (config: any) => void }) => {
  const [generators, setGenerators] = useState<any[]>(assetData.config?.generators || []);
  const [showJson, setShowJson] = useState(false);

  // Sync state if a different asset is selected
  useEffect(() => {
     setGenerators(assetData.config?.generators || []);
     setShowJson(false);
  }, [assetData.id]);

  const addRow = () => {
    if (assetData.type === 'FLEET_PROFILE') {
      setGenerators([...generators, { type: 'ELECTRIC_12M', count: 1, max_range_km: 300, battery_kwh: 350 }]);
    } else {
      setGenerators([...generators, { role: 'DRIVER', count: 1, base_salary_sek: 28000 }]);
    }
  };

  const updateRow = (index: number, field: string, value: any) => {
    const newGen = [...generators];
    newGen[index] = { ...newGen[index], [field]: value };
    setGenerators(newGen);
  };

  const removeRow = (index: number) => {
    setGenerators(generators.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const newConfig = { ...assetData.config, generators };
    onSave(newConfig);
  };

  if (showJson) {
     return (
       <div style={{ marginTop: '10px' }}>
         <button className="btn-secondary" onClick={() => setShowJson(false)} style={{ marginBottom: '10px' }}>Back to Visual Editor</button>
         <pre id="asset-json-editor" contentEditable suppressContentEditableWarning style={{ margin: 0, color: '#aaa', fontSize: '0.85em', minHeight: '150px', outline: 'none', border: '1px solid #444', padding: '10px' }}>{JSON.stringify({ ...assetData.config, generators }, null, 2)}</pre>
       </div>
     );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between' }}>
         <button className="btn-secondary" onClick={addRow}>+ Add Generator Rule</button>
         <button className="btn-secondary" onClick={() => setShowJson(true)} style={{ color: '#888' }}>&lt;/&gt; Raw JSON</button>
       </div>

       <div style={{ display: 'grid', gap: '10px', background: '#1a1a1a', padding: '10px', borderRadius: '4px' }}>
          {generators.length === 0 && <span style={{ color: '#666', fontStyle: 'italic' }}>No generator rules defined.</span>}
          {generators.map((gen, i) => (
             <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#252525', padding: '8px', borderRadius: '3px' }}>
                <span style={{ color: '#555', fontWeight: 'bold' }}>#{i+1}</span>
                
                {assetData.type === 'FLEET_PROFILE' ? (
                  <>
                    <select value={gen.type} onChange={e => updateRow(i, 'type', e.target.value)} style={{ padding: '5px', background: '#111', color: '#fff', border: '1px solid #444' }}>
                      <option value="ELECTRIC_12M">EV 12m (Urban)</option>
                      <option value="ELECTRIC_18M">EV 18m (Articulated)</option>
                      <option value="DIESEL_12M">Diesel 12m (Suburban)</option>
                    </select>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#888', marginRight: '5px' }}>Count</label>
                      <input type="number" min="1" value={gen.count} onChange={e => updateRow(i, 'count', Number(e.target.value))} style={{ width: '60px', padding: '5px', background: '#111', color: '#fff', border: '1px solid #444' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#888', marginRight: '5px' }}>Range (km)</label>
                      <input type="number" step="50" value={gen.max_range_km || 300} onChange={e => updateRow(i, 'max_range_km', Number(e.target.value))} style={{ width: '80px', padding: '5px', background: '#111', color: '#fff', border: '1px solid #444' }} />
                    </div>
                  </>
                ) : (
                  <>
                    <select value={gen.role} onChange={e => updateRow(i, 'role', e.target.value)} style={{ padding: '5px', background: '#111', color: '#fff', border: '1px solid #444' }}>
                      <option value="DRIVER">Driver</option>
                      <option value="MECHANIC">Mechanic</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#888', marginRight: '5px' }}>Count</label>
                      <input type="number" min="1" value={gen.count} onChange={e => updateRow(i, 'count', Number(e.target.value))} style={{ width: '60px', padding: '5px', background: '#111', color: '#fff', border: '1px solid #444' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem', color: '#888', marginRight: '5px' }}>Base Salary</label>
                      <input type="number" step="1000" value={gen.base_salary_sek || 28000} onChange={e => updateRow(i, 'base_salary_sek', Number(e.target.value))} style={{ width: '90px', padding: '5px', background: '#111', color: '#fff', border: '1px solid #444' }} />
                    </div>
                  </>
                )}
                
                <button onClick={() => removeRow(i)} style={{ background: 'transparent', border: 'none', color: '#ff5252', cursor: 'pointer', marginLeft: 'auto', fontSize: '1.2rem' }}>×</button>
             </div>
          ))}
       </div>
       {/* Inject handleSave via a hidden button or rely on the parent wrapper button by not using it here and keeping parent logic intact. 
           Actually, the parent wrapper has a 'Save Config' button that reads from the DOM. 
           Since React state is detached from the parent DOM reading, we must either hoist state or trigger save via a prop. 
           Wait, we passed onSave! Let's render the Save button inside our component instead of the parent.
       */}
       <button className="btn-primary" onClick={handleSave} style={{ alignSelf: 'flex-start', marginTop: '10px' }}>💾 Save Generators to Asset</button>
    </div>
  );
};

interface LogEntry {
  time: string;
  msg: string;
  type: 'info' | 'error' | 'success';
  domain?: string;
  domainColor?: string;
}

type MyTreeData = {
  id: string;
  name: string;
  isFolder: boolean;
  children?: MyTreeData[];
  type?: 'SCENARIO' | 'ASSET' | 'FOLDER' | 'ROOT';
  treeType?: 'SCENARIO' | 'ASSET';
  data?: any;
  icon?: string;
};

export const QaDashboard: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [treeData, setTreeData] = useState<MyTreeData[]>([]);
  const [rawItems, setRawItems] = useState<any>({ folders: [], assets: [], scenarios: [] });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isStartingScenario, setIsStartingScenario] = useState(false);
  const [simulatorState, setSimulatorState] = useState<any>(null);
  const treeRef = useRef<any>(null);

  const fetchSimulatorState = async () => {
    try {
      const res = await fetch(`${ENGINE_URL}/state`);
      if (res.ok) {
         const data = await res.json();
         setSimulatorState(data);
      }
    } catch (err) {
      console.error("Failed to fetch simulator state", err);
    }
  };

  useEffect(() => {
    fetchWorldData();
    fetchSimulatorState();
    
    const simulatorInterval = setInterval(fetchSimulatorState, 3000);

    // Connect to the Event Horizon Telemetry Stream
    const eventSource = new EventSource(`${ENGINE_URL}/stream`);
    
    eventSource.onmessage = (event) => {
       try {
         const data = JSON.parse(event.data);
         if (data.type === 'HEARTBEAT') return;

         let logType: 'info' | 'success' | 'error' = 'info';
         
         // Give color context based on domain
         let domainColor = '#555';
         if (data.topic?.includes('finance')) { logType = 'success'; domainColor = '#4CAF50'; }
         if (data.topic?.includes('hr')) { logType = 'info'; domainColor = '#2196F3'; }
         if (data.topic?.includes('traffic')) { logType = 'info'; domainColor = '#FF9800'; }
         if (data.topic?.includes('depot')) { logType = 'info'; domainColor = '#9C27B0'; }
         if (data.topic?.includes('telematics') || data.topic?.includes('weather')) { domainColor = '#00BCD4'; }
         
         const payloadStr = data.payload && typeof data.payload === 'object' ? JSON.stringify(data.payload) : data.payload;
         const formattedMsg = `[${data.type}] ${payloadStr || ''}`.substring(0, 150) + (payloadStr?.length > 150 ? '...' : '');

         setLogs(prev => [{ 
            time: new Date(data.timestamp).toLocaleTimeString(), 
            msg: formattedMsg, 
            type: logType,
            domain: data.topic?.replace('-events', '').toUpperCase() || 'SYS',
            domainColor
         }, ...prev].slice(0, 100));

       } catch (err) {
         console.error("Failed to parse telemetry event", err);
       }
    };

    return () => {
      eventSource.close();
      clearInterval(simulatorInterval);
    };
  }, []);

  const addLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, type, domain: 'IDE', domainColor: '#888' }, ...prev].slice(0, 50));
  };

  const fetchWorldData = async () => {
    try {
      const res = await fetch(`${ENGINE_URL}/tree`);
      if (res.ok) {
         const data = await res.json();
         setRawItems(data);
         
         const buildChildren = (parentId: string | null, treeType: 'SCENARIO' | 'ASSET'): MyTreeData[] => {
            const children: MyTreeData[] = [];
            
            data.folders
              .filter((f: any) => f.parent_id === parentId && f.tree_type === treeType)
              .forEach((f: any) => {
                children.push({
                  id: f.id, name: f.name, isFolder: true, type: 'FOLDER', treeType, icon: '📁',
                  children: buildChildren(f.id, treeType)
                });
              });

            if (treeType === 'SCENARIO') {
              data.scenarios
                .filter((s: any) => s.folderId === parentId)
                .forEach((s: any) => children.push({ id: s.id, name: s.metadata.name, isFolder: false, type: 'SCENARIO', treeType, data: s, icon: '📄' }));
            } else {
              data.assets
                .filter((a: any) => a.folder_id === parentId)
                .forEach((a: any) => {
                   let icon = '📊';
                   if (a.type === 'FLEET_PROFILE') icon = '🚌';
                   if (a.type === 'ROSTER_PROFILE') icon = '👥';
                   if (a.type === 'FINANCE_PROFILE') icon = '💰';
                   if (a.type === 'SYNTHETIC_PROFILE' || a.type === 'NETEX_ZIP') icon = '🗓️';
                   if (a.type === 'KODA_TAPE') icon = '📼';
                   
                   children.push({ 
                     id: a.id, name: a.name, isFolder: false, type: 'ASSET', treeType, data: a, icon 
                   });
                });
            }
            return children;
         };

         setTreeData([
           { id: 'root-scenarios', name: 'Scenarios', isFolder: true, type: 'ROOT', treeType: 'SCENARIO', icon: '📁', children: buildChildren(null, 'SCENARIO') },
           { id: 'root-assets', name: 'Data Assets', isFolder: true, type: 'ROOT', treeType: 'ASSET', icon: '📁', children: buildChildren(null, 'ASSET') }
         ]);
      }
    } catch (err) {
      console.error("Failed to fetch world data", err);
    }
  };

  const onCreate = async ({ parentId, type: nodeType }: any) => {
    try {
      const isRoot = parentId === 'root-scenarios' || parentId === 'root-assets';
      const realParentId = isRoot ? null : parentId;
      const treeType = parentId.includes('scenarios') ? 'SCENARIO' : 'ASSET';

      if (nodeType === 'leaf' && treeType === 'SCENARIO') {
        const res = await fetch(`${ENGINE_URL}/scenarios`, {
           method: 'POST', headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ name: 'New Scenario', folder_id: realParentId })
        });
        const data = await res.json();
        addLog("Scenario created.", "success");
        await fetchWorldData();
        return { id: data.id, name: 'New Scenario', isFolder: false, type: 'SCENARIO' };
      } else if (nodeType.startsWith('asset-')) {
        const assetType = nodeType.replace('asset-', '');
        const res = await fetch(`${ENGINE_URL}/assets`, {
           method: 'POST', headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ name: `New ${assetType}`, folder_id: realParentId, type: assetType })
        });
        const data = await res.json();
        addLog(`Asset ${assetType} created.`, "success");
        await fetchWorldData();
        return { id: data.id, name: `New ${assetType}`, isFolder: false, type: 'ASSET' };
      } else {
        const res = await fetch(`${ENGINE_URL}/folders`, {
           method: 'POST', headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ name: 'New Folder', parent_id: realParentId, tree_type: treeType })
        });
        const data = await res.json();
        addLog("Folder created.", "success");
        await fetchWorldData();
        return { id: data.id, name: 'New Folder', isFolder: true, type: 'FOLDER' };
      }
    } catch(err: any) {
      addLog("Create failed: " + err.message, "error");
      return null;
    }
  };

  const onRename = async ({ id, name, node }: any) => {
    try {
      const type = node.data.type;
      if (type === 'ROOT') return; 
      
      const endpoint = type === 'FOLDER' ? `/folders/${id}/rename` : 
                       type === 'SCENARIO' ? `/scenarios/${id}/rename` : `/assets/${id}/rename`;
      
      await fetch(`${ENGINE_URL}${endpoint}`, {
         method: 'PUT', headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ name })
      });
      addLog(`Renamed to ${name}`, "success");
      fetchWorldData();
    } catch(err: any) {
      addLog("Rename failed: " + err.message, "error");
    }
  };

  const onDelete = async ({ nodes }: any) => {
    try {
      for (const node of nodes) {
        if (node.data.type === 'ROOT') continue;

        const endpoint = node.data.type === 'FOLDER' ? `/folders/${node.id}` : 
                         node.data.type === 'SCENARIO' ? `/scenarios/${node.id}` : `/assets/${node.id}`;
        
        const res = await fetch(`${ENGINE_URL}${endpoint}`, { method: 'DELETE' });
        if (!res.ok) {
           const errData = await res.json();
           throw new Error(errData.error || "Delete failed");
        }
        addLog(`${node.data.type} ${node.data.name} deleted.`, "success");
      }
      fetchWorldData();
    } catch(err: any) {
      addLog("Delete failed: " + err.message, "error");
    }
  };

  const onMove = async ({ dragNodes, parentId }: any) => {
    try {
      const isRoot = parentId === 'root-scenarios' || parentId === 'root-assets';
      const realParentId = isRoot ? null : parentId;
      
      for (const node of dragNodes) {
        const type = node.data.type;
        const endpoint = type === 'FOLDER' ? `/folders/${node.id}/move` : 
                         type === 'SCENARIO' ? `/scenarios/${node.id}/move` : `/assets/${node.id}/move`;
        
        const payload = type === 'FOLDER' ? { parent_id: realParentId } : { folder_id: realParentId };

        const res = await fetch(`${ENGINE_URL}${endpoint}`, {
           method: 'PUT', headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(payload)
        });
        
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Move failed");
        }
        addLog(`Moved ${node.data.name} to ${parentId}`, "success");
      }
      fetchWorldData();
    } catch(err: any) {
      addLog("Move failed: " + err.message, "error");
    }
  };

  const Node = ({ node, style, dragHandle }: NodeRendererProps<MyTreeData>) => {
    const isEditing = node.isEditing;

    return (
      <div 
        className={`tree-item ${node.isSelected && !node.data.isFolder ? 'selected' : ''}`}
        style={{ ...style, display: 'flex', alignItems: 'center', gap: '5px', paddingRight: '10px' }}
        ref={dragHandle}
        onClick={() => {
           node.toggle();
           if (!node.data.isFolder) setSelectedItem(node.id);
        }}
        onContextMenu={(e) => {
           e.preventDefault();
           node.select();
        }}
      >
        <span style={{ width: '15px', color: '#666', display: 'inline-block', textAlign: 'center' }}>
          {node.isLeaf ? '' : node.isOpen ? '▼' : '▶'}
        </span>
        
        <span>{node.data.icon}</span>

        {isEditing ? (
          <input
            autoFocus
            type="text"
            defaultValue={node.data.name}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={() => node.reset()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') node.reset();
              if (e.key === 'Enter') node.submit(e.currentTarget.value);
            }}
            className="tree-edit-input"
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', padding: '2px', background: 'var(--bg-deep)', color: 'white', border: '1px solid var(--accent-cyan)' }}
          />
        ) : (
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {node.data.name}
          </span>
        )}

        {!isEditing && node.isFocused && (
          <div className="context-menu-container">
            <div className="context-menu-trigger">⋮</div>
            <div className="context-menu">
              {node.data.isFolder && (
                <>
                  <div className="context-menu-item" onClick={(e) => { e.stopPropagation(); treeRef.current?.create({ parentId: node.id, type: 'internal' }); }}>
                     <span>📁</span> New Folder
                  </div>
                  {node.data.treeType === 'SCENARIO' && (
                     <div className="context-menu-item" onClick={(e) => { e.stopPropagation(); treeRef.current?.create({ parentId: node.id, type: 'leaf' }); }}>
                        <span>📄</span> New Scenario
                     </div>
                  )}
                  {node.data.treeType === 'ASSET' && (
                     <div className="context-menu-item" onClick={e => e.stopPropagation()}>
                        <span>📄 New Asset</span>
                        <span>❯</span>
                        <div className="context-submenu">
                          <div className="context-menu-item" onClick={(e) => { 
                             e.stopPropagation();
                             treeRef.current?.create({ parentId: node.id, type: 'asset-FLEET_PROFILE' });
                          }}>
                             <span>🚌</span> Fleet Asset
                          </div>
                          <div className="context-menu-item" onClick={(e) => { 
                             e.stopPropagation();
                             treeRef.current?.create({ parentId: node.id, type: 'asset-ROSTER_PROFILE' });
                          }}>
                             <span>👥</span> Roster Asset
                          </div>
                          <div className="context-menu-item" onClick={(e) => { 
                             e.stopPropagation();
                             treeRef.current?.create({ parentId: node.id, type: 'asset-FINANCE_PROFILE' });
                          }}>
                             <span>💰</span> Finance Asset
                          </div>
                          <div className="context-menu-item" onClick={(e) => { 
                             e.stopPropagation();
                             treeRef.current?.create({ parentId: node.id, type: 'asset-SYNTHETIC_PROFILE' });
                          }}>
                             <span>🗓️</span> Synthetic Timetable
                          </div>
                          <div className="context-menu-item" onClick={(e) => { 
                             e.stopPropagation();
                             treeRef.current?.create({ parentId: node.id, type: 'asset-NETEX_ZIP' });
                          }}>
                             <span>📦</span> NeTEx Timetable (Real)
                          </div>
                          <div className="context-menu-item" onClick={(e) => { 
                             e.stopPropagation();
                             treeRef.current?.create({ parentId: node.id, type: 'asset-KODA_TAPE' });
                          }}>
                             <span>📼</span> KODA Tape
                          </div>
                        </div>
                     </div>
                  )}
                </>
              )}
              {!node.data.id.startsWith('root-') && (
                 <div className="context-menu-item" onClick={(e) => { e.stopPropagation(); node.edit(); }}>
                    <span>✎</span> Rename
                 </div>
              )}
              {!node.data.id.startsWith('root-') && (
                 <div className="context-menu-item" onClick={(e) => { e.stopPropagation(); treeRef.current?.delete(node.id); }} style={{ color: '#ff5252' }}>
                    <span>🗑</span> Delete
                 </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const triggerHardReset = async () => {
    if (!window.confirm("Are you sure? This will PURGE all operational data!")) return;
    setIsResetting(true);
    addLog("Initiating global hard reset...", "info");
    try {
      await fetch(`${ENGINE_URL}/sandbox/reset`, { method: 'POST' });
      addLog("Hard reset complete", "success");
    } catch (err: any) {
      addLog("Reset failed: " + err.message, "error");
    } finally {
      setIsResetting(false);
    }
  };

  const triggerScenario = async (scenarioId: string) => {
     setIsStartingScenario(true);
     addLog(`Triggering scenario: ${scenarioId}...`, "info");
     try {
       const res = await fetch(`${ENGINE_URL}/scenarios/${scenarioId}/start`, { method: 'POST' });
       const data = await res.json();
       addLog(`Scenario started. Run ID: ${data.runId}`, "success");
     } catch (err: any) {
       addLog("Scenario failed: " + err.message, "error");
     } finally {
       setIsStartingScenario(false);
     }
  }

  const updateScenarioBindings = async (scenarioId: string, updates: any) => {
    try {
      // Find current scenario data to preserve existing keys
      const current = selectedNodeData;
      if (!current) return;

      const payload = {
         timetable_asset_id: updates.timetable_asset_id !== undefined ? updates.timetable_asset_id : current.timetableAssetId,
         initial_state: {
            ...(current.initialState || {}),
            ...updates.initial_state
         }
      };

      await fetch(`${ENGINE_URL}/scenarios/${scenarioId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      addLog(`Updated Scenario bindings.`, "success");
      fetchWorldData();
    } catch (err: any) {
      addLog("Failed to update scenario binding: " + err.message, "error");
    }
  };

  const injectChaos = async () => {
    addLog("Injecting manual Chaos Event...", "info");
    try {
      await fetch(`${ENGINE_URL}/chaos/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           topic: 'telematics-events',
           event: {
             type: 'VehicleBreakdown',
             vehicleId: 'BUS-102',
             severity: 'CRITICAL',
             location: { lat: 59.75, lng: 18.70 },
             description: 'Engine overheated near Norrtälje Busstation.'
           }
        })
      });
    } catch (err: any) {
      addLog("Failed to inject chaos: " + err.message, "error");
    }
  };

  const selectedNodeData = [...rawItems.scenarios, ...rawItems.assets].find(i => i.id === selectedItem);

  return (
    <div className="ide-container">
      <header className="ide-top-bar">
        <h2>World Engine IDE v2.0</h2>
        <div className="top-bar-actions" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" onClick={injectChaos} style={{ background: '#795548' }}>
             ⚡ Inject Chaos
          </button>
          <button className="btn-secondary" onClick={triggerHardReset} disabled={isResetting}>
            {isResetting ? "Resetting..." : "☢️ Hard Reset"}
          </button>
        </div>
      </header>

      <div className="ide-main">
        <aside className="ide-library">
          <div className="panel-header">Library</div>
          <div className="tree-view-wrapper" style={{ flex: 1, overflow: 'hidden' }}>
            {treeData.length > 0 ? (
               <Tree 
                 ref={treeRef}
                 data={treeData} 
                 width={260}
                 rowHeight={30}
                 indent={15}
                 onCreate={onCreate}
                 onRename={onRename}
                 onDelete={onDelete}
                 onMove={onMove}
               >
                 {Node}
               </Tree>
            ) : (
               <div style={{ padding: '15px', color: '#666' }}>Loading Library...</div>
            )}
          </div>
        </aside>

        <main className="ide-workbench">
          {selectedNodeData && selectedNodeData.metadata && (
            <div className="editor-view">
              <h3>Scenario: {selectedNodeData.metadata.name}</h3>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>{selectedNodeData.metadata.description}</p>
              
              <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #333', borderRadius: '5px' }}>
                <h5 style={{ margin: '0 0 10px 0' }}>Resource Bindings (Golden Data)</h5>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>Timetable Baseline:</label>
                    <select 
                      value={selectedNodeData.timetableAssetId || ''}
                      onChange={(e) => updateScenarioBindings(selectedNodeData.id, { timetable_asset_id: e.target.value })}
                      style={{ width: '100%', padding: '5px', background: '#222', color: '#fff', border: '1px solid #555' }}
                    >
                      <option value="">-- None --</option>
                      {rawItems.assets.filter((a: any) => a.type === 'NETEX_ZIP' || a.type === 'SYNTHETIC_PROFILE').map((a: any) => (
                         <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>HR Roster:</label>
                    <select 
                      value={selectedNodeData.initialState?.roster_asset_id || ''}
                      onChange={(e) => updateScenarioBindings(selectedNodeData.id, { initial_state: { roster_asset_id: e.target.value } })}
                      style={{ width: '100%', padding: '5px', background: '#222', color: '#fff', border: '1px solid #555' }}
                    >
                      <option value="">-- None --</option>
                      {rawItems.assets.filter((a: any) => a.type === 'ROSTER_PROFILE').map((a: any) => (
                         <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>Depot Fleet:</label>
                    <select 
                      value={selectedNodeData.initialState?.fleet_asset_id || ''}
                      onChange={(e) => updateScenarioBindings(selectedNodeData.id, { initial_state: { fleet_asset_id: e.target.value } })}
                      style={{ width: '100%', padding: '5px', background: '#222', color: '#fff', border: '1px solid #555' }}
                    >
                      <option value="">-- None --</option>
                      {rawItems.assets.filter((a: any) => a.type === 'FLEET_PROFILE').map((a: any) => (
                         <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>Finance Config:</label>
                    <select 
                      value={selectedNodeData.initialState?.finance_asset_id || ''}
                      onChange={(e) => updateScenarioBindings(selectedNodeData.id, { initial_state: { finance_asset_id: e.target.value } })}
                      style={{ width: '100%', padding: '5px', background: '#222', color: '#fff', border: '1px solid #555' }}
                    >
                      <option value="">-- None --</option>
                      {rawItems.assets.filter((a: any) => a.type === 'FINANCE_PROFILE').map((a: any) => (
                         <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', display: 'block', marginBottom: '5px' }}>KODA Tape (Telemetri):</label>
                    <select 
                      value={selectedNodeData.initialState?.koda_asset_id || ''}
                      onChange={(e) => updateScenarioBindings(selectedNodeData.id, { initial_state: { koda_asset_id: e.target.value } })}
                      style={{ width: '100%', padding: '5px', background: '#222', color: '#fff', border: '1px solid #555' }}
                    >
                      <option value="">-- None --</option>
                      {rawItems.assets.filter((a: any) => a.type === 'KODA_TAPE').map((a: any) => (
                         <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <h5 style={{ margin: '20px 0 10px 0' }}>Execution</h5>
                <button className="btn-primary" style={{ marginTop: '10px' }} onClick={() => triggerScenario(selectedNodeData.id)} disabled={isStartingScenario}>
                  {isStartingScenario ? 'Running...' : '▶ Run Scenario'}
                </button>
              </div>
            </div>
          )}

          {selectedNodeData && selectedNodeData.type && (
            <div className="editor-view">
              <h3>Data Asset: {selectedNodeData.name}</h3>
              <p style={{ color: '#888', fontSize: '0.9rem' }}>Type: {selectedNodeData.type}</p>
              <div style={{ marginTop: '20px', padding: '15px', background: '#222', border: '1px solid #333', borderRadius: '5px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                   <label style={{ fontSize: '0.8rem', color: '#aaa' }}>
                     {selectedNodeData.type === 'FINANCE_PROFILE' || selectedNodeData.type === 'FLEET_PROFILE' || selectedNodeData.type === 'ROSTER_PROFILE' || selectedNodeData.type === 'KODA_TAPE' || selectedNodeData.type === 'NETEX_ZIP' || selectedNodeData.type === 'SYNTHETIC_PROFILE' ? 'Configuration (Form):' : 'Configuration (JSON):'}
                   </label>
                   
                   {!(selectedNodeData.type === 'FLEET_PROFILE' || selectedNodeData.type === 'ROSTER_PROFILE' || selectedNodeData.type === 'KODA_TAPE' || selectedNodeData.type === 'NETEX_ZIP' || selectedNodeData.type === 'SYNTHETIC_PROFILE') && (
                     <button className="btn-secondary" style={{ padding: '2px 10px', fontSize: '0.8rem' }} onClick={async () => {
                       try {
                          let parsed;
                          if (selectedNodeData.type === 'FINANCE_PROFILE') {
                             parsed = {
                                startingCashSek: Number((document.getElementById('fin-cash') as HTMLInputElement).value),
                                creditLimit: Number((document.getElementById('fin-credit') as HTMLInputElement).value)
                             };
                          } else {
                             parsed = JSON.parse(document.getElementById('asset-json-editor')!.innerText);
                          }
                          
                          await fetch(`${ENGINE_URL}/assets/${selectedNodeData.id}/config`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ config: parsed })
                          });
                          addLog('Asset configuration saved', 'success');
                          fetchWorldData();
                       } catch(e) {
                          addLog('Invalid format', 'error');
                       }
                     }}>💾 Save Config</button>
                   )}
                 </div>
                 
                 {selectedNodeData.type === 'FINANCE_PROFILE' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
                      <div>
                         <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '5px' }}>Starting Cash (SEK)</label>
                         <input id="fin-cash" type="number" defaultValue={selectedNodeData.config.startingCashSek || 1000000} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '3px', width: '100%', maxWidth: '300px' }} />
                      </div>
                      <div>
                         <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '5px' }}>Credit Limit (SEK)</label>
                         <input id="fin-credit" type="number" defaultValue={selectedNodeData.config.creditLimit || 500000} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '3px', width: '100%', maxWidth: '300px' }} />
                      </div>
                    </div>
                 ) : selectedNodeData.type === 'KODA_TAPE' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
                      <div>
                         <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '5px' }}>Target Date (YYYY-MM-DD) <span style={{color:'#888', fontSize:'0.7rem'}}>*Must be a real historical date</span></label>
                         <input id="koda-date" type="text" defaultValue={selectedNodeData.config.targetDate || '2024-01-05'} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '3px', width: '100%', maxWidth: '300px' }} />
                      </div>
                      <div>
                         <label style={{ display: 'block', fontSize: '0.85rem', color: '#ccc', marginBottom: '5px' }}>Target Line ID</label>
                         <input id="koda-line" type="text" defaultValue={selectedNodeData.config.targetLineId || '676'} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '3px', width: '100%', maxWidth: '300px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button className="btn-secondary" onClick={async () => {
                           try {
                              const targetDate = (document.getElementById('koda-date') as HTMLInputElement).value;
                              const targetLineId = (document.getElementById('koda-line') as HTMLInputElement).value;
                              
                              await fetch(`${ENGINE_URL}/assets/${selectedNodeData.id}/config`, {
                                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ config: { targetDate, targetLineId } })
                              });
                              
                              addLog('Downloading KODA Tape from Trafiklab... This will take a while.', 'info');
                              const res = await fetch(`${ENGINE_URL}/koda-download`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ targetDate, targetLineId })
                              });
                              const data = await res.json();
                              
                              if (res.ok) {
                                addLog(`KODA Tape Downloaded: ${data.tapeName} (${data.dataPoints} points)`, 'success');
                                await fetch(`${ENGINE_URL}/assets/${selectedNodeData.id}/config`, {
                                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ config: { targetDate, targetLineId, tapeName: data.tapeName } })
                                });
                                fetchWorldData();
                              } else {
                                addLog(`KODA Download failed: ${data.error}`, 'error');
                              }
                           } catch(e: any) {
                              addLog('Request failed: ' + e.message, 'error');
                           }
                        }}>⬇️ Download Tape from Trafiklab</button>
                        {selectedNodeData.config.tapeName && (
                           <span style={{color: '#4CAF50'}}>Ready: {selectedNodeData.config.tapeName}</span>
                        )}
                      </div>
                    </div>
                 ) : selectedNodeData.type === 'NETEX_ZIP' || selectedNodeData.type === 'SYNTHETIC_PROFILE' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
                      {selectedNodeData.type === 'NETEX_ZIP' && (
                        <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '5px', border: '1px solid #333', marginBottom: '10px' }}>
                           <h5 style={{ margin: '0 0 10px 0', color: '#e94560' }}>Source: Trafiklab NeTEx</h5>
                           <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '5px' }}>Operator (e.g. sl, ul, vt, skane)</label>
                           <select id="netex-operator" defaultValue={selectedNodeData.config.operatorId || 'sl'} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '3px', width: '100%', maxWidth: '300px', marginBottom: '10px' }}>
                              <option value="sl">SL (Stockholm)</option>
                              <option value="ul">UL (Uppsala)</option>
                              <option value="vt">Västtrafik</option>
                              <option value="skane">Skånetrafiken</option>
                           </select>
                           <button className="btn-secondary" style={{ display: 'block' }} onClick={async () => {
                              try {
                                 const operatorId = (document.getElementById('netex-operator') as HTMLSelectElement).value;
                                 addLog(`Initiating NeTEx download for ${operatorId.toUpperCase()}...`, 'info');
                                 
                                 const bffUrl = 'https://kalles-bff-w7fsmra4yq-ew.a.run.app';
                                 const res = await fetch(`${bffUrl}/api/qa/netex/download`, {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ operatorId })
                                 });
                                 const data = await res.json();
                                 
                                 if (res.ok) {
                                    addLog(`NeTEx Archive Downloaded: ${data.filename}`, 'success');
                                    // Update filename in config
                                    (document.getElementById('netex-filename') as HTMLInputElement).value = data.filename;
                                 } else {
                                    addLog(`Download failed: ${data.error}`, 'error');
                                 }
                              } catch(e: any) {
                                 addLog('Request failed: ' + e.message, 'error');
                              }
                           }}>⬇️ Download Latest from Trafiklab</button>
                        </div>
                      )}

                      {selectedNodeData.type === 'SYNTHETIC_PROFILE' && (
                        <div style={{ padding: '15px', background: '#1a1a1a', borderRadius: '5px', border: '1px solid #333', marginBottom: '10px' }}>
                           <h5 style={{ margin: '0 0 10px 0', color: '#3498db' }}>Source: Synthetic Generator</h5>
                           <p style={{ fontSize: '0.8rem', color: '#888' }}>Generates a deterministic high-frequency timetable for testing.</p>
                           {/* Future: Add frequency/stop count sliders here */}
                        </div>
                      )}

                      <div>
                         <label style={{ display: 'block', fontSize: '0.8rem', color: '#ccc', marginBottom: '5px' }}>Current Archive / ID</label>
                         <input id="netex-filename" type="text" defaultValue={selectedNodeData.config.filename || 'latest'} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '3px', width: '100%', maxWidth: '300px' }} />
                      </div>
                      <div>
                         <label style={{ display: 'block', fontSize: '0.8rem', color: '#ccc', marginBottom: '5px' }}>Lines to Extract (comma separated)</label>
                         <input id="netex-lines" type="text" defaultValue={(selectedNodeData.config.lines || ['676']).join(',')} style={{ padding: '8px', background: '#111', color: '#fff', border: '1px solid #444', borderRadius: '3px', width: '100%', maxWidth: '300px' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button className="btn-secondary" onClick={async () => {
                           try {
                              const filename = (document.getElementById('netex-filename') as HTMLInputElement).value;
                              const linesStr = (document.getElementById('netex-lines') as HTMLInputElement).value;
                              const lines = linesStr.split(',').map(l => l.trim()).filter(l => l.length > 0);
                              const operatorId = selectedNodeData.type === 'NETEX_ZIP' ? (document.getElementById('netex-operator') as HTMLSelectElement).value : undefined;
                              
                              await fetch(`${ENGINE_URL}/assets/${selectedNodeData.id}/config`, {
                                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ config: { filename, lines, operatorId } })
                              });
                              
                              addLog('Timetable configuration saved', 'success');
                              fetchWorldData();
                           } catch(e: any) {
                              addLog('Request failed: ' + e.message, 'error');
                           }
                        }}>💾 Save Config to Asset</button>
                      </div>
                    </div>
                 ) : selectedNodeData.type === 'FLEET_PROFILE' || selectedNodeData.type === 'ROSTER_PROFILE' ? (
                    <GeneratorEditor assetData={selectedNodeData} onSave={async (newConfig: any) => {
                       try {
                          await fetch(`${ENGINE_URL}/assets/${selectedNodeData.id}/config`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ config: newConfig })
                          });
                          addLog('Asset configuration saved', 'success');
                          fetchWorldData();
                       } catch(e) {
                          addLog('Invalid format', 'error');
                       }
                    }} />
                 ) : (
                    <pre id="asset-json-editor" contentEditable suppressContentEditableWarning style={{ margin: 0, color: '#aaa', fontSize: '0.85em', minHeight: '150px', outline: 'none', border: '1px solid #444', padding: '10px' }}>{JSON.stringify(selectedNodeData.config, null, 2)}</pre>
                 )}
                 
                 <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '10px' }}>
                   * Use <code>explicit_staff</code> (or vehicles) arrays for detailed unit definitions to test edge-cases, and <code>generators</code> to quickly provision bulk volume.
                 </p>
              </div>
            </div>
          )}

          {!selectedNodeData && (
            <div className="editor-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
                <h2 style={{ margin: 0, color: '#3498db' }}>🌍 Outer Ring Counterparts (Simulator)</h2>
                <button className="btn-secondary" onClick={fetchSimulatorState}>🔄 Refresh State</button>
              </div>
              <p style={{ color: '#888', margin: 0, fontSize: '0.9rem' }}>
                Detta är omvärldsimulatorns kontrollpanel. Här övervakas och verifieras de utbetalningar, deklarationer och rapporter som Kalles Buss skickar ut till externa motparter.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                {/* CARD 1: BANKGIROT */}
                <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '5px', padding: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#2ecc71', display: 'flex', alignItems: 'center', gap: '8px' }}>🏦 Bankgirot (ISO 20022)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.9rem' }}>
                    <div>Processed Outgoing Salaries: <strong style={{ color: '#fff' }}>{simulatorState?.counterparts?.bankgiro?.processedOutgoingSalaries?.toLocaleString() || 0} SEK</strong></div>
                    <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '10px' }}>Received pain.001 files:</div>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#111', padding: '5px', borderRadius: '3px', border: '1px solid #222' }}>
                      {(!simulatorState?.counterparts?.bankgiro?.receivedPain001Files || simulatorState.counterparts.bankgiro.receivedPain001Files.length === 0) && <span style={{ color: '#444', fontStyle: 'italic' }}>No bank files received.</span>}
                      {simulatorState?.counterparts?.bankgiro?.receivedPain001Files?.map((f: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.75rem', borderBottom: '1px solid #222', padding: '3px 0' }}>
                          📅 {new Date(f.timestamp).toLocaleTimeString()} - <strong>{f.netAmount?.toLocaleString()} SEK</strong> (Run: {f.runId})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CARD 2: SKATTEVERKET */}
                <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '5px', padding: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#e67e22', display: 'flex', alignItems: 'center', gap: '8px' }}>🇸🇪 Skatteverket (AGI)</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.9rem' }}>
                    <div>Total AGI Submissions: <strong style={{ color: '#fff' }}>{simulatorState?.counterparts?.skatteverket?.receivedAgiReports?.length || 0}</strong></div>
                    <div style={{ color: '#666', fontSize: '0.8rem', marginTop: '10px' }}>Received AGI Declarations:</div>
                    <div style={{ maxHeight: '100px', overflowY: 'auto', background: '#111', padding: '5px', borderRadius: '3px', border: '1px solid #222' }}>
                      {(!simulatorState?.counterparts?.skatteverket?.receivedAgiReports || simulatorState.counterparts.skatteverket.receivedAgiReports.length === 0) && <span style={{ color: '#444', fontStyle: 'italic' }}>No AGI declarations received.</span>}
                      {simulatorState?.counterparts?.skatteverket?.receivedAgiReports?.map((r: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.75rem', borderBottom: '1px solid #222', padding: '3px 0' }}>
                          📅 {new Date(r.timestamp).toLocaleTimeString()} - 💰 Gross: {r.grossAmount?.toLocaleString()} SEK (Tax: {r.taxAmount?.toLocaleString()} SEK)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CARD 3: FORA PENSION */}
                <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '5px', padding: '15px', gridColumn: 'span 2' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#3498db', display: 'flex', alignItems: 'center', gap: '8px' }}>📝 FORA Pensionsredovisning</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div>
                      <div style={{ color: '#666', fontSize: '0.8rem' }}>Received FORA Reports:</div>
                      <div style={{ maxHeight: '120px', overflowY: 'auto', background: '#111', padding: '5px', borderRadius: '3px', border: '1px solid #222', marginTop: '5px' }}>
                        {(!simulatorState?.counterparts?.fora?.receivedReports || simulatorState.counterparts.fora.receivedReports.length === 0) && <span style={{ color: '#444', fontStyle: 'italic' }}>No FORA reports received.</span>}
                        {simulatorState?.counterparts?.fora?.receivedReports?.map((r: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '0.75rem', borderBottom: '1px solid #222', padding: '3px 0' }}>
                            📅 {new Date(r.timestamp).toLocaleTimeString()} - Gross: {r.grossAmount?.toLocaleString()} SEK
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: '#666', fontSize: '0.8rem' }}>Sent Pension Invoices (FORA ➡️ Kalles Buss):</div>
                      <div style={{ maxHeight: '120px', overflowY: 'auto', background: '#111', padding: '5px', borderRadius: '3px', border: '1px solid #222', marginTop: '5px' }}>
                        {(!simulatorState?.counterparts?.fora?.sentPensionInvoices || simulatorState.counterparts.fora.sentPensionInvoices.length === 0) && <span style={{ color: '#444', fontStyle: 'italic' }}>No pension invoices sent yet.</span>}
                        {simulatorState?.counterparts?.fora?.sentPensionInvoices?.map((i: any, idx: number) => (
                          <div key={idx} style={{ fontSize: '0.75rem', borderBottom: '1px solid #222', padding: '3px 0', display: 'flex', justifyContent: 'space-between' }}>
                            <span>⚡ {i.reference}</span>
                            <strong style={{ color: '#e74c3c' }}>{i.amount?.toLocaleString()} SEK (Pending AP)</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        <section className="ide-preview">
          <iframe 
            src={PORTAL_URL} 
            title="Kalles Buss Portal"
            className="portal-iframe"
          />
        </section>
      </div>

      <footer className="ide-bottom-panel">
        <div className="panel-header">Event Horizon</div>
        <div className="log-stream">
          {logs.map((log, i) => (
            <div key={i} className={`log-entry ${log.type}`} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#555', whiteSpace: 'nowrap' }}>[{log.time}]</span>
              {log.domain && (
                 <span style={{ 
                    background: log.domainColor || '#333', 
                    color: '#fff', 
                    padding: '2px 6px', 
                    borderRadius: '3px', 
                    fontSize: '0.7rem', 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap'
                 }}>{log.domain}</span>
              )}
              <span style={{ wordBreak: 'break-all' }}>{log.msg}</span>
            </div>
          ))}
          {logs.length === 0 && <div style={{ color: '#444' }}>Waiting for events...</div>}
        </div>
      </footer>
    </div>
  );
};
