
import { Client } from "pg";

export function createClient() {
  return new Client({
    connectionString: process.env.DB_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });
}
