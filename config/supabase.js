import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import config from './config.js';

dotenv.config();

const supabaseUrl = config.supabase?.url || process.env.SUPABASE_URL;
const supabaseKey = config.supabase?.key || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
   console.warn('⚠️ Supabase URL hoặc Key chưa được cấu hình');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
   auth: {
      persistSession: false, // Server-side không cần persist session
      autoRefreshToken: false
   }
});

// Export để dùng trong các controllers
export default supabase;
