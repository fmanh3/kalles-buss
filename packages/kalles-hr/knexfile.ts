import type { Knex } from 'knex';

const INSTANCE_CONNECTION_NAME = process.env.CLOUD_SQL_CONNECTION_NAME || 'joakim-hansson-lab:europe-west1:kalles-hr-920ea374';
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.K_SERVICE;

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'kalles_hr_user',
      password: process.env.DB_PASSWORD || 'kalles_hr_password_local',
      database: process.env.DB_NAME || 'kalles-hr'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      directory: __dirname + "/migrations",
      loadExtensions: isProduction ? [".js"] : [".ts"]
    },
    seeds: {
      directory: __dirname + "/src/seeds"
    }
  },
  production: {
    client: "pg",
    connection: {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'kalles-hr',
      host: process.env.CLOUD_SQL_CONNECTION_NAME ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}` : (process.env.DB_HOST || '127.0.0.1')
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      directory: __dirname + "/migrations",
      loadExtensions: isProduction ? [".js"] : [".ts"]
    },
    seeds: {
      directory: __dirname + "/src/seeds"
    }
  }
};

export default config;
