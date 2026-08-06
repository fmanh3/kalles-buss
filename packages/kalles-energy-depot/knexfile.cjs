const INSTANCE_CONNECTION_NAME = 'joakim-hansson-lab:europe-west1:kalles-energy-depot';

module.exports = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'kalles_energy_user',
      password: process.env.DB_PASSWORD || 'local_password',
      database: process.env.DB_NAME || 'kalles-energy-depot'
    },
    migrations: {
      tableName: "knex_migrations",
      directory: __dirname + "/dist/migrations",
      loadExtensions: [".js"]
    }
  },
  production: {
    client: "pg",
    connection: {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'kalles-energy-depot',
      host: process.env.K_SERVICE ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME || INSTANCE_CONNECTION_NAME}` : (process.env.DB_HOST || '127.0.0.1')
    },
    migrations: {
      tableName: "knex_migrations",
      directory: __dirname + "/migrations",
      loadExtensions: [".js"]
    }
  }
};
