import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "postgresql",
    connection: {
      host: "localhost",
      port: parseInt(process.env.DB_PORT || "5438"),
      database: "kalles_process",
      user: "kalles_process_user",
      password: "local_password",
    },
    migrations: {
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },
  production: {
    client: "postgresql",
    connection: process.env.DATABASE_URL,
    migrations: {
      directory: "./migrations",
    },
  }
};

export default config;
