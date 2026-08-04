
import React, { useState, useEffect } from 'react';
import { 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  useReactTable 
} from '@tanstack/react-table';
import { Tree } from 'react-arborist';
import type { NodeRendererProps } from 'react-arborist';
import { 
  Truck, 
  MapPin, 
  Wrench, 
  X, 
  Bus, 
  Plus, 
  Loader2,
  Tags,
  Activity,
  Edit2,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
  MoreVertical as MoreIcon
} from 'lucide-react';
import { registryApi } from '../api/registry';
import './RegistryDashboard.css';

type Depot = {
  id: string;
  name: string;
  location: string;
  location_description?: string;
  capacity: number;
  pointsCount: number;
};

type VehicleType = {
  id: string;
  manufacturer: string;
  model_number: string;
  asset_class: string;
  is_active: boolean;
  attributes?: any; // The new JSONB EAV blob
  fleetCount?: number;
};

type PhysicalAsset = {
  id: string;
  asset_model_id: string;
  parent_asset_id: string | null;
  home_depot_id: string;
  status: string;
  serial_number: string;
  attributes?: any;
  model_number?: string; // Joined from models
  asset_class?: string; // Joined from models
  home_depot_name?: string; // Joined from depots
};

const depotHelper = createColumnHelper<Depot>();
const typeHelper = createColumnHelper<VehicleType>();
const assetHelper = createColumnHelper<PhysicalAsset>();

const assetColumns = [
  assetHelper.accessor('serial_number', {
    header: 'Asset ID / Serial',
    cell: info => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
  }),
  assetHelper.accessor('model_number', { header: 'Model Blueprint' }),
  assetHelper.accessor('asset_class', { 
    header: 'Class',
    cell: info => {
      const val = info.getValue();
      if(!val) return '-';
      return <span className={`status-badge ${val === 'VEHICLE' ? 'gray' : 'primary'}`}>{val.replace('_', ' ')}</span>;
    }
  }),
  assetHelper.accessor('home_depot_name', { header: 'Home Depot' }),
  assetHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const status = info.getValue();
      let color = 'gray';
      if (status === 'AVAILABLE') color = 'green';
      if (status === 'IN_MAINTENANCE') color = 'orange';
      if (status === 'IN_TRANSIT') color = 'blue';
      return <span className={`status-badge ${color}`}>{status}</span>;
    }
  })
];

const vehicleTypeColumns = [
  typeHelper.accessor('model_number', {
    header: 'Littera',
    cell: info => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
  }),
  typeHelper.accessor('manufacturer', { header: 'Manufacturer' }),
  typeHelper.accessor((row) => row.attributes?.description || '', { 
    id: 'description', 
    header: 'Description' 
  }),
  typeHelper.accessor('fleetCount', { 
    header: 'Active Fleet',
    cell: info => <span className="status-badge gray">{info.getValue() || 0} units</span>
  }),
  typeHelper.accessor('is_active', {
    header: 'Status',
    cell: info => <span className={`status-badge ${info.getValue() ? 'green' : 'gray'}`}>{info.getValue() ? 'ACTIVE' : 'INACTIVE'}</span>
  })
];

const equipmentTypeColumns = [
  typeHelper.accessor('model_number', {
    header: 'Equipment Type',
    cell: info => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
  }),
  typeHelper.accessor('manufacturer', { header: 'Manufacturer' }),
  typeHelper.accessor('asset_class', { 
    header: 'Class',
    cell: info => {
      const val = info.getValue();
      const statusClass = val === 'TRACKABLE_TOOL' ? 'primary' : 'gray';
      return <span className={`status-badge ${statusClass}`}>{val.replace('_', ' ')}</span>;
    }
  }),
  typeHelper.accessor('fleetCount', { 
    header: 'Quantity Owned',
    cell: info => <span className="status-badge gray">{info.getValue() || 0} units</span>
  }),
  typeHelper.accessor('is_active', {
    header: 'Status',
    cell: info => <span className={`status-badge ${info.getValue() ? 'green' : 'gray'}`}>{info.getValue() ? 'ACTIVE' : 'INACTIVE'}</span>
  })
];

const depotColumns = [
  depotHelper.accessor('name', {
    header: 'Depot Name',
    cell: info => <span style={{ fontWeight: 600 }}>{info.getValue()}</span>,
  }),
  depotHelper.accessor('id', { header: 'System ID' }),
  depotHelper.accessor((row: any) => row.location_description || row.location, { 
    id: 'location',
    header: 'Location' 
  }),
  depotHelper.accessor('capacity', { header: 'Capacity' }),
  depotHelper.accessor('pointsCount', { 
    header: 'Facilities',
    cell: info => <span className="status-badge gray">{info.getValue()} points</span>
  }),
];

type VmrsTreeNode = {
  id: string;
  code: string;
  description: string;
  type: 'SYSTEM' | 'ASSEMBLY' | 'COMPONENT';
  children?: VmrsTreeNode[];
};

export const RegistryDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'FACILITIES' | 'VEHICLE_MODELS' | 'EQUIPMENT_MODELS' | 'ASSETS' | 'TAXONOMY'>('FACILITIES');
  const [depots, setDepots] = useState<Depot[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  
  // VMRS Tree State
  const [vmrsTreeData, setVmrsTreeData] = useState<VmrsTreeNode[]>([]);
  const [selectedTreeNode, setSelectedTreeNode] = useState<VmrsTreeNode | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'GENERAL' | 'BOM' | 'SERVICE' | 'POINTS'>('GENERAL');

  // Form State
  const [formData, setFormData] = useState<any>({});
  
  // Depot Points Sub-state
  const [depotPoints, setDepotPoints] = useState<any[]>([]);
  const [isCreatingPoint, setIsCreatingPoint] = useState(false);
  const [newPointData, setNewPointData] = useState<any>({ facility_type: 'PARKING' });
  const [editingPointId, setEditingPointId] = useState<string | null>(null);
  const [editPointData, setEditPointData] = useState<any>({});

  // BOM Sub-state
  const [bomTemplates, setBomTemplates] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [vmrsComponents, setVmrsComponents] = useState<any[]>([]);
  const [isCreatingBom, setIsCreatingBom] = useState(false);
  const [newBomData, setNewBomData] = useState<any>({ quantity: 1 });
  const [editingBomId, setEditingBomId] = useState<string | null>(null);
  const [editBomData, setEditBomData] = useState<any>({});

  // Service Templates Sub-state
  const [serviceTemplates, setServiceTemplates] = useState<any[]>([]);
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [newServiceData, setNewServiceData] = useState<any>({ trigger_type: 'CALENDAR', interval_uom_code: 'MONTHS', interval_value: 12 });

  // VMRS Creation State
  const [isAddVmrsModalOpen, setAddVmrsModalOpen] = useState(false);
  const [newVmrsType, setNewVmrsType] = useState<'SYSTEM' | 'ASSEMBLY' | 'COMPONENT'>('SYSTEM');
  const [newVmrsData, setNewVmrsData] = useState<any>({ code: '', description: '' });

  // Physical Assets Sub-state
  const [physicalAssets, setPhysicalAssets] = useState<PhysicalAsset[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'FACILITIES') {
        const [depotData] = await Promise.all([
           registryApi.getDepots(),
        ]);
        setDepots(depotData);
      } else if (activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS') {
        const data = await registryApi.getAssetModels();
        setVehicleTypes(data);
      } else if (activeTab === 'TAXONOMY') {
         const treeData = await registryApi.getVmrsTree();
         setVmrsTreeData(Array.isArray(treeData) ? treeData : []);
      } else if (activeTab === 'ASSETS') {
         const assetsData = await registryApi.getAssets(true); // Root assets only
         setPhysicalAssets(assetsData);
         if (vehicleTypes.length === 0) registryApi.getAssetModels().then(setVehicleTypes);
         if (depots.length === 0) registryApi.getDepots().then(setDepots);
      }
    } catch (err) {
      console.error('Failed to fetch registry data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const VmrsNode = ({ node, style, dragHandle }: NodeRendererProps<VmrsTreeNode>) => {
    const isSystem = node.data.type === 'SYSTEM';
    const isAssembly = node.data.type === 'ASSEMBLY';
    const isComponent = node.data.type === 'COMPONENT';

    return (
      <div style={style} ref={dragHandle} className={`tree-node ${node.state.isSelected ? 'selected' : ''}`}>
        <div className="node-content" onClick={() => node.toggle()}>
          <div className="node-prefix">
            {!node.isLeaf ? (
              node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : <div style={{width: 14}} />}
            {isSystem && <Folder size={14} className="icon-system" />}
            {isAssembly && <Activity size={14} className="icon-assembly" />}
            {isComponent && <FileText size={14} className="icon-component" />}
          </div>
          <span className="node-code">{node.data.code}</span>
          <span className="node-text">{node.data.description}</span>
          
          <div className="node-actions">
            {!isComponent && (
              <button 
                className="node-action-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTreeNode(node.data);
                  if (isSystem) setNewVmrsType('ASSEMBLY');
                  else if (isAssembly) setNewVmrsType('COMPONENT');
                  setNewVmrsData({ code: '', description: '' });
                  setAddVmrsModalOpen(true);
                }}
                title={`Add ${isSystem ? 'Assembly' : 'Component'}`}
              >
                <Plus size={14} />
              </button>
            )}
            <button className="node-action-btn"><MoreIcon size={14} /></button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Fetch dropdown data once
  useEffect(() => {
     registryApi.getParts().then(data => setParts(Array.isArray(data) ? data : [])).catch(console.error);
     registryApi.getVmrsComponentsStatic().then(data => setVmrsComponents(Array.isArray(data) ? data : [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (drawerTab === 'POINTS' && selectedRow?.id && !isNew && activeTab === 'FACILITIES') {
      registryApi.getDepotPoints(selectedRow.id).then(setDepotPoints).catch(e => console.error("Failed to fetch points", e));
    } else if (drawerTab === 'BOM' && selectedRow?.id && !isNew && (activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS')) {
      registryApi.getBomTemplates(selectedRow.id).then(setBomTemplates).catch(e => console.error("Failed to fetch BOM", e));
    } else if (drawerTab === 'SERVICE' && selectedRow?.id && !isNew && (activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS')) {
      registryApi.getServiceTemplates(selectedRow.id).then(setServiceTemplates).catch(e => console.error("Failed to fetch Services", e));
    }
  }, [drawerTab, selectedRow?.id, isNew, activeTab]);

  const depotTable = useReactTable({
    data: depots,
    columns: depotColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const filteredModels = React.useMemo(() => vehicleTypes.filter(m => 
    activeTab === 'VEHICLE_MODELS' ? m.asset_class === 'VEHICLE' : m.asset_class !== 'VEHICLE'
  ), [vehicleTypes, activeTab]);

  const typeTable = useReactTable({
    data: filteredModels,
    columns: activeTab === 'VEHICLE_MODELS' ? vehicleTypeColumns : equipmentTypeColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const assetTable = useReactTable({
    data: physicalAssets,
    columns: assetColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleRowClick = (rowOriginal: any) => {
    // Ensure attributes exists even if backend returns null
    const safeData = {
      ...rowOriginal,
      location: rowOriginal.location_description || rowOriginal.location,
      attributes: rowOriginal.attributes || {}
    };
    setSelectedRow(safeData);
    setFormData(safeData);
    setIsNew(false);
    setDrawerTab('GENERAL');
  };

  const handleNewEntryClick = () => {
    if (activeTab === 'TAXONOMY') {
      if (!selectedTreeNode) {
        setNewVmrsType('SYSTEM');
      } else if (selectedTreeNode.type === 'SYSTEM') {
        setNewVmrsType('ASSEMBLY');
      } else if (selectedTreeNode.type === 'ASSEMBLY') {
        setNewVmrsType('COMPONENT');
      } else {
        alert("Cannot add children to a Component level node.");
        return;
      }
      setNewVmrsData({ code: '', description: '' });
      setAddVmrsModalOpen(true);
      return;
    }

    setSelectedRow({ id: 'NEW_ENTRY_MOCK_ID' }); // Use a stable string ID to prevent useEffect loops
    
    let defaultData: any = {};
    if (activeTab === 'VEHICLE_MODELS') defaultData = { asset_class: 'VEHICLE', attributes: {} };
    else if (activeTab === 'EQUIPMENT_MODELS') defaultData = { asset_class: 'FACILITY_EQUIPMENT', attributes: {} };
    else if (activeTab === 'ASSETS') defaultData = { status: 'AVAILABLE', attributes: {} };

    setFormData(defaultData);
    setIsNew(true);
    setDrawerTab('GENERAL');
  };

  const handleCloseDrawer = () => {
    setSelectedRow(null);
    setIsNew(false);
    setFormData({});
  };

  const handleAttributeChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      attributes: {
        ...(prev.attributes || {}),
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'FACILITIES') {
        if (isNew) await registryApi.createDepot(formData);
        else await registryApi.updateDepot(selectedRow.id, formData);
      } else if (activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS') {
        if (isNew) await registryApi.createAssetModel(formData);
        else await registryApi.updateAssetModel(selectedRow.id, formData);
      } else if (activeTab === 'ASSETS') {
        if (isNew) await registryApi.createAsset(formData);
        else await registryApi.updateAsset(selectedRow.id, formData);
      }
      handleCloseDrawer();
      fetchData();
    } catch (err) {
      alert('Failed to save: ' + err);
    }
  };

  const handleSavePoint = async () => {
    try {
      if (!newPointData.id || !newPointData.name) {
        alert('Please fill out point ID and Name');
        return;
      }
      await registryApi.createDepotPoint(selectedRow.id, newPointData);
      const updatedPoints = await registryApi.getDepotPoints(selectedRow.id);
      setDepotPoints(updatedPoints);
      setIsCreatingPoint(false);
      setNewPointData({ facility_type: 'PARKING' });
      fetchData(); // Update the main list count
    } catch (err) {
      alert('Failed to save point: ' + err);
    }
  };

  const handleUpdatePoint = async () => {
    try {
      if (!editPointData.name) {
        alert('Name cannot be empty');
        return;
      }
      await registryApi.updateDepotPoint(selectedRow.id, editingPointId as string, editPointData);
      const updatedPoints = await registryApi.getDepotPoints(selectedRow.id);
      setDepotPoints(updatedPoints);
      setEditingPointId(null);
      setEditPointData({});
    } catch (err) {
      alert('Failed to update point: ' + err);
    }
  };

  const handleDeletePoint = async (pointId: string) => {
    try {
      await registryApi.deleteDepotPoint(selectedRow.id, pointId);
      setDepotPoints(depotPoints.filter(p => p.id !== pointId));
      fetchData(); // Update the main list count
    } catch (err) {
      alert('Failed to delete point: ' + err);
    }
  };

  const handleSaveBom = async () => {
    try {
      if (!newBomData.part_id) {
        alert('Please select a Part.');
        return;
      }
      await registryApi.createBomTemplate(selectedRow.id, newBomData);
      const updatedBom = await registryApi.getBomTemplates(selectedRow.id);
      setBomTemplates(updatedBom);
      setIsCreatingBom(false);
      setNewBomData({ quantity: 1 });
    } catch (err) {
      alert('Failed to save BOM entry: ' + err);
    }
  };

  const handleUpdateBom = async () => {
    try {
      if (!editBomData.quantity) {
        alert('Quantity cannot be empty');
        return;
      }
      await registryApi.updateBomTemplate(selectedRow.id, editingBomId as string, { quantity: editBomData.quantity });
      const updatedBom = await registryApi.getBomTemplates(selectedRow.id);
      setBomTemplates(updatedBom);
      setEditingBomId(null);
      setEditBomData({});
    } catch (err) {
      alert('Failed to update BOM entry: ' + err);
    }
  };

  const handleDeleteBom = async (bomId: string) => {
    try {
      await registryApi.deleteBomTemplate(selectedRow.id, bomId);
      setBomTemplates(bomTemplates.filter(b => b.id !== bomId));
    } catch (err) {
      alert('Failed to delete BOM entry: ' + err);
    }
  };

  const handleSaveService = async () => {
    try {
      if (!newServiceData.title) {
        alert('Please provide a title for the Service Template.');
        return;
      }
      await registryApi.createServiceTemplate(selectedRow.id, newServiceData);
      const updatedServices = await registryApi.getServiceTemplates(selectedRow.id);
      setServiceTemplates(updatedServices);
      setIsCreatingService(false);
      setNewServiceData({ trigger_type: 'CALENDAR', interval_uom_code: 'MONTHS', interval_value: 12 });
    } catch (err) {
      alert('Failed to save Service Template: ' + err);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await registryApi.deleteServiceTemplate(selectedRow.id, serviceId);
      setServiceTemplates(serviceTemplates.filter(s => s.id !== serviceId));
    } catch (err) {
      alert('Failed to delete Service Template: ' + err);
    }
  };

  const handleSaveVmrs = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (newVmrsType === 'SYSTEM') {
        await registryApi.createVmrsSystem(newVmrsData);
      } else if (newVmrsType === 'ASSEMBLY' && selectedTreeNode) {
        await registryApi.createVmrsAssembly({ ...newVmrsData, systemId: selectedTreeNode.id });
      } else if (newVmrsType === 'COMPONENT' && selectedTreeNode) {
        await registryApi.createVmrsComponent({ ...newVmrsData, assemblyId: selectedTreeNode.id });
      }
      
      const treeData = await registryApi.getVmrsTree();
      setVmrsTreeData(Array.isArray(treeData) ? treeData : []);
      setAddVmrsModalOpen(false);
      setSelectedTreeNode(null);
    } catch (err) {
      alert('Failed to save VMRS entry: ' + err);
    }
  };

  const renderTable = (tableInstance: any) => (
    <div className="kalles-table-container">
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}><Loader2 className="animate-spin" size={32} /></div>
      ) : (
        <table className="kalles-table">
          <thead>
            {tableInstance.getHeaderGroups().map((headerGroup: any) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableInstance.getRowModel().rows.map((row: any) => (
              <tr key={row.id} onClick={() => handleRowClick(row.original)}>
                {row.getVisibleCells().map((cell: any) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className="registry-dashboard">
      <header className="registry-header">
        <h2 style={{ margin: 0, marginBottom: '16px' }}>Master Data & EAM Registry</h2>
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'FACILITIES' ? 'active' : ''}`} onClick={() => setActiveTab('FACILITIES')}>
            <MapPin size={18} /> Facilities & Org
          </button>
          <button className={`tab-btn ${activeTab === 'VEHICLE_MODELS' ? 'active' : ''}`} onClick={() => setActiveTab('VEHICLE_MODELS')}>
            <Truck size={18} /> Vehicle Blueprints
          </button>
          <button className={`tab-btn ${activeTab === 'EQUIPMENT_MODELS' ? 'active' : ''}`} onClick={() => setActiveTab('EQUIPMENT_MODELS')}>
            <Wrench size={18} /> Depot Equipment
          </button>
          <button className={`tab-btn ${activeTab === 'ASSETS' ? 'active' : ''}`} onClick={() => setActiveTab('ASSETS')}>
            <Bus size={18} /> Physical Assets
          </button>
          <button className={`tab-btn ${activeTab === 'TAXONOMY' ? 'active' : ''}`} onClick={() => setActiveTab('TAXONOMY')}>
            <Tags size={18} /> Taxonomy (VMRS)
          </button>
        </div>
      </header>

      <div className="registry-content">
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            {activeTab === 'FACILITIES' && 'Depots & Locations'}
            {activeTab === 'VEHICLE_MODELS' && 'Vehicle Blueprints'}
            {activeTab === 'EQUIPMENT_MODELS' && 'Equipment Models'}
            {activeTab === 'ASSETS' && 'Active Fleet & Equipment'}
            {activeTab === 'TAXONOMY' && 'VMRS & Failure Codes'}
          </h3>
          <button 
            className="primary-btn" 
            style={{ width: 'auto', marginTop: 0, padding: '8px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}
            onClick={handleNewEntryClick}
          >
            <Plus size={18} /> New Entry
          </button>
        </div>

        {activeTab === 'FACILITIES' && renderTable(depotTable)}
        {(activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS') && renderTable(typeTable)}
        {activeTab === 'ASSETS' && renderTable(assetTable)}
        
        {activeTab === 'TAXONOMY' && (
           <div className="vmrs-tree-container">
             <Tree
               data={vmrsTreeData}
               openByDefault={false}
               width="100%"
               height={600}
               indent={24}
               rowHeight={36}
               onSelect={(nodes: any[]) => setSelectedTreeNode(nodes[0]?.data || null)}
             >
               {VmrsNode}
             </Tree>
             {vmrsTreeData.length === 0 && !isLoading && (
               <div className="p-8 text-center text-muted">
                 <Activity size={48} className="opacity-20 mb-4 mx-auto" />
                 <p>No VMRS codes found. Please seed the database.</p>
               </div>
             )}
           </div>
        )}
      </div>

      {/* VMRS ADD MODAL */}
      {isAddVmrsModalOpen && (
        <div className="drawer-overlay open" onClick={() => setAddVmrsModalOpen(false)}>
          <div className="drawer-panel open" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <div className="drawer-header">
              <h3>Add {newVmrsType}</h3>
              <button className="drawer-close" onClick={() => setAddVmrsModalOpen(false)}><X size={24} /></button>
            </div>
            <div className="drawer-content" style={{ padding: '24px' }}>
              <form onSubmit={handleSaveVmrs}>
                <div className="form-group">
                  <label>VMRS Code (3 digits)</label>
                  <input 
                    type="text" 
                    maxLength={3} 
                    value={newVmrsData.code} 
                    onChange={e => setNewVmrsData({...newVmrsData, code: e.target.value})} 
                    required 
                    placeholder="e.g. 013"
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input 
                    type="text" 
                    value={newVmrsData.description} 
                    onChange={e => setNewVmrsData({...newVmrsData, description: e.target.value})} 
                    required 
                    placeholder="e.g. Brakes"
                    style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
                  />
                </div>
                {newVmrsType !== 'SYSTEM' && selectedTreeNode && (
                  <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '4px', marginBottom: '16px', fontSize: '0.85rem', color: '#64748b', border: '1px solid var(--border)' }}>
                    <strong>Parent:</strong> {selectedTreeNode.description}
                  </div>
                )}
                <button type="submit" className="primary-btn" style={{ width: '100%' }}>Create {newVmrsType.toLowerCase()}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className={`drawer-overlay ${selectedRow ? 'open' : ''}`} onClick={handleCloseDrawer} />
      <div className={`drawer-panel ${selectedRow ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>
            {isNew 
              ? `Create New ${activeTab === 'FACILITIES' ? 'Depot' : activeTab === 'ASSETS' ? 'Physical Asset' : activeTab === 'VEHICLE_MODELS' ? 'Vehicle Blueprint' : 'Equipment Model'}` 
              : `Edit ${activeTab === 'FACILITIES' ? 'Depot' : activeTab === 'ASSETS' ? 'Physical Asset' : activeTab === 'VEHICLE_MODELS' ? 'Vehicle Blueprint' : 'Equipment Model'}: ${selectedRow?.name || selectedRow?.model_number || selectedRow?.serial_number || selectedRow?.id}`}
          </h3>
          <button className="drawer-close" onClick={handleCloseDrawer}><X size={24} /></button>
        </div>
        
        <div className="drawer-content">
          <div className="drawer-tabs">
            <button className={`drawer-tab ${drawerTab === 'GENERAL' ? 'active' : ''}`} onClick={() => setDrawerTab('GENERAL')}>General Info</button>
            
            {activeTab === 'FACILITIES' && !isNew && (
              <>
                <button className={`drawer-tab ${drawerTab === 'POINTS' ? 'active' : ''}`} onClick={() => setDrawerTab('POINTS')}>Depot Points (Facilities)</button>
              </>
            )}

            {(activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS') && !isNew && (
              <>
                <button className={`drawer-tab ${drawerTab === 'BOM' ? 'active' : ''}`} onClick={() => setDrawerTab('BOM')}>Blueprint BOM</button>
                <button className={`drawer-tab ${drawerTab === 'SERVICE' ? 'active' : ''}`} onClick={() => setDrawerTab('SERVICE')}>Service Templates</button>
              </>
            )}
          </div>

          {drawerTab === 'GENERAL' && (activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS') && (
            <div className="tab-pane">
              <div className="form-group">
                <label>Manufacturer</label>
                <input 
                  type="text" 
                  value={formData.manufacturer || ''} 
                  onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                  placeholder={activeTab === 'VEHICLE_MODELS' ? "e.g. Volvo" : "e.g. Bosch"} 
                />
              </div>
              <div className="form-group">
                <label>Model Number {activeTab === 'VEHICLE_MODELS' ? '(Litera)' : ''}</label>
                <input 
                  type="text" 
                  value={formData.model_number || ''} 
                  onChange={e => setFormData({...formData, model_number: e.target.value})}
                  placeholder={activeTab === 'VEHICLE_MODELS' ? "e.g. 7900-Electric" : "e.g. ProWrench 2000"} 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {activeTab === 'VEHICLE_MODELS' && (
                  <div className="form-group">
                    <label>Model Year</label>
                    <input 
                      type="number" 
                      value={formData.attributes?.model_year || ''} 
                      onChange={e => handleAttributeChange('model_year', Number(e.target.value))}
                      placeholder="e.g. 2024" 
                    />
                  </div>
                )}
                {activeTab === 'EQUIPMENT_MODELS' && (
                   <div className="form-group">
                   <label>Asset Class</label>
                   <select 
                     value={formData.asset_class || 'FACILITY_EQUIPMENT'} 
                     onChange={e => setFormData({...formData, asset_class: e.target.value})}
                   >
                     <option value="FACILITY_EQUIPMENT">Facility Equipment (e.g. Lifts)</option>
                     <option value="TRACKABLE_TOOL">Trackable Tool (e.g. Torque Wrench)</option>
                   </select>
                 </div>
                )}
              </div>
              <div className="form-group">
                <label>Description</label>
                <input 
                  type="text" 
                  value={formData.attributes?.description || ''} 
                  onChange={e => handleAttributeChange('description', e.target.value)}
                  placeholder="Additional details..." 
                />
              </div>
              
              <button className="primary-btn" onClick={handleSave}>{isNew ? 'Create Asset Model' : 'Save Changes'}</button>
            </div>
          )}

          {drawerTab === 'GENERAL' && activeTab === 'ASSETS' && (
            <div className="tab-pane">
              <div className="form-group">
                <label>Blueprint Model</label>
                <select 
                  value={formData.asset_model_id || ''} 
                  onChange={e => setFormData({...formData, asset_model_id: e.target.value})}
                  disabled={!isNew}
                  style={{ background: !isNew ? '#f1f5f9' : 'white' }} 
                >
                  <option value="" disabled>Select Blueprint...</option>
                  {vehicleTypes.map(m => (
                    <option key={m.id} value={m.id}>{m.asset_class === 'VEHICLE' ? '🚌' : '🧰'} {m.model_number} - {m.manufacturer}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Asset ID / Serial Number</label>
                <input 
                  type="text" 
                  value={formData.serial_number || ''} 
                  onChange={e => setFormData({...formData, serial_number: e.target.value})}
                  placeholder="e.g. REG-123 or SN-999" 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Home Depot</label>
                  <select 
                    value={formData.home_depot_id || ''} 
                    onChange={e => setFormData({...formData, home_depot_id: e.target.value})}
                  >
                    <option value="" disabled>Select Depot...</option>
                    {depots.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select 
                    value={formData.status || 'AVAILABLE'} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="IN_MAINTENANCE">In Maintenance</option>
                    <option value="IN_TRANSIT">In Transit</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
              </div>
              
              <button className="primary-btn" onClick={handleSave}>{isNew ? 'Register Asset' : 'Save Changes'}</button>
            </div>
          )}

          {drawerTab === 'GENERAL' && activeTab === 'FACILITIES' && (
            <div className="tab-pane">
              <div className="form-group">
                <label>System ID</label>
                <input 
                  type="text" 
                  value={formData.id || ''} 
                  onChange={e => setFormData({...formData, id: e.target.value})}
                  readOnly={!isNew} 
                  style={{ background: !isNew ? '#f1f5f9' : 'white' }} 
                  placeholder="e.g. DEPOT-NEW"
                />
              </div>
              <div className="form-group">
                <label>Depot Name</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Uppsala Central" 
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input 
                    type="email" 
                    value={formData.contact_email || ''} 
                    onChange={e => setFormData({...formData, contact_email: e.target.value})}
                    placeholder="e.g. verkstad@kalles.se" 
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input 
                    type="text" 
                    value={formData.contact_phone || ''} 
                    onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                    placeholder="e.g. 0176-12345" 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Total Vehicle Capacity</label>
                <input 
                  type="number" 
                  value={formData.capacity || ''} 
                  onChange={e => setFormData({...formData, capacity: Number(e.target.value)})}
                  placeholder="e.g. 50" 
                />
              </div>
              
              {/* Simple inline address management for the prototype */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                 <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                   Addresses
                 </h4>
                 
                 {(!formData.addresses || formData.addresses.length === 0) && (
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No structured addresses defined.</p>
                 )}

                 {(formData.addresses || []).map((addr: any, index: number) => (
                    <div key={index} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: index < formData.addresses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <select 
                          value={addr.address_type || 'VISITING'} 
                          onChange={e => {
                            const newAddrs = [...formData.addresses];
                            newAddrs[index].address_type = e.target.value;
                            setFormData({...formData, addresses: newAddrs});
                          }}
                          style={{ padding: '4px', fontSize: '0.85rem', fontWeight: 600, width: '120px' }}
                        >
                          <option value="VISITING">Visiting</option>
                          <option value="DELIVERY">Delivery</option>
                          <option value="BILLING">Billing</option>
                        </select>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            const newAddrs = [...formData.addresses];
                            newAddrs.splice(index, 1);
                            setFormData({...formData, addresses: newAddrs});
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                        ><X size={14}/></button>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input type="text" placeholder="Street 1" value={addr.street_1 || ''} onChange={e => { const newAddrs = [...formData.addresses]; newAddrs[index].street_1 = e.target.value; setFormData({...formData, addresses: newAddrs}); }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                          <input type="text" placeholder="Postal Code" value={addr.postal_code || ''} onChange={e => { const newAddrs = [...formData.addresses]; newAddrs[index].postal_code = e.target.value; setFormData({...formData, addresses: newAddrs}); }} />
                          <input type="text" placeholder="City" value={addr.city || ''} onChange={e => { const newAddrs = [...formData.addresses]; newAddrs[index].city = e.target.value; setFormData({...formData, addresses: newAddrs}); }} />
                        </div>
                        <input type="text" placeholder="Delivery Instructions (e.g. Gate code)" value={addr.delivery_instructions || ''} onChange={e => { const newAddrs = [...formData.addresses]; newAddrs[index].delivery_instructions = e.target.value; setFormData({...formData, addresses: newAddrs}); }} />
                      </div>
                    </div>
                 ))}

                 <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setFormData({
                        ...formData, 
                        addresses: [...(formData.addresses || []), { address_type: 'DELIVERY', street_1: '', postal_code: '', city: '' }]
                      });
                    }}
                    style={{ background: 'none', border: '1px dashed var(--primary)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
                 >
                   + Add Address
                 </button>
              </div>

              <button className="primary-btn" onClick={handleSave}>{isNew ? 'Create Depot' : 'Save Changes'}</button>
            </div>
          )}

          {drawerTab === 'POINTS' && activeTab === 'FACILITIES' && (
            <div className="tab-pane">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Manage physical locations within this depot (chargers, washing bays, etc).
              </p>
              
              {depotPoints.map(point => (
                <div key={point.id} className="mock-list-item" style={{ borderLeft: `4px solid ${point.facility_type === 'ELECTRIC_CHARGING' ? 'var(--success)' : 'var(--border)'}`, flexDirection: 'column'}}>
                  
                  {editingPointId === point.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{fontSize:'0.8rem', color: 'var(--text-muted)'}}>ID: {point.id}</div>
                      <input 
                        type="text" 
                        value={editPointData.name || ''} 
                        onChange={e => setEditPointData({...editPointData, name: e.target.value})}
                        style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px' }}
                      />
                      <select 
                        value={editPointData.facility_type || ''} 
                        onChange={e => setEditPointData({...editPointData, facility_type: e.target.value})}
                        style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px' }}
                      >
                        <option value="PARKING">Parking</option>
                        <option value="ELECTRIC_CHARGING">Electric Charging</option>
                        <option value="WASHING">Washing</option>
                        <option value="MAINTENANCE">Maintenance Bay</option>
                      </select>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                         <button className="primary-btn" style={{ padding: '4px 12px', marginTop: 0 }} onClick={handleUpdatePoint}>Save</button>
                         <button 
                           className="primary-btn" 
                           style={{ padding: '4px 12px', marginTop: 0, background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                           onClick={() => setEditingPointId(null)}
                         >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <strong>{point.name}</strong><br/>
                        <span style={{fontSize:'0.8rem', color: 'var(--text-muted)'}}>ID: {point.id}</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <span className={`status-badge ${point.facility_type === 'ELECTRIC_CHARGING' ? 'green' : 'gray'}`}>
                          {point.facility_type}
                        </span>
                        <button 
                          onClick={() => {
                            setEditingPointId(point.id);
                            setEditPointData({ name: point.name, facility_type: point.facility_type });
                          }} 
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                          title="Edit Point"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePoint(point.id)} 
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                          title="Delete Point"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {!isCreatingPoint ? (
                <button 
                  className="primary-btn" 
                  style={{ background: '#f1f5f9', color: '#1e293b' }}
                  onClick={() => setIsCreatingPoint(true)}
                >
                  + Add Depot Point
                </button>
              ) : (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginTop: '16px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>New Depot Point</h4>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>Point ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g. GP-NTA-01" 
                      value={newPointData.id || ''}
                      onChange={e => setNewPointData({...newPointData, id: e.target.value})}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CCS Charger Bay 1" 
                      value={newPointData.name || ''}
                      onChange={e => setNewPointData({...newPointData, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Facility Type</label>
                    <select 
                      value={newPointData.facility_type}
                      onChange={e => setNewPointData({...newPointData, facility_type: e.target.value})}
                    >
                      <option value="PARKING">Parking</option>
                      <option value="ELECTRIC_CHARGING">Electric Charging</option>
                      <option value="WASHING">Washing</option>
                      <option value="MAINTENANCE">Maintenance Bay</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="primary-btn" onClick={handleSavePoint}>Save Point</button>
                    <button 
                      className="primary-btn" 
                      style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        setIsCreatingPoint(false);
                        setNewPointData({ facility_type: 'PARKING' });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {drawerTab === 'BOM' && (activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS') && (
            <div className="tab-pane">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Define the mandatory equipment types and parts for this asset class.
              </p>

              {bomTemplates.map(bom => (
                <div key={bom.id} className="mock-list-item" style={{ borderLeft: '4px solid var(--primary)', flexDirection: 'column' }}>
                  
                  {editingBomId === bom.id ? (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                      <div style={{fontSize:'0.8rem', color: 'var(--text-muted)'}}>{bom.part_number} - {bom.part_description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Required Quantity:</label>
                        <input 
                          type="number" 
                          min="1"
                          step="0.1"
                          value={editBomData.quantity || 1} 
                          onChange={e => setEditBomData({...editBomData, quantity: Number(e.target.value)})}
                          style={{ padding: '6px', border: '1px solid var(--border)', borderRadius: '4px', width: '80px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                         <button className="primary-btn" style={{ padding: '4px 12px', marginTop: 0 }} onClick={handleUpdateBom}>Save</button>
                         <button 
                           className="primary-btn" 
                           style={{ padding: '4px 12px', marginTop: 0, background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                           onClick={() => setEditingBomId(null)}
                         >Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <strong>{bom.part_number} - {bom.part_description}</strong><br/>
                        <span style={{fontSize:'0.8rem', color: 'var(--text-muted)'}}>VMRS: {bom.vmrs_code} - {bom.vmrs_description} | Pos: {bom.position || 'N/A'}</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <span style={{ fontWeight: 600 }}>QTY: {bom.quantity}</span>
                        <button 
                            onClick={() => {
                              setEditingBomId(bom.id);
                              setEditBomData({ quantity: bom.quantity });
                            }} 
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                            title="Edit Quantity"
                          >
                            <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBom(bom.id)} 
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                          title="Delete Requirement"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {!isCreatingBom ? (
                <button 
                  className="primary-btn" 
                  style={{ background: '#f1f5f9', color: '#1e293b' }}
                  onClick={() => setIsCreatingBom(true)}
                >
                  + Add Requirement
                </button>
              ) : (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginTop: '16px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>New BOM Requirement</h4>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>Specific Part (SKU)</label>
                    <select 
                      value={newBomData.part_id || ''}
                      onChange={e => setNewBomData({...newBomData, part_id: e.target.value})}
                    >
                      <option value="" disabled>Select Part...</option>
                      {parts.map(p => (
                        <option key={p.id} value={p.id}>{p.part_number} - {p.description}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>VMRS Classification</label>
                    <select 
                      value={newBomData.vmrs_component_id || ''}
                      onChange={e => setNewBomData({...newBomData, vmrs_component_id: e.target.value})}
                    >
                      <option value="">No specific VMRS mapping</option>
                      {vmrsComponents.map(vc => (
                        <option key={vc.id} value={vc.id}>{vc.code} - {vc.description}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>Position Description (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. FRONT_LEFT" 
                      value={newBomData.position || ''}
                      onChange={e => setNewBomData({...newBomData, position: e.target.value})}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Required Quantity</label>
                    <input 
                      type="number" 
                      min="1"
                      step="0.1"
                      value={newBomData.quantity || 1}
                      onChange={e => setNewBomData({...newBomData, quantity: Number(e.target.value)})}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="primary-btn" onClick={handleSaveBom}>Save Requirement</button>
                    <button 
                      className="primary-btn" 
                      style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        setIsCreatingBom(false);
                        setNewBomData({ quantity: 1 });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {drawerTab === 'SERVICE' && (activeTab === 'VEHICLE_MODELS' || activeTab === 'EQUIPMENT_MODELS') && (
             <div className="tab-pane">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Define the mandatory maintenance rules for this asset class.
              </p>

              {serviceTemplates.map(st => (
                <div key={st.id} className="mock-list-item" style={{ borderLeft: '4px solid var(--primary)', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '8px' }}>
                    <strong>{st.title}</strong>
                    <button 
                      onClick={() => handleDeleteService(st.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 0 }}
                      title="Delete Template"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  {st.triggers && st.triggers.map((trigger: any) => (
                    <div key={trigger.id} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      Trigger: {trigger.trigger_type} ({trigger.interval_value} {trigger.interval_uom_code} 
                      {Number(trigger.tolerance_value) > 0 ? ` ±${trigger.tolerance_value} ${trigger.interval_uom_code}` : ''})
                      {trigger.meter_name ? ` on ${trigger.meter_name}` : ''}
                    </div>
                  ))}
                </div>
              ))}

              {!isCreatingService ? (
                <button 
                  className="primary-btn" 
                  style={{ background: '#f1f5f9', color: '#1e293b' }}
                  onClick={() => setIsCreatingService(true)}
                >
                  + Add Service Template
                </button>
              ) : (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginTop: '16px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem' }}>New Service Template</h4>
                  
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label>Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Annual Inspection" 
                      value={newServiceData.title || ''}
                      onChange={e => setNewServiceData({...newServiceData, title: e.target.value})}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label>Trigger Type</label>
                      <select 
                        value={newServiceData.trigger_type}
                        onChange={e => setNewServiceData({...newServiceData, trigger_type: e.target.value})}
                      >
                        <option value="CALENDAR">Calendar (Time)</option>
                        <option value="USAGE_METER">Usage Meter (Distance/Hours)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Interval UoM</label>
                      <select 
                        value={newServiceData.interval_uom_code}
                        onChange={e => setNewServiceData({...newServiceData, interval_uom_code: e.target.value})}
                      >
                        {newServiceData.trigger_type === 'CALENDAR' ? (
                          <>
                            <option value="DAYS">Days</option>
                            <option value="MONTHS">Months</option>
                            <option value="YEARS">Years</option>
                          </>
                        ) : (
                          <>
                            <option value="KM">Kilometers</option>
                            <option value="MI">Miles</option>
                            <option value="HOURS">Hours</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div className="form-group">
                      <label>Interval Value</label>
                      <input 
                        type="number" 
                        min="1"
                        value={newServiceData.interval_value || 1}
                        onChange={e => setNewServiceData({...newServiceData, interval_value: Number(e.target.value)})}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Tolerance Span (Optional ±)</label>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="e.g. 2"
                        value={newServiceData.tolerance_value || ''}
                        onChange={e => setNewServiceData({...newServiceData, tolerance_value: Number(e.target.value)})}
                      />
                    </div>
                    
                    {newServiceData.trigger_type === 'USAGE_METER' && (
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Meter Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. ODOMETER"
                          value={newServiceData.meter_name || ''}
                          onChange={e => setNewServiceData({...newServiceData, meter_name: e.target.value})}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="primary-btn" onClick={handleSaveService}>Save Template</button>
                    <button 
                      className="primary-btn" 
                      style={{ background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        setIsCreatingService(false);
                        setNewServiceData({ trigger_type: 'CALENDAR', interval_uom_code: 'MONTHS', interval_value: 12 });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
