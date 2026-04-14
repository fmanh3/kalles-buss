import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Utöka drivers med profil- och anställningsdata
  await knex.schema.table('drivers', (table) => {
    table.string('contact_email');
    table.string('ice_contact'); // In Case of Emergency
    table.string('bank_account');
    table.string('employment_form').defaultTo('Fast'); // Fast, Provanställning, Timis
    table.string('depot_location').defaultTo('Norrtälje Depå');
    table.integer('vacation_days_saved').defaultTo(0);
    table.integer('vacation_days_current').defaultTo(25);
  });

  // 2. Skapa certifications-tabell
  await knex.schema.createTable('certifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('driver_id').references('id').inTable('drivers').onDelete('CASCADE');
    table.string('type').notNullable(); // T.ex. "Körkort D", "YKB", "Typ-utbildning"
    table.string('reference_name'); // T.ex. "Buss 8042"
    table.date('expiry_date');
    table.enum('status', ['Giltigt', 'Utgått', 'Godkänd']).defaultTo('Giltigt');
    table.timestamps(true, true);
  });

  // Seed data för DRIVER-007
  await knex('drivers').where({ id: 'DRIVER-007' }).update({
    contact_email: 'kalle@kallesbuss.se',
    ice_contact: 'Mamma (070-123456)',
    bank_account: 'Swedbank 8327-9, 994 123 456-7',
    employment_form: 'Fast',
    depot_location: 'Norrtälje Depå',
    vacation_days_saved: 5,
    vacation_days_current: 25
  });

  await knex('certifications').insert([
    { driver_id: 'DRIVER-007', type: 'Körkort D', status: 'Giltigt' },
    { driver_id: 'DRIVER-007', type: 'YKB', status: 'Giltigt', expiry_date: '2028-12-31' },
    { driver_id: 'DRIVER-007', type: 'Typ-utbildning', reference_name: 'Buss 8042', status: 'Godkänd' },
    { driver_id: 'DRIVER-007', type: 'Typ-utbildning', reference_name: 'BUSS-101', status: 'Godkänd' }
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('certifications');
  await knex.schema.table('drivers', (table) => {
    table.dropColumn('contact_email');
    table.dropColumn('ice_contact');
    table.dropColumn('bank_account');
    table.dropColumn('employment_form');
    table.dropColumn('depot_location');
    table.dropColumn('vacation_days_saved');
    table.dropColumn('vacation_days_current');
  });
}
