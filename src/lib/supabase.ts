import { createClient } from '@supabase/supabase-js';

// Usar variáveis de ambiente se disponíveis, senão fallback para as hardcoded
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dgvilhehdyslhjvnckjg.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRndmlsaGVoZHlzbGhqdm5ja2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4OTIyNjMsImV4cCI6MjA4MzQ2ODI2M30.WQrzj7VWvCcOyvWIuvbfynR_cgoRAgLVXWSQwVUMStk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
