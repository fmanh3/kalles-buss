import Knex from 'knex';
import config from '../knexfile.cjs';

const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
const db = Knex(dbConfig);

async function seed() {
  console.log("Seeding test inventory data...");
  try {
    const depotId1 = 'DEPOT-NT';
    const depotId2 = 'DEPOT-SVE';
    
    await db('depots').insert([
      { id: depotId1, name: 'Norrtälje Huvudlager' },
      { id: depotId2, name: 'Sveavägen Depå' }
    ]).onConflict('id').ignore();

    const [part1] = await db('parts').insert({ part_number: 'GLS-B104-FR', description: 'Windshield Front (Bus 104)', uom_code: 'EACH' }).returning('id');
    const [part2] = await db('parts').insert({ part_number: 'BRK-PAD-UNIV', description: 'Brake Pads Universal', uom_code: 'EACH' }).returning('id');

    const [loc1] = await db('inventory_locations').insert({ depot_id: depotId1, code: 'NT-A1', description: 'Hylla A1' }).returning('id');
    const [loc2] = await db('inventory_locations').insert({ depot_id: depotId2, code: 'SVE-B2', description: 'Hylla B2' }).returning('id');

    await db('inventory_transactions').insert([
      { part_id: part1.id, location_id: loc1.id, transaction_type: 'PO_RECEIPT', quantity: 10, unit_cost: 8500 },
      { part_id: part2.id, location_id: loc1.id, transaction_type: 'PO_RECEIPT', quantity: 50, unit_cost: 1200 },
      { part_id: part2.id, location_id: loc2.id, transaction_type: 'PO_RECEIPT', quantity: 5, unit_cost: 1200 }
    ]);
    console.log("Done.");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
seed();
