// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uiggrkayyxcrsovzrrbn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpZ2dya2F5eXhjcnNvdnpycmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMTUzNzgsImV4cCI6MjA2NjU5MTM3OH0.n5F-ytx_3FfPExXy9SPCGQSLZDrwywROwcF4IcY5t9s'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
