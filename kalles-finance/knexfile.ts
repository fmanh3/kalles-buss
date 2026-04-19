import { Knex } from "knex";

const INSTANCE_CONNECTION_NAME = 'joakim-hansson-lab:europe-west1:kalles-finance-97d0dd7d';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'kalles_finance_user',
      password: process.env.DB_PASSWORD || 'kalles_finance_password_local',
      database: process.env.DB_NAME || 'kalles_finance'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations"
    }
  },
  production: {
    client: "pg",
    connection: {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'kalles_finance',
      socketPath: `/cloudsql/${INSTANCE_CONNECTION_NAME}`
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations"
    }
  }
};

export default config;
