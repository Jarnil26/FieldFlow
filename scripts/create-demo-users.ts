// Demo Users Creation Script - Node.js version
// Run this script to create demo users via Supabase Auth Admin API

import { createClient } from "@supabase/supabase-js"

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials. Please check your environment variables.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface DemoUser {
  email: string
  password: string
  full_name: string
  role: "salesman" | "distributor" | "owner"
}

const demoUsers: DemoUser[] = [
  {
    email: "salesman@demo.com",
    password: "Demo@123",
    full_name: "Demo Salesman",
    role: "salesman",
  },
  {
    email: "distributor@demo.com",
    password: "Demo@123",
    full_name: "Demo Distributor",
    role: "distributor",
  },
  {
    email: "owner@demo.com",
    password: "Demo@123",
    full_name: "Demo Owner",
    role: "owner",
  },
]

async function createDemoUsers() {
  console.log("🚀 Creating demo users...\n")

  for (const user of demoUsers) {
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const userExists = existingUsers?.users.some((u) => u.email === user.email)

      if (userExists) {
        console.log(`✓ User ${user.email} already exists, skipping...`)
        continue
      }

      // Create user with admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email for demo
        user_metadata: {
          full_name: user.full_name,
          role: user.role,
        },
      })

      if (error) {
        console.error(`✗ Error creating ${user.role}:`, error.message)
        continue
      }

      console.log(`✓ Created ${user.role}: ${user.email}`)
      console.log(`  User ID: ${data.user?.id}`)
      console.log(`  Full Name: ${user.full_name}`)
      console.log(`  Role: ${user.role}\n`)
    } catch (error) {
      console.error(`✗ Unexpected error creating ${user.role}:`, error)
    }
  }

  console.log("\n📊 Setting up demo data...\n")

  // Call the SQL function to set up demo shops and orders
  try {
    const { error } = await supabase.rpc("setup_demo_data")

    if (error) {
      console.error("✗ Error setting up demo data:", error.message)
    } else {
      console.log("✓ Demo shops and orders created successfully")
    }
  } catch (error) {
    console.error("✗ Unexpected error setting up demo data:", error)
  }

  console.log("\n✅ Demo user creation complete!\n")
  console.log("📝 Demo Credentials:")
  console.log("─────────────────────────────────────")
  demoUsers.forEach((user) => {
    console.log(`${user.role.toUpperCase()}:`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Password: ${user.password}\n`)
  })
}

createDemoUsers().catch(console.error)
