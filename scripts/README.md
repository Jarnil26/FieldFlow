# Database Scripts

This folder contains SQL and TypeScript scripts for setting up and managing the database.

## Scripts Overview

1. **001_create_tables.sql** - Creates the initial database schema (tables, RLS policies, triggers)
2. **002_create_demo_users.sql** - SQL function to set up demo data after users are created
3. **create-demo-users.ts** - Node.js script to create demo users via Supabase Auth Admin API

## Creating Demo Users

### Method 1: Using the Node.js Script (Recommended)

This method automatically creates auth users and sets up demo data in one go.

**Prerequisites:**
- Ensure you have the `SUPABASE_SERVICE_ROLE_KEY` environment variable set in your project

**Steps:**
1. Make sure the database schema is created first by running `001_create_tables.sql`
2. Run the demo user creation script:
   ```bash
   # From the v0 interface, this script will run automatically when you execute it
   # The script uses the Supabase Service Role Key to create users
   ```

### Method 2: Manual Creation via Supabase Dashboard

If you prefer to manually create users or the script doesn't work:

**Steps:**
1. Run `001_create_tables.sql` first to create the database schema
2. Go to Supabase Dashboard → Authentication → Users
3. Click "Add User" and create these accounts:
   - **Salesman**: 
     - Email: `salesman@demo.com`
     - Password: `Demo@123`
   - **Distributor**: 
     - Email: `distributor@demo.com`
     - Password: `Demo@123`
   - **Owner**: 
     - Email: `owner@demo.com`
     - Password: `Demo@123`
4. Run the SQL function to create demo data:
   ```sql
   SELECT setup_demo_data();
   ```

## Demo User Credentials

After creation, you can log in with these credentials:

| Role | Email | Password |
|------|-------|----------|
| Salesman | salesman@demo.com | Demo@123 |
| Distributor | distributor@demo.com | Demo@123 |
| Owner | owner@demo.com | Demo@123 |

## Demo Data Included

- **5 Demo Shops** (created by the salesman)
  - Mix of shops with and without products
  - Various problem types (price_high, no_space, competitor)
  - Realistic GPS coordinates in Ahmedabad, Gujarat
  - Phone numbers and addresses

- **4 Demo Orders** (pending delivery)
  - Associated with shops that have products available
  - Ready for the distributor to process

## Verifying Demo Data

After running the setup, verify the data was created:

```sql
-- Check user profiles
SELECT * FROM public.profiles;

-- Check shops
SELECT * FROM public.shops;

-- Check orders
SELECT * FROM public.orders;
```

## Creating Real Users

For production use:
1. Users can sign up through the app's sign-up page
2. They will select their role during registration
3. The trigger function will automatically create their profile with the selected role
4. No manual intervention needed
