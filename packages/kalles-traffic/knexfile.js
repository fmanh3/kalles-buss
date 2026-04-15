"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    development: {
        client: "pg",
        connection: {
            host: process.env.DB_HOST || '127.0.0.1',
            port: Number(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || 'kalles_traffic_user',
            password: process.env.DB_PASSWORD || 'kalles_traffic_password_local',
            database: process.env.DB_NAME || 'kalles_traffic'
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
exports.default = config;
//# sourceMappingURL=knexfile.js.map