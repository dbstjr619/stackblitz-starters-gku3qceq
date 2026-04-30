import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://urfvlqbftchgiiweabho.supabase.co';
const supabaseKey = 'sb_publishable_znXTu-Uj_AWMh2Pzpbp93g_wSMDp9dQ';

export const supabase = createClient(supabaseUrl, supabaseKey);
