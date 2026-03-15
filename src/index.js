import { supabase } from './supabaseClient.js'

async function testConnection() {
  const url = process.env.SUPABASE_URL || 'https://ecdpqimpqstrtewqhqoe.supabase.co'
  console.log('Testing Supabase connection...')
  console.log(`URL: ${url}`)

  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1)

    if (error) {
      // Table not found errors mean the connection itself succeeded
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('Supabase connection successful! (test table does not exist, which is expected)')
        return true
      }

      // Network-level errors are wrapped by the Supabase SDK
      const details = error.details || ''
      if (details.includes('ConnectTimeoutError') || details.includes('UND_ERR_CONNECT_TIMEOUT')) {
        console.error(`Connection failed: Timeout connecting to ${url}`)
        console.error('  → Check your network connection and that SUPABASE_URL is correct.')
      } else if (details.includes('ENOTFOUND')) {
        console.error(`Connection failed: DNS resolution failed for ${url}`)
        console.error('  → Verify SUPABASE_URL is correct and DNS is reachable.')
      } else if (details.includes('ECONNREFUSED')) {
        console.error(`Connection failed: Connection refused by ${url}`)
      } else if (error.message === 'TypeError: fetch failed') {
        console.error('Connection failed: Network unreachable.')
        if (details) console.error(`  → Details: ${details.split('\n')[0]}`)
      } else {
        console.error(`Connection failed: [${error.code || 'unknown'}] ${error.message}`)
      }
      return false
    }

    console.log('Supabase connection successful!')
    return true
  } catch (err) {
    console.error(`Unexpected error: ${err.message}`)
    return false
  }
}

testConnection().then((ok) => {
  process.exit(ok ? 0 : 1)
})
