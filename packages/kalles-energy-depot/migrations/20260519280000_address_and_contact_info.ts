import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Core Contacts on Depot
  await knex.schema.alterTable('depots', (table) => {
    table.string('contact_email', 255);
    table.string('contact_phone', 50);
    // We keep location_description for backward compatibility during rollout, 
    // but the future is the structured addresses table below.
  });

  // 2. Structured Addresses Table
  // This allows one depot (or user, or vendor!) to have multiple addresses
  await knex.schema.createTable('addresses', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // Polymorphic association fields (what does this address belong to?)
    // Could belong to a depot, a vendor, or a user.
    table.string('entity_type', 50).notNullable(); // 'DEPOT', 'VENDOR', 'USER'
    table.string('entity_id').notNullable(); // e.g., 'DEPOT-NTA' or UUID

    table.string('address_type', 50).notNullable(); // 'VISITING', 'DELIVERY', 'BILLING'
    
    // Address components
    table.string('street_1', 255).notNullable();
    table.string('street_2', 255);
    table.string('street_3', 255);
    table.string('postal_code', 20).notNullable();
    table.string('city', 100).notNullable();
    table.string('country', 100).defaultTo('Sweden');
    
    // Geo-coordinates
    table.decimal('latitude', 10, 7);
    table.decimal('longitude', 10, 7);
    
    // Operational constraints
    table.text('delivery_instructions'); // "Call 5 mins before arrival. Gate code: 1234"
    
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // A depot should generally only have one 'DELIVERY' address (or we pick the primary)
    // But we avoid strict DB constraints on the combo to allow flexibility (e.g. multiple loading docks).
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('addresses');
  
  await knex.schema.alterTable('depots', (table) => {
    table.dropColumn('contact_phone');
    table.dropColumn('contact_email');
  });
}
