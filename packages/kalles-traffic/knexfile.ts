import { Knex } from "knex";

const INSTANCE_CONNECTION_NAME = 'joakim-hansson-lab:europe-west1:kalles-traffic-f83ea912';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'kalles_traffic_user',
      password: process.env.DB_PASSWORD || 'kalles_traffic_password_local',
      database: process.env.DB_NAME || 'kalles-traffic'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      directory: __dirname + "/migrations",
      loadExtensions: [".js"]
    }
  },
  production: {
    client: "pg",
    connection: {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'kalles-traffic',
      host: process.env.K_SERVICE ? `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME || INSTANCE_CONNECTION_NAME}` : (process.env.DB_HOST || '127.0.0.1')
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: "knex_migrations",
      directory: __dirname + "/migrations",
      loadExtensions: [".js"]
    }
  }
};

export default config;
