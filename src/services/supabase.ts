import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kszqzhxdfyeetxldhaxk.supabase.co';
const supabaseAnonKey = 'sb_publishable_g1TIuFwh-XZsI2iXlS1dcw_W5fP608F';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
