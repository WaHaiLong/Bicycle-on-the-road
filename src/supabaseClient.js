import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'https://ecdpqimpqstrtewqhqoe.supabase.co'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable__kIj5hKBo8F9zypE_fvRxw_kgUQXzrt'

export const supabase = createClient(supabaseUrl, supabaseKey)
