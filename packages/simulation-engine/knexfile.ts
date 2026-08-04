import * as dotenv from 'dotenv';
dotenv.config();

const config = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || 'postgresql://postgres:local_password@127.0.0.1:5436/kalles-simulation',
    migrations: { 
      directory: __dirname + '/migrations',
      loadExtensions: [".ts", ".js"]
    },
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: { 
      directory: __dirname + '/migrations',
      loadExtensions: [".js"]
    },
  }
};
export default config;
