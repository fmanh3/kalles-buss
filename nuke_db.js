const { Client } = require('pg');
const client = new Client({
  host: '34.76.83.254',
  user: 'postgres',
  password: 'postgres_prod_password',
  database: 'kalles-traffic',
  port: 5432,
});

async function run() {
  await client.connect();
  console.log("Connected to DB.");
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;");
  console.log("Schema dropped and recreated.");
  await client.end();
}

run().catch(err => { console.error(err); process.exit(1); });
