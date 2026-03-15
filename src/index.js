import { supabase } from './supabaseClient.js'

async function testConnection() {
  console.log('Testing Supabase connection...')

  const { data, error } = await supabase.from('_test').select('*').limit(1)

  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    console.error('Connection error:', error.message)
    return false
  }

  console.log('Supabase connection successful!')
  return true
}

testConnection()
