import Knex from 'knex';
import config from '../knexfile.cjs';

const dbConfig = process.env.NODE_ENV === 'production' ? config.production : config.development;
const db = Knex(dbConfig);

async function seed() {
  console.log("Seeding parts and VMRS components...");
  
  // Seed VMRS System
  const [sys] = await db('vmrs_systems').insert({
    code: '013', description: 'Brakes'
  }).onConflict('code').merge().returning('*');

  // Seed VMRS Assembly
  const [assy] = await db('vmrs_assemblies').insert({
    vmrs_system_id: sys.id, code: '001', description: 'Front Brakes'
  }).onConflict(['vmrs_system_id', 'code']).merge().returning('*');

  // Seed VMRS Component
  const [comp] = await db('vmrs_components').insert({
    vmrs_assembly_id: assy.id, code: '015', description: 'Brake Pads'
  }).onConflict(['vmrs_assembly_id', 'code']).merge().returning('*');

  // Seed Parts
  await db('parts').insert([
    { part_number: 'P-BRK-001', description: 'Heavy Duty Brake Pads Front', uom_code: 'EACH', default_warranty_days: 365 },
    { part_number: 'P-FIL-002', description: 'Oil Filter Standard', uom_code: 'EACH', default_warranty_days: 0 },
    { part_number: 'P-GLS-003', description: 'Windshield Volvo 7900', uom_code: 'EACH', default_warranty_days: 730 },
  ]).onConflict('part_number').ignore();

  console.log("Done seeding parts and VMRS.");
  process.exit(0);
}

seed();
