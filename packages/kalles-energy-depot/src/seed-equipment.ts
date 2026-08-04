import Knex from 'knex';
import config from '../knexfile.cjs';

const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
const db = Knex(dbConfig);

async function seed() {
  console.log("Seeding equipment types...");
  await db('equipment_types').insert([
    { id: 'EQ-WINDSHIELD-FRONT', name: 'Front Windshield Standard', category: 'GLASS' },
    { id: 'EQ-BATT-250KWH', name: 'Traction Battery 250kWh', category: 'POWERTRAIN' },
    { id: 'EQ-TIRE-275-70', name: '275/70 R 22.5 Tire', category: 'WHEELS' },
    { id: 'EQ-MIRROR-LEFT', name: 'Side Mirror Left', category: 'EXTERIOR' },
    { id: 'EQ-DOOR-MECH', name: 'Pneumatic Door Mechanism', category: 'DOORS' }
  ]).onConflict('id').ignore();
  console.log("Done.");
  process.exit(0);
}

seed();
