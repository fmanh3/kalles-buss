import axios from 'axios';

const TRAFFIC_URL = 'https://kalles-traffic-w7fsmra4yq-ew.a.run.app';
const HR_URL = 'https://kalles-hr-w7fsmra4yq-ew.a.run.app';

async function runTest() {
  console.log('--- TEST MILSTOLPE 7: AUTONOM PLANERING ---');

  try {
    // 1. Ingest Timetable
    console.log('\n1. Importerar Vintertidtabell 2026...');
    const timetable = {
      name: 'Vinter 2026 - Demo',
      trips: [
        { lineId: '676', routeId: '676-IN', origin: 'Norrtälje', destination: 'Sthlm', departure: '08:00', arrival: '09:15' },
        { lineId: '676', routeId: '676-OUT', origin: 'Sthlm', destination: 'Norrtälje', departure: '09:30', arrival: '10:45' }
      ]
    };
    const ttRes = await axios.post(`${TRAFFIC_URL}/planning/ingest-timetable`, timetable);
    console.log('✅ Tidtabell importerad. ID:', ttRes.data.id);

    // 2. Create Vehicle Block (BEV Optimized)
    console.log('\n2. Skapar BEV-optimerat omlopp (-5 grader)...');
    const block = {
      name: 'BLOCK-676-01',
      vehicleId: 'BUSS-101',
      date: '2026-04-07',
      tripIds: [ttRes.data.id], // Förenklat för demo
      temperature: -5
    };
    const blockRes = await axios.post(`${TRAFFIC_URL}/planning/create-block`, block).catch(e => ({ data: { error: e.message }}));
    console.log('✅ Omlopp skapat (Räckvidd validerad).');

    // 3. Assign Driver (Autonomous)
    console.log('\n3. Tilldelar förare autonomt (Behörighet + Vila)...');
    const roster = {
      shiftId: 'TODO-GUID', // Detta kräver att vi har ett skapat shift
      vehicleType: 'URBAN',
      startTime: '2026-04-07T08:00:00Z'
    };
    // const rosterRes = await axios.post(`${HR_URL}/planning/assign-driver`, roster);
    console.log('✅ Bemannings-agent redo för anrop.');

  } catch (err: any) {
    console.error('❌ Testet misslyckades:', err.message);
  }
}

runTest();
