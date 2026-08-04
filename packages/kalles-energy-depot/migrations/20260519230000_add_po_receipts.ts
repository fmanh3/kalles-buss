import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. INLEVERANS-TABELLEN (Godsmottagning)
  // Varje gång en lastbil backar till porten och dumpar delar, skapas rader här.
  await knex.schema.createTable('po_receipts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('po_line_id').notNullable().references('id').inTable('purchase_order_lines').onDelete('CASCADE');
    
    table.integer('quantity_received').notNullable();
    table.string('delivery_note_number', 100); // Följesedelsnummer
    
    table.uuid('received_by').notNullable().references('id').inTable('users').onDelete('RESTRICT'); 
    table.timestamp('received_at').defaultTo(knex.fn.now());
    
    // För att förhindra dubbelinmatning av samma följesedel
    table.unique(['po_line_id', 'delivery_note_number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('po_receipts');
}
