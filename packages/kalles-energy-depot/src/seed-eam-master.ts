import Knex from 'knex';
import config from '../knexfile.cjs';

const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
const db = Knex(dbConfig);

async function seed() {
  console.log("🚀 Seeding Enterprise EAM Master Data...");
  try {
    // 1. DEPOTS
    await db('depots').insert([
      { id: 'DEPOT-NT', name: 'Norrtälje Huvuddepå' },
      { id: 'DEPOT-SVE', name: 'Sveavägen Depå' }
    ]).onConflict('id').ignore();

    // 2. ASSET CATEGORIES
    const categories = [
      { code: 'VEHICLE', description: 'Fleet Vehicles (Buses)' },
      { code: 'EQUIPMENT', description: 'Workshop Equipment' },
      { code: 'FACILITY', description: 'Depot Infrastructure' }
    ];
    for (const cat of categories) {
      await db('asset_categories').insert(cat).onConflict('code').ignore();
    }
    const catRows = await db('asset_categories').select('id', 'code');
    const vehicleCat = catRows.find(c => c.code === 'VEHICLE');

    // 3. ASSET MODELS
    const [model1] = await db('asset_models').insert({
      manufacturer: 'Volvo',
      model_number: '7900-Electric',
      asset_class: 'VEHICLE',
      attributes: JSON.stringify({ power: '200kW', battery: '400kWh' })
    }).returning('id');

    // 4. ASSETS (The Fleet)
    await db('assets').insert([
      { asset_tag: 'BUSS-101', serial_number: 'VIN-NT-101', asset_model_id: model1.id || model1, asset_category_id: vehicleCat.id, status: 'AVAILABLE', home_depot_id: 'DEPOT-NT' },
      { asset_tag: 'BUSS-102', serial_number: 'VIN-NT-102', asset_model_id: model1.id || model1, asset_category_id: vehicleCat.id, status: 'AVAILABLE', home_depot_id: 'DEPOT-NT' },
      { asset_tag: 'BUSS-104', serial_number: 'VIN-SVE-104', asset_model_id: model1.id || model1, asset_category_id: vehicleCat.id, status: 'IN_MAINTENANCE', home_depot_id: 'DEPOT-SVE' }
    ]).onConflict('asset_tag').ignore();

    // 5. VMRS SYSTEMS
    const systems = [
      { code: '31', description: 'Charging System' },
      { code: '17', description: 'Tires & Wheels' },
      { code: '45', description: 'Braking System' }
    ];
    for (const sys of systems) {
      await db('vmrs_systems').insert(sys).onConflict('code').ignore();
    }

    console.log("✅ Seed complete.");
  } catch (e) {
    console.error("❌ Seed failed:", e);
  }
  process.exit(0);
}
seed();
