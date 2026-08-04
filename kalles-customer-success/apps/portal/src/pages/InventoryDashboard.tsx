import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  MoreVertical,
  Warehouse,
  X,
  RefreshCw,
  Truck,
  Users
} from 'lucide-react';
import './InventoryDashboard.css';

interface StockItem {
  sku: string;
  part_number: string;
  name: string;
  category: string;
  on_hand: number;
  reserved: number;
  reorder_point: number;
  location_id: string;
  location_name: string;
  unit_price: number;
}

interface Part {
  sku: string;
  part_number: string;
  name: string;
}

interface Location {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
}

export const InventoryDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [stock, setStock] = useState<StockItem[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [isReceiveModalOpen, setReceiveModalOpen] = useState(false);
  const [isConsumeModalOpen, setConsumeModalOpen] = useState(false);
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [isAddPartModalOpen, setAddPartModalOpen] = useState(false);
  const [isAddVendorModalOpen, setAddVendorModalOpen] = useState(false);
  const [isEditPartModalOpen, setEditPartModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [transactionPending, setTransactionPending] = useState(false);

  // Form States
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [formSku, setFormSku] = useState('');
  const [formFromLocation, setFormFromLocation] = useState('');
  const [formToLocation, setFormToLocation] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formQty, setFormQty] = useState(1);
  const [formUnitPrice, setFormUnitPrice] = useState(0);
  const [formRef, setFormRef] = useState('');
  
  // Add Part Form States
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartDesc, setNewPartDesc] = useState('');
  const [newPartUom, setNewPartUom] = useState('EACH');

  // Add Vendor Form States
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorOrg, setNewVendorOrg] = useState('');

  const fetchStock = async () => {
    try {
      const response = await fetch(API_URL + '/inventory/stock');
      if (!response.ok) throw new Error('Failed to fetch stock');
      const data = await response.json();
      setStock(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStock(),
        fetch(API_URL + '/inventory/parts').then(r => r.json()).then(setParts),
        fetch(API_URL + '/inventory/locations').then(r => r.json()).then(setLocations),
        fetch(API_URL + '/vendors').then(r => r.json()).then(setVendors)
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransactionPending(true);
    try {
      const response = await fetch(API_URL + '/inventory/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: formSku,
          locationId: formFromLocation,
          vendorId: formVendor,
          quantity: formQty,
          unitPrice: formUnitPrice,
          referenceId: formRef
        })
      });
      if (!response.ok) throw new Error('Failed to receive shipment');
      await fetchStock();
      setReceiveModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransactionPending(false);
    }
  };

  const handleConsume = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransactionPending(true);
    try {
      const response = await fetch(API_URL + '/inventory/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: formSku,
          locationId: formFromLocation,
          quantity: formQty,
          workOrderId: formRef
        })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to consume part');
      }
      await fetchStock();
      setConsumeModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransactionPending(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransactionPending(true);
    try {
      const response = await fetch(API_URL + '/inventory/transfer/ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: formSku,
          fromLocationId: formFromLocation,
          toLocationId: formToLocation,
          quantity: formQty
        })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to ship transfer');
      }
      await fetchStock();
      setTransferModalOpen(false);
      resetForm();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransactionPending(false);
    }
  };

  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransactionPending(true);
    try {
      const response = await fetch(API_URL + '/inventory/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partNumber: newPartNumber,
          description: newPartDesc,
          uomCode: newPartUom
        })
      });
      if (!response.ok) throw new Error('Failed to create part');
      await fetchData(); // Refresh everything
      setAddPartModalOpen(false);
      setNewPartNumber('');
      setNewPartDesc('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransactionPending(false);
    }
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem) return;
    setTransactionPending(true);
    try {
      const response = await fetch(`${API_URL}/inventory/parts/${selectedStockItem.sku}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partNumber: newPartNumber,
          description: newPartDesc,
          uomCode: newPartUom
        })
      });
      if (!response.ok) throw new Error('Failed to update part');
      await fetchData();
      setEditPartModalOpen(false);
      setSelectedStockItem(null);
      setNewPartNumber('');
      setNewPartDesc('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransactionPending(false);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransactionPending(true);
    try {
      const response = await fetch(API_URL + '/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newVendorName,
          organizationNumber: newVendorOrg
        })
      });
      if (!response.ok) throw new Error('Failed to create vendor');
      await fetchData();
      setAddVendorModalOpen(false);
      setNewVendorName('');
      setNewVendorOrg('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransactionPending(false);
    }
  };

  const resetForm = () => {
    setFormSku('');
    setFormFromLocation('');
    setFormToLocation('');
    setFormVendor('');
    setFormQty(1);
    setFormUnitPrice(0);
    setFormRef('');
  };

  const filteredStock = stock.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.part_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = stock.reduce((sum, item) => sum + (parseFloat(item.on_hand as any) * item.unit_price), 0);
  const lowStockCount = stock.filter(item => parseFloat(item.on_hand as any) <= item.reorder_point).length;

  if (loading) return <div className="p-8">Loading inventory from EAM Core...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <div className="inventory-dashboard">
      <div className="inventory-header">
        <div className="header-title">
          <h1>Inventory & Parts</h1>
          <p>EAM Core System • Multi-depot Management</p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-label">Total Value</span>
            <span className="stat-value">{totalValue.toLocaleString()} SEK</span>
          </div>
          <div className={`stat-card ${lowStockCount > 0 ? 'warning' : ''}`}>
            <span className="stat-label">Low Stock Alerts</span>
            <span className="stat-value">{lowStockCount} Items</span>
          </div>
        </div>
      </div>

      <div className="inventory-controls">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search SKU, Part # or description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="action-btns">
          <button className="secondary-btn" onClick={() => fetchData()}><RefreshCw size={18} /> Refresh</button>
          <button className="secondary-btn" onClick={() => setAddVendorModalOpen(true)}><Users size={18} /> Add Vendor</button>
          <button className="primary-btn" onClick={() => setAddPartModalOpen(true)}><Plus size={18} /> Add Part</button>
        </div>
      </div>

      <div className="stock-grid">
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Part / SKU</th>
                <th>Part Number</th>
                <th>Location</th>
                <th>Status</th>
                <th>On Hand</th>
                <th>Reserved</th>
                <th>Price</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.map(item => {
                const onHand = parseFloat(item.on_hand as any);
                const isLow = onHand <= item.reorder_point;
                const isCritical = onHand === 0;

                return (
                  <tr key={`${item.sku}-${item.location_id}`}>
                    <td>
                      <div className="part-info">
                        <span className="part-name">{item.name}</span>
                        <span className="part-sku">{item.sku.substring(0, 8)}...</span>
                      </div>
                    </td>
                    <td><span className="part-number-tag">{item.part_number}</span></td>
                    <td>
                      <div className="location-info">
                        <Warehouse size={14} />
                        {item.location_name}
                      </div>
                    </td>
                    <td>
                      {isCritical ? (
                        <span className="status-badge critical">Out of Stock</span>
                      ) : isLow ? (
                        <span className="status-badge warning">Low Stock</span>
                      ) : (
                        <span className="status-badge success">Healthy</span>
                      )}
                    </td>
                    <td className={isLow ? 'text-warning' : ''}>{Math.floor(onHand)}</td>
                    <td>{item.reserved}</td>
                    <td>{item.unit_price.toLocaleString()} SEK</td>
                    <td className="row-actions-cell">
                      <button 
                        className="icon-btn-small" 
                        title="Actions"
                        onClick={() => setActiveMenuId(activeMenuId === `${item.sku}-${item.location_id}` ? null : `${item.sku}-${item.location_id}`)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {activeMenuId === `${item.sku}-${item.location_id}` && (
                        <div className="row-action-menu">
                          <button onClick={() => {
                            setSelectedStockItem(item);
                            setNewPartNumber(item.part_number);
                            setNewPartDesc(item.name);
                            setEditPartModalOpen(true);
                            setActiveMenuId(null);
                          }}>
                            Edit Details
                          </button>
                          <button onClick={() => {
                            setFormSku(item.sku);
                            setFormFromLocation(item.location_id);
                            setReceiveModalOpen(true);
                            setActiveMenuId(null);
                          }}>
                            Quick Inbound
                          </button>
                          <button className="text-red-600" onClick={() => {
                            alert("Delete part - Coming soon (EAM Restriction)");
                            setActiveMenuId(null);
                          }}>
                            Deactivate
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="inventory-sidebar">
          <div className="sidebar-section">
            <h3>Quick Actions</h3>
            <button className="action-row" onClick={() => setReceiveModalOpen(true)}>
              <div className="action-icon in"><ArrowDownLeft size={18} /></div>
              <div className="action-text">
                <span>Receive Shipment</span>
                <small>Log incoming parts</small>
              </div>
            </button>
            <button className="action-row" onClick={() => setConsumeModalOpen(true)}>
              <div className="action-icon out"><ArrowUpRight size={18} /></div>
              <div className="action-text">
                <span>Issue Part</span>
                <small>Consume for work order</small>
              </div>
            </button>
            <button className="action-row" onClick={() => setTransferModalOpen(true)}>
              <div className="action-icon transfer"><Truck size={18} /></div>
              <div className="action-text">
                <span>Transfer Part</span>
                <small>Move between depots</small>
              </div>
            </button>
          </div>

          <div className="sidebar-section">
            <h3>Recent Transactions</h3>
            <div className="transaction-list">
              <div className="transaction-item">
                <div className="t-icon consume"><Package size={14} /></div>
                <div className="t-info">
                  <span>-2 Brake Pads</span>
                  <small>Work Order #882 • 2h ago</small>
                </div>
              </div>
              <div className="transaction-item">
                <div className="t-icon receive"><Plus size={14} /></div>
                <div className="t-info">
                  <span>+10 Oil Filters</span>
                  <small>PO #441 • Yesterday</small>
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-section agentic">
            <h3><RefreshCw size={16} className="spin-slow" /> Agentic Insights</h3>
            <p className="agent-tip">Inventory Agent is monitoring stock levels and market prices.</p>
            <button 
              className="action-row agent-btn" 
              onClick={async () => {
                if (stock.length > 0) {
                  const item = stock[0]; // Just target the first item for demo
                  const res = await fetch(API_URL + '/agent/inventory/optimize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ partId: item.sku, locationId: item.location_id })
                  });
                  const data = await res.json();
                  alert(`Agent Recommendation for ${item.name}:\n\nStrategy: ${data.strategy}\nRationale: ${data.rationale}`);
                }
              }}
            >
              <div className="action-icon agent"><RefreshCw size={18} /></div>
              <div className="action-text">
                <span>Optimize Stock</span>
                <small>Trigger cross-domain negotiation</small>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ADD VENDOR MODAL */}
      {isAddVendorModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Add New Vendor (Finance Master)</h2>
              <button onClick={() => setAddVendorModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddVendor}>
              <div className="form-group">
                <label>Vendor Name</label>
                <input type="text" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="e.g. Scania Parts AB" required />
              </div>
              <div className="form-group">
                <label>Organization Number</label>
                <input type="text" value={newVendorOrg} onChange={e => setNewVendorOrg(e.target.value)} placeholder="e.g. 556677-8899" />
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setAddVendorModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={transactionPending}>
                  {transactionPending ? 'Creating...' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PART MODAL */}
      {isAddPartModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Add New Part Definition</h2>
              <button onClick={() => setAddPartModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleAddPart}>
              <div className="form-group">
                <label>Part Number</label>
                <input type="text" value={newPartNumber} onChange={e => setNewPartNumber(e.target.value)} placeholder="e.g. BRK-500-X" required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" value={newPartDesc} onChange={e => setNewPartDesc(e.target.value)} placeholder="e.g. Heavy Duty Brake Pads" required />
              </div>
              <div className="form-group">
                <label>Unit of Measure</label>
                <select value={newPartUom} onChange={e => setNewPartUom(e.target.value)}>
                  <option value="EACH">Each (st)</option>
                  <option value="LITER">Liters (L)</option>
                  <option value="METERS">Meters (m)</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setAddPartModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={transactionPending}>
                  {transactionPending ? 'Creating...' : 'Create Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PART MODAL */}
      {isEditPartModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Edit Part: {selectedStockItem?.name}</h2>
              <button onClick={() => setEditPartModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdatePart}>
              <div className="form-group">
                <label>Part Number</label>
                <input type="text" value={newPartNumber} onChange={e => setNewPartNumber(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" value={newPartDesc} onChange={e => setNewPartDesc(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Unit of Measure</label>
                <select value={newPartUom} onChange={e => setNewPartUom(e.target.value)}>
                  <option value="EACH">Each (st)</option>
                  <option value="LITER">Liters (L)</option>
                  <option value="METERS">Meters (m)</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setEditPartModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={transactionPending}>
                  {transactionPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE MODAL */}
      {isReceiveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Receive Shipment</h2>
              <button onClick={() => setReceiveModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleReceive}>
              <div className="form-group">
                <label>Vendor</label>
                <select value={formVendor} onChange={e => setFormVendor(e.target.value)} required>
                  <option value="">Select a vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Part</label>
                <select value={formSku} onChange={e => setFormSku(e.target.value)} required>
                  <option value="">Select a part...</option>
                  {parts.map(p => <option key={p.sku} value={p.sku}>{p.name} ({p.part_number})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Location</label>
                <select value={formFromLocation} onChange={e => setFormFromLocation(e.target.value)} required>
                  <option value="">Select a location...</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" min="1" value={formQty} onChange={e => setFormQty(parseInt(e.target.value))} required />
              </div>
              <div className="form-group">
                <label>Unit Price (SEK)</label>
                <input type="number" min="0" step="0.01" value={formUnitPrice} onChange={e => setFormUnitPrice(parseFloat(e.target.value))} placeholder="From invoice..." />
              </div>
              <div className="form-group">
                <label>Reference (PO # / Packing Slip)</label>
                <input type="text" value={formRef} onChange={e => setFormRef(e.target.value)} placeholder="e.g. PO-12345" />
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setReceiveModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={transactionPending}>
                  {transactionPending ? 'Processing...' : 'Receive Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONSUME MODAL */}
      {isConsumeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Issue Part (Consumption)</h2>
              <button onClick={() => setConsumeModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleConsume}>
              <div className="form-group">
                <label>Part & Source Location</label>
                <select value={formSku} onChange={e => {
                  const [sku, locId] = e.target.value.split('|');
                  setFormSku(sku);
                  setFormFromLocation(locId);
                }} required>
                  <option value="">Select available stock...</option>
                  {stock.filter(s => parseFloat(s.on_hand as any) > 0).map(s => (
                    <option key={`${s.sku}-${s.location_id}`} value={`${s.sku}|${s.location_id}`}>
                      {s.name} ({s.location_name} - {Math.floor(parseFloat(s.on_hand as any))} available)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" min="1" value={formQty} onChange={e => setFormQty(parseInt(e.target.value))} required />
              </div>
              <div className="form-group">
                <label>Work Order ID (UUID)</label>
                <input type="text" value={formRef} onChange={e => setFormRef(e.target.value)} placeholder="00000000-0000..." required />
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setConsumeModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={transactionPending}>
                  {transactionPending ? 'Processing...' : 'Issue Part'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {isTransferModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Internal Transfer</h2>
              <button onClick={() => setTransferModalOpen(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="form-group">
                <label>Part & Source Location</label>
                <select value={formSku} onChange={e => {
                  const [sku, locId] = e.target.value.split('|');
                  setFormSku(sku);
                  setFormFromLocation(locId);
                }} required>
                  <option value="">Select source stock...</option>
                  {stock.filter(s => parseFloat(s.on_hand as any) > 0).map(s => (
                    <option key={`${s.sku}-${s.location_id}`} value={`${s.sku}|${s.location_id}`}>
                      {s.name} ({s.location_name} - {Math.floor(parseFloat(s.on_hand as any))} available)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Destination Location</label>
                <select value={formToLocation} onChange={e => setFormToLocation(e.target.value)} required>
                  <option value="">Select destination...</option>
                  {locations.filter(l => l.id !== formFromLocation).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Quantity</label>
                <input type="number" min="1" value={formQty} onChange={e => setFormQty(parseInt(e.target.value))} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setTransferModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={transactionPending}>
                  {transactionPending ? 'Processing...' : 'Ship Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
