import { API_URL } from '../config';
export const registryApi = {
  getDepots: () => fetch(API_URL + '/registry/depots').then(r => r.json()),
  createDepot: (data: any) => fetch(API_URL + '/registry/depots', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  updateDepot: (id: string, data: any) => fetch(`${API_URL}/registry/depots/${id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  
  getDepotPoints: (depotId: string) => fetch(`${API_URL}/registry/depots/${depotId}/points`).then(r => r.json()),
  createDepotPoint: (depotId: string, data: any) => fetch(`${API_URL}/registry/depots/${depotId}/points`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  updateDepotPoint: (depotId: string, pointId: string, data: any) => fetch(`${API_URL}/registry/depots/${depotId}/points/${pointId}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  deleteDepotPoint: (depotId: string, pointId: string) => fetch(`${API_URL}/registry/depots/${depotId}/points/${pointId}`, { method: 'DELETE' }),

  getAssetModels: () => fetch(API_URL + '/registry/asset-models').then(r => r.json()),
  createAssetModel: (data: any) => fetch(API_URL + '/registry/asset-models', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  updateAssetModel: (id: string, data: any) => fetch(`${API_URL}/registry/asset-models/${id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  
  getAssets: (rootOnly = false) => fetch(`${API_URL}/registry/assets${rootOnly ? '?rootOnly=true' : ''}`).then(r => r.json()),
  createAsset: (data: any) => fetch(API_URL + '/registry/assets', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  updateAsset: (id: string, data: any) => fetch(`${API_URL}/registry/assets/${id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),

  getBomTemplates: (modelId: string) => fetch(`${API_URL}/registry/asset-models/${modelId}/bom`).then(r => r.json()),
  createBomTemplate: (modelId: string, data: any) => fetch(`${API_URL}/registry/asset-models/${modelId}/bom`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  updateBomTemplate: (modelId: string, bomId: string, data: any) => fetch(`${API_URL}/registry/asset-models/${modelId}/bom/${bomId}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  deleteBomTemplate: (modelId: string, bomId: string) => fetch(`${API_URL}/registry/asset-models/${modelId}/bom/${bomId}`, { method: 'DELETE' }),

  getServiceTemplates: (modelId: string) => fetch(`${API_URL}/registry/asset-models/${modelId}/services`).then(r => r.json()),
  createServiceTemplate: (modelId: string, data: any) => fetch(`${API_URL}/registry/asset-models/${modelId}/services`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }),
  deleteServiceTemplate: (modelId: string, serviceId: string) => fetch(`${API_URL}/registry/asset-models/${modelId}/services/${serviceId}`, { method: 'DELETE' }),

  getParts: () => fetch(API_URL + '/inventory/parts').then(r => r.json()),
  getVmrsSystems: () => fetch(API_URL + '/registry/vmrs/systems').then(r => r.json()),
  getVmrsTree: () => fetch(API_URL + '/registry/vmrs/tree').then(r => r.json()),
  getVmrsAssemblies: (systemId: string) => fetch(`${API_URL}/registry/vmrs/systems/${systemId}/assemblies`).then(r => r.json()),
  getVmrsComponents: (assemblyId: string) => fetch(`${API_URL}/registry/vmrs/assemblies/${assemblyId}/components`).then(r => r.json()),
  getVmrsComponentsStatic: () => fetch(API_URL + '/registry/vmrs/components').then(r => r.json()),

  createVmrsSystem: (data: any) => fetch(API_URL + '/registry/vmrs/systems', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
  createVmrsAssembly: (data: any) => fetch(API_URL + '/registry/vmrs/assemblies', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
  createVmrsComponent: (data: any) => fetch(API_URL + '/registry/vmrs/components', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),
};
