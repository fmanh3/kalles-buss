import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('employees', (t) => {
    t.string('work_email').nullable();
    t.string('private_email').nullable();
    t.string('work_phone').nullable();
    t.string('private_phone').nullable();
    t.string('home_address_street').nullable();
    t.string('home_address_city').nullable();
    t.string('home_address_zip').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('employees', (t) => {
    t.dropColumn('home_address_zip');
    t.dropColumn('home_address_city');
    t.dropColumn('home_address_street');
    t.dropColumn('private_phone');
    t.dropColumn('work_phone');
    t.dropColumn('private_email');
    t.dropColumn('work_email');
  });
}
