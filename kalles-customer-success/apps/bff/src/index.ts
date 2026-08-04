import express from 'express';
import cors from 'cors';
import { Logger, tracingMiddleware } from '@kalles-buss/shared-utils';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());
app.use(tracingMiddleware);

const port = process.env.PORT || 8080;

const SIMULATOR_API_URL = process.env.SIMULATOR_API_URL || 'https://kalles-simulation-engine-w7fsmra4yq-ew.a.run.app';

// --- TACTICAL DASHBOARD PROXY ---
app.get('/api/ceo/tactical-map', async (req, res) => {
  Logger.info('[BFF] Fetching Tactical Live Map data');
  try {
    const response = await axios.get('https://kalles-traffic-w7fsmra4yq-ew.a.run.app/api/tactical/live-map', { timeout: 3000 });
    res.json(response.data);
  } catch (error: any) {
    Logger.error(`[BFF] Failed to fetch Tactical Map: ${error.message}`);
    // If running locally, you might want to try localhost:8080 or wherever traffic is bound
    res.status(500).json({ error: error.message });
  }
});

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:8081';
const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL || 'http://localhost:8084';
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://localhost:8082';
const PROCESS_SERVICE_URL = process.env.PROCESS_SERVICE_URL || 'http://localhost:8086';
const TRAFFIC_SERVICE_URL = process.env.TRAFFIC_SERVICE_URL || 'http://localhost:8088';

// --- CEO DASHBOARD PROXY ---
app.get('/api/ceo/dashboard', async (req, res) => {
  Logger.info('[BFF] Aggregating CEO Dashboard metrics');
  try {
    const [financeRes, depotRes, trafficRes] = await Promise.allSettled([
      axios.get(`${FINANCE_SERVICE_URL}/api/ceo/status`, { timeout: 3000 }),
      axios.get(`${INVENTORY_SERVICE_URL}/api/ceo/status`, { timeout: 3000 }),
      axios.get(`${TRAFFIC_SERVICE_URL}/api/ceo/status`, { timeout: 3000 })
    ]);

    const buildStatus = (result: PromiseSettledResult<any>, domainName: string) => {
      if (result.status === 'fulfilled') return result.value.data;
      return { domain: domainName, status: 'RED', metrics: {}, error: 'Service Unreachable' };
    };

    res.json({
      finance: buildStatus(financeRes, 'FINANCE'),
      depot: buildStatus(depotRes, 'DEPOT'),
      traffic: buildStatus(trafficRes, 'TRAFFIC')
    });
  } catch (error: any) {
    Logger.error(`[BFF] Failed to aggregate CEO Dashboard: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/stock', async (req, res) => {
  Logger.info('[BFF] Fetching Inventory Stock from EAM');
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/inventory/stock`, { timeout: 3000 });
    res.json(response.data);
  } catch (error: any) {
    Logger.error(`[BFF] Failed to fetch Inventory Stock: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/parts', async (req, res) => {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/inventory/parts`, { timeout: 3000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/parts', async (req, res) => {
  Logger.info('[BFF] Creating new Inventory Part');
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/inventory/parts`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/inventory/parts/:id', async (req, res) => {
  Logger.info(`[BFF] Updating Inventory Part ${req.params.id}`);
  try {
    const response = await axios.patch(`${INVENTORY_SERVICE_URL}/api/inventory/parts/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/inventory/locations', async (req, res) => {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/inventory/locations`, { timeout: 3000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/depot/staff', async (req, res) => {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/depot/staff`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory/receive', async (req, res) => {
  Logger.info('[BFF] Receiving Inventory Shipment (EAM)');
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/inventory/receive`, req.body);
    res.json(response.data);
  } catch (error: any) {
    Logger.error(`[BFF] Failed to receive shipment: ${error.message}`);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/inventory/consume', async (req, res) => {
  Logger.info('[BFF] Consuming Inventory Part (EAM)');
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/inventory/consume`, req.body);
    res.json(response.data);
  } catch (error: any) {
    Logger.error(`[BFF] Failed to consume part: ${error.message}`);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/inventory/transfer/ship', async (req, res) => {
  Logger.info('[BFF] Shipping Inventory Transfer (EAM)');
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/inventory/transfer/ship`, req.body);
    res.json(response.data);
  } catch (error: any) {
    Logger.error(`[BFF] Failed to ship transfer: ${error.message}`);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/inventory/transfer/receive', async (req, res) => {
  Logger.info('[BFF] Receiving Inventory Transfer (EAM)');
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/inventory/transfer/receive`, req.body);
    res.json(response.data);
  } catch (error: any) {
    Logger.error(`[BFF] Failed to receive transfer: ${error.message}`);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/vmrs/systems', async (req, res) => {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/registry/vmrs/systems`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/registry/vmrs/tree', async (req, res) => {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/registry/vmrs/tree`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/registry/vmrs/systems/:id/assemblies', async (req, res) => {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/registry/vmrs/systems/${req.params.id}/assemblies`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/registry/vmrs/assemblies/:id/components', async (req, res) => {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/registry/vmrs/assemblies/${req.params.id}/components`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/registry/vmrs/components', async (req, res) => {
  try {
    const response = await axios.get(`${INVENTORY_SERVICE_URL}/api/registry/vmrs/components`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/registry/vmrs/systems', async (req, res) => {
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/registry/vmrs/systems`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/registry/vmrs/assemblies', async (req, res) => {
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/registry/vmrs/assemblies`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/registry/vmrs/components', async (req, res) => {
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/registry/vmrs/components`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- VENDOR MANAGEMENT (Finance is Master) ---
app.get('/api/vendors', async (req, res) => {
  try {
    const response = await axios.get(`${FINANCE_SERVICE_URL}/api/vendors`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vendors', async (req, res) => {
  try {
    const response = await axios.post(`${FINANCE_SERVICE_URL}/api/vendors`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- STAFF MANAGEMENT (HR is Master) ---
app.get('/api/staff', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/staff`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/staff', async (req, res) => {
  try {
    const response = await axios.post(`${HR_SERVICE_URL}/api/staff`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/staff/:id/ice', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/staff/${req.params.id}/ice`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/staff/:id/balances', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/staff/${req.params.id}/balances`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/staff/:id/contacts', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/staff/${req.params.id}/contacts`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/staff/:id/lifecycle', async (req, res) => {
  try {
    const response = await axios.get(`${PROCESS_SERVICE_URL}/api/lifecycle/employee/${req.params.id}`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/staff/:id/lifecycle/steps/:stepId/complete', async (req, res) => {
  try {
    const response = await axios.post(`${PROCESS_SERVICE_URL}/api/lifecycle/steps/${req.params.stepId}/complete`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/hr/analytics/forecast', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/hr/analytics/forecast`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hr/analytics/pay-gap', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/hr/analytics/pay-gap`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hr/compliance/expiries', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/hr/compliance/expiries`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hr/jobs', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/hr/jobs`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hr/recruitment/requisitions', async (req, res) => {
  try {
    const response = await axios.get(`${HR_SERVICE_URL}/api/hr/recruitment/requisitions`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agent/inventory/optimize', async (req, res) => {
  Logger.info('[BFF] Triggering Agent Inventory Optimization');
  try {
    const response = await axios.post(`${INVENTORY_SERVICE_URL}/api/agent/inventory/optimize`, req.body);
    res.json(response.data);
  } catch (error: any) {
    Logger.error(`[BFF] Agent optimization failed: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// --- REGISTRY / MASTER DATA PROXY ---
const DEPOT_SERVICE_URL = process.env.DEPOT_SERVICE_URL || 'https://kalles-energy-depot-w7fsmra4yq-ew.a.run.app';

app.get('/api/registry/depots', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/depots`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/registry/depots', async (req, res) => {
  try {
    const response = await axios.post(`${DEPOT_SERVICE_URL}/api/registry/depots`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.patch('/api/registry/depots/:id', async (req, res) => {
  try {
    const response = await axios.patch(`${DEPOT_SERVICE_URL}/api/registry/depots/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/depots/:id/points', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/depots/${req.params.id}/points`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/registry/depots/:id/points', async (req, res) => {
  try {
    const response = await axios.post(`${DEPOT_SERVICE_URL}/api/registry/depots/${req.params.id}/points`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.patch('/api/registry/depots/:id/points/:pointId', async (req, res) => {
  try {
    const response = await axios.patch(`${DEPOT_SERVICE_URL}/api/registry/depots/${req.params.id}/points/${req.params.pointId}`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.delete('/api/registry/depots/:id/points/:pointId', async (req, res) => {
  try {
    const response = await axios.delete(`${DEPOT_SERVICE_URL}/api/registry/depots/${req.params.id}/points/${req.params.pointId}`);
    res.status(204).send();
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/cost-centers', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/cost-centers`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/parts', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/parts`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/vmrs/systems', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/vmrs/systems`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/vmrs/components', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/vmrs/components`, { params: req.query });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/asset-models', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/asset-models`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/registry/asset-models', async (req, res) => {
  try {
    const response = await axios.post(`${DEPOT_SERVICE_URL}/api/registry/asset-models`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.patch('/api/registry/asset-models/:id', async (req, res) => {
  try {
    const response = await axios.patch(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.delete('/api/registry/asset-models/:id', async (req, res) => {
  try {
    const response = await axios.delete(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}`);
    res.status(204).send();
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/asset-models/:id/bom', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}/bom`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/registry/asset-models/:id/bom', async (req, res) => {
  try {
    const response = await axios.post(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}/bom`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.patch('/api/registry/asset-models/:id/bom/:bomId', async (req, res) => {
  try {
    const response = await axios.patch(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}/bom/${req.params.bomId}`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.delete('/api/registry/asset-models/:id/bom/:bomId', async (req, res) => {
  try {
    const response = await axios.delete(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}/bom/${req.params.bomId}`);
    res.status(204).send();
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/asset-models/:id/services', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}/services`);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/registry/asset-models/:id/services', async (req, res) => {
  try {
    const response = await axios.post(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}/services`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.patch('/api/registry/asset-models/:id/services/:serviceId', async (req, res) => {
  try {
    const response = await axios.patch(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}/services/${req.params.serviceId}`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.delete('/api/registry/asset-models/:id/services/:serviceId', async (req, res) => {
  try {
    const response = await axios.delete(`${DEPOT_SERVICE_URL}/api/registry/asset-models/${req.params.id}/services/${req.params.serviceId}`);
    res.status(204).send();
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.get('/api/registry/assets', async (req, res) => {
  try {
    const response = await axios.get(`${DEPOT_SERVICE_URL}/api/registry/assets`, { params: req.query });
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.post('/api/registry/assets', async (req, res) => {
  try {
    const response = await axios.post(`${DEPOT_SERVICE_URL}/api/registry/assets`, req.body);
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

app.patch('/api/registry/assets/:id', async (req, res) => {
  try {
    const response = await axios.patch(`${DEPOT_SERVICE_URL}/api/registry/assets/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// --- QA MISSION CONTROL (SIMULATOR PROXY) ---

app.get('/api/qa/system-health', async (req, res) => {
  Logger.info('[BFF] Aggregating system health across all domains');
  const services = [
    { name: 'kalles-finance', url: 'https://kalles-finance-w7fsmra4yq-ew.a.run.app' },
    { name: 'kalles-hr', url: 'https://kalles-hr-w7fsmra4yq-ew.a.run.app' },
    { name: 'kalles-traffic', url: 'https://kalles-traffic-w7fsmra4yq-ew.a.run.app' },
    { name: 'kalles-energy-depot', url: 'https://kalles-energy-depot-w7fsmra4yq-ew.a.run.app' },
    { name: 'kalles-adapters', url: 'https://kalles-adapters-w7fsmra4yq-ew.a.run.app' },
    { name: 'kalles-simulation-engine', url: SIMULATOR_API_URL }
  ];

  const healthData = await Promise.all(
    services.map(async (svc) => {
      try {
        const response = await axios.get(svc.url, { timeout: 3000 });
        // The services now return { status, service, message, revision }
        return { name: svc.name, status: response.data.status || 'UP', revision: response.data.revision, message: response.data.message };
      } catch (err: any) {
        return { name: svc.name, status: 'DOWN', revision: 'UNKNOWN', message: err.message };
      }
    })
  );

  // Add BFF itself
  healthData.push({ 
    name: 'kalles-bff', 
    status: 'UP', 
    revision: process.env.K_REVISION || 'local', 
    message: 'BFF is orchestrating QA traffic! 🚀' 
  });

  res.json(healthData);
});

app.get('/api/qa/world-state', async (req, res) => {
  Logger.info('[BFF] Proxying request to World Engine /world/state');
  try {
    const response = await axios.get(`${SIMULATOR_API_URL}/world/state`);
    res.json(response.data);
  } catch (error: any) {
    Logger.error(`[BFF] Failed to fetch World State: ${error.message}`);
    res.status(500).json({ error: 'World Engine is currently unreachable.' });
  }
});

app.post('/api/qa/world-chaos', async (req, res) => {
  Logger.info('[BFF] Unleashing Chaos Monkey via Simulator');
  try {
    const response = await axios.post(`${SIMULATOR_API_URL}/world/chaos/start`, { intervalMs: 30000 });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/qa/netex/download', async (req, res) => {
  const { operatorId } = req.body;
  Logger.info(`[BFF] Triggering NeTEx Download manually for ${operatorId || 'sl'}`);
  try {
    const response = await axios.post(`https://kalles-adapters-w7fsmra4yq-ew.a.run.app/api/adapters/netex/download`, { operatorId });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/qa/netex/parse', async (req, res) => {
  Logger.info('[BFF] Triggering NeTEx Parse manually');
  try {
    const response = await axios.post(`https://kalles-adapters-w7fsmra4yq-ew.a.run.app/api/adapters/netex/parse`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/qa/netex/archives/:filename', async (req, res) => {
  Logger.info(`[BFF] Triggering NeTEx Archive Deletion for ${req.params.filename}`);
  try {
    const response = await axios.delete(`https://kalles-adapters-w7fsmra4yq-ew.a.run.app/api/adapters/netex/archives/${req.params.filename}`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/qa/adapters-status', async (req, res) => {
  try {
    const response = await axios.get(`https://kalles-adapters-w7fsmra4yq-ew.a.run.app/api/adapters/status`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/qa/telematics-mode', async (req, res) => {
  const { enable } = req.body;
  Logger.info(`[BFF] Toggling Telematics Live Mode to: ${enable}`);
  try {
    const response = await axios.post(`https://kalles-adapters-w7fsmra4yq-ew.a.run.app/api/adapters/telematics/live`, { enable });
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/qa/tapes', async (req, res) => {
  try {
    const response = await axios.get(`${SIMULATOR_API_URL}/world/tapes`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/qa/koda-download', async (req, res) => {
  Logger.info('[BFF] Triggering KoDa historical download');
  try {
    const response = await axios.post(`${SIMULATOR_API_URL}/world/koda-download`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/qa/replay-tape', async (req, res) => {
  Logger.info('[BFF] Triggering Tape Replay');
  try {
    const response = await axios.post(`${SIMULATOR_API_URL}/world/replay`, req.body);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/qa/scenarios', async (req, res) => {
  try {
    const response = await axios.get(`${SIMULATOR_API_URL}/world/scenarios`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/qa/world-reset', async (req, res) => {
  Logger.info('[BFF] Triggering World Hard Reset via Simulator');
  try {
    const response = await axios.post(`${SIMULATOR_API_URL}/world/sandbox/reset`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/qa/scenarios/:id/start', async (req, res) => {
  Logger.info(`[BFF] Starting Scenario ${req.params.id}`);
  try {
    const response = await axios.post(`${SIMULATOR_API_URL}/world/scenarios/${req.params.id}/start`);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// In-memory mock state for the skeleton
const driverState: Record<string, any> = {
  'DRIVER-007': { status: 'OFF_DUTY', currentTourId: 'TOUR-123', assignedVehicleId: 'BUSS-101' }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'BFF is alive and kicking! 🚀' });
});

// 1. Fetch current driver state & schedule
app.get('/api/driver/:id/state', (req, res) => {
  const state = driverState[req.params.id];
  if (!state) return res.status(404).json({ error: 'Driver not found' });
  
  // Mocked schedule data (Would come from Traffic/HR)
  const schedule = {
    shiftStart: '08:00',
    shiftEnd: '16:00',
    tours: [
      {
        id: 'TOUR-123',
        line: '676',
        vehicleId: 'BUSS-101',
        vehicleType: 'DOUBLE_DECKER',
        status: state.status === 'IN_TRANSIT' ? 'IN_PROGRESS' : 'SCHEDULED',
        stops: [
          { name: 'Norrtälje RC', arrival: '08:15', departure: '08:20' },
          { name: 'Campus Roslagen', arrival: '08:25', departure: '08:27' },
          { name: 'Tekniska Högskolan', arrival: '09:15', departure: '09:20' }
        ]
      }
    ]
  };

  res.json({ state, schedule });
});

// 2. Action: Clock In
app.post('/api/driver/:id/clock-in', (req, res) => {
  driverState[req.params.id].status = 'PRE_TRIP_REQUIRED';
  Logger.info(`Driver ${req.params.id} clocked in.`);
  res.json({ status: 'PRE_TRIP_REQUIRED' });
});

// 3. Fetch Dynamic Checklist
app.get('/api/vehicle/:id/checklist', (req, res) => {
  const { id } = req.params;
  // Mock fetching checklist from Depot based on vehicle type
  const checklist = [
    { id: 'CHK-1', category: 'Säkerhet', text: 'Bromstryck OK', isCritical: true },
    { id: 'CHK-2', category: 'Säkerhet', text: 'Däckmönster > 3mm', isCritical: true },
    { id: 'CHK-3', category: 'Interiör', text: 'Ingen skadegörelse i salong', isCritical: false }
  ];
  if (id === 'BUSS-101') { // Example for double decker
    checklist.push({ id: 'CHK-4', category: 'Säkerhet', text: 'Övre däck nödutgångar fria', isCritical: true });
  }
  res.json(checklist);
});

// 4. Action: Submit Checklist
app.post('/api/vehicle/:id/checklist', (req, res) => {
  const { driverId, passed, photoEvidence } = req.body;
  if (!photoEvidence) {
     return res.status(400).json({ error: 'Photo evidence of license plate is required.' });
  }
  
  if (passed) {
    driverState[driverId].status = 'READY_FOR_DEPARTURE';
    Logger.info(`Pre-trip inspection passed for ${req.params.id} by ${driverId}`);
    res.json({ status: 'READY_FOR_DEPARTURE' });
  } else {
    // Ground the bus, trigger Depot API
    Logger.warn(`Pre-trip inspection FAILED for ${req.params.id} by ${driverId}`);
    res.status(400).json({ error: 'Vehicle grounded. Awaiting replacement bus.' });
  }
});

// 5. Action: Start Tour
app.post('/api/tour/:id/start', (req, res) => {
  const { driverId } = req.body;
  driverState[driverId].status = 'IN_TRANSIT';
  Logger.info(`Tour ${req.params.id} started by ${driverId}`);
  res.json({ status: 'IN_TRANSIT' });
});

app.listen(port, () => {
  Logger.info(`[BFF] Backend-For-Frontend running on port ${port}`);
});