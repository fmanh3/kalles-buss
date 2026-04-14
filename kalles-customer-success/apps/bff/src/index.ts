import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 8080;

// URL:er till våra molntjänster (hämtas från miljövariabler i Cloud Run)
const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL || 'http://localhost:8081';
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://localhost:8082';
const TRAFFIC_SERVICE_URL = process.env.TRAFFIC_SERVICE_URL || 'http://localhost:8083';

/**
 * CEO Dashboard Endpoint
 * Aggregerar data för VD-vyn
 */
app.get('/api/ceo/dashboard', async (req, res) => {
  try {
    console.log('[BFF] Hämtar data för VD Dashboard...');
    
    // 1. Hämta likviditet från Finance
    const financeRes = await axios.get(`${FINANCE_SERVICE_URL}/liquidity`).catch(e => ({ data: { error: 'Finance offline' } }));
    
    // 2. I en framtida version skulle vi hämta varningsflaggor från HR här
    
    res.json({
      timestamp: new Date().toISOString(),
      finance: financeRes.data,
      companyName: 'Kalles Buss AB'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Driver Schedule Endpoint
 */
app.get('/api/driver/schedule/:driverId', async (req, res) => {
  const { driverId } = req.params;
  try {
    console.log(`[BFF] Hämtar schema för förare: ${driverId} (encoded: ${encodeURIComponent(driverId)})`);
    const hrRes = await axios.get(`${HR_SERVICE_URL}/drivers/${encodeURIComponent(driverId)}/schedule`);
    res.json(hrRes.data);
  } catch (err: any) {
    console.error('[BFF] Fel vid anrop till HR-tjänst:', err.message);
    res.status(500).json({ error: 'Kunde inte hämta schema från HR-domänen' });
  }
});

/**
 * Driver Profile Endpoint
 */
app.get('/api/driver/profile/:driverId', async (req, res) => {
  const { driverId } = req.params;
  try {
    console.log(`[BFF] Hämtar profil för förare: ${driverId}`);
    const hrRes = await axios.get(`${HR_SERVICE_URL}/drivers/${encodeURIComponent(driverId)}/profile`);
    res.json(hrRes.data);
  } catch (err: any) {
    res.status(500).json({ error: 'Kunde inte hämta förarprofil' });
  }
});

/**
 * Vehicle Detailed Status Endpoint
 */
app.get('/api/vehicles/:id/details', async (req, res) => {
  const { id } = req.params;
  try {
    const trafficRes = await axios.get(`${TRAFFIC_SERVICE_URL}/vehicles/${id}/status`);
    res.json(trafficRes.data);
  } catch (err: any) {
    res.status(500).json({ error: 'Kunde inte hämta fordonsstatus' });
  }
});

app.get('/health', (req, res) => res.send('BFF is healthy'));

app.listen(port, () => {
  console.log(`[BFF] Customer Success Gateway listening on port ${port}`);
});
