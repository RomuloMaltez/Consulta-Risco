/**
 * Server-only environment variable validation
 * This file ensures that sensitive environment variables are never exposed to the client
 */

import 'server-only';
import { z } from 'zod';

// Schema for server-only environment variables
const serverEnvSchema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Schema for public (client-accessible) environment variables
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

// Validate environment variables
function validateEnv() {
  // Validate server-only variables
  const serverEnvResult = serverEnvSchema.safeParse({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!serverEnvResult.success) {
    console.error('❌ Invalid server environment variables:');
    serverEnvResult.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    throw new Error('Invalid server environment variables');
  }

  // Validate public variables
  const publicEnvResult = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!publicEnvResult.success) {
    console.error('❌ Invalid public environment variables:');
    publicEnvResult.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    throw new Error('Invalid public environment variables');
  }

  return {
    server: serverEnvResult.data,
    public: publicEnvResult.data,
  };
}

// Validate and export typed environment variables
export const env = validateEnv();

// Type-safe getters for specific variables
export function getGroqApiKey(): string {
  if (!env.server.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }
  return env.server.GROQ_API_KEY;
}

export function isProduction(): boolean {
  return env.server.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return env.server.NODE_ENV === 'development';
}
