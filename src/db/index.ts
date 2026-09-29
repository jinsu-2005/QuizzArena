import * as dotenv from 'dotenv';
dotenv.config();

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// This is required to satisfy typechecker if DATABASE_URL is not set at build time
const sql = neon(process.env.DATABASE_URL || "postgres://dummy:password@localhost/dummy");
export const db = drizzle(sql, { schema });

