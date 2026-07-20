console.log("URL =", process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log("KEY =", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// ここで export する
export const supabase = createClient(supabaseUrl, supabaseAnonKey)