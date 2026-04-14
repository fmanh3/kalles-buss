module.exports = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'kalles_energy_user',
      password: process.env.DB_PASSWORD || 'local_password',
      database: process.env.DB_NAME || 'kalles_energy_depot'
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations"
    }
  }
};
