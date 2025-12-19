-- Demo Users Creation Script
-- This script creates demo users for all three roles: Salesman, Distributor, and Owner
-- Password for all demo users: Demo@123

-- Note: In Supabase, we need to use the admin API or auth.admin functions
-- This script demonstrates the data structure. You'll run this after users are created via auth.

-- Demo user credentials (to be created via Supabase Auth):
-- 1. Salesman: salesman@demo.com / Demo@123
-- 2. Distributor: distributor@demo.com / Demo@123  
-- 3. Owner: owner@demo.com / Demo@123

-- Insert demo profiles (replace UUIDs with actual user IDs after auth creation)
-- These will be auto-created by the trigger, but we can update them with proper names

-- Create a function to set up demo data
CREATE OR REPLACE FUNCTION setup_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  salesman_id UUID;
  distributor_id UUID;
  owner_id UUID;
  shop1_id UUID;
  shop2_id UUID;
  shop3_id UUID;
BEGIN
  -- Get user IDs (assuming they exist from auth)
  SELECT id INTO salesman_id FROM auth.users WHERE email = 'salesman@demo.com' LIMIT 1;
  SELECT id INTO distributor_id FROM auth.users WHERE email = 'distributor@demo.com' LIMIT 1;
  SELECT id INTO owner_id FROM auth.users WHERE email = 'owner@demo.com' LIMIT 1;

  -- Only proceed if users exist
  IF salesman_id IS NOT NULL THEN
    -- Update salesman profile
    UPDATE public.profiles 
    SET full_name = 'Demo Salesman', role = 'salesman'
    WHERE id = salesman_id;

    -- Create demo shops created by salesman
    INSERT INTO public.shops (id, shop_name, mobile_number, latitude, longitude, address, landmark, product_available, problem_type, created_by)
    VALUES 
      (uuid_generate_v4(), 'Patel General Store', '9876543210', 23.0225, 72.5714, 'Satellite Road, Ahmedabad', 'Near SG Highway', false, 'price_high', salesman_id),
      (uuid_generate_v4(), 'Mehta Provisions', '9876543211', 23.0300, 72.5800, 'CG Road, Ahmedabad', 'Opposite City Gold Cinema', true, NULL, salesman_id),
      (uuid_generate_v4(), 'Shah Trading Co', '9876543212', 23.0400, 72.5650, 'Navrangpura, Ahmedabad', 'Near Gujarat University', false, 'no_space', salesman_id),
      (uuid_generate_v4(), 'Krishna Store', '9876543213', 23.0500, 72.5750, 'Maninagar, Ahmedabad', 'Behind Railway Station', true, NULL, salesman_id),
      (uuid_generate_v4(), 'Ambika Traders', '9876543214', 23.0150, 72.5900, 'Vastrapur, Ahmedabad', 'Lake Garden Road', false, 'competitor', salesman_id)
    RETURNING id INTO shop1_id;

    -- Get a couple shop IDs for orders
    SELECT id INTO shop2_id FROM public.shops WHERE shop_name = 'Mehta Provisions' LIMIT 1;
    SELECT id INTO shop3_id FROM public.shops WHERE shop_name = 'Krishna Store' LIMIT 1;

    -- Create demo orders from shops with products
    IF shop2_id IS NOT NULL THEN
      INSERT INTO public.orders (shop_id, product_name, quantity, status, created_by)
      VALUES 
        (shop2_id, 'Product A', 50, 'pending', salesman_id),
        (shop2_id, 'Product B', 30, 'pending', salesman_id);
    END IF;

    IF shop3_id IS NOT NULL THEN
      INSERT INTO public.orders (shop_id, product_name, quantity, status, created_by)
      VALUES 
        (shop3_id, 'Product A', 100, 'pending', salesman_id),
        (shop3_id, 'Product C', 25, 'pending', salesman_id);
    END IF;

    RAISE NOTICE 'Demo salesman data created successfully';
  END IF;

  IF distributor_id IS NOT NULL THEN
    -- Update distributor profile
    UPDATE public.profiles 
    SET full_name = 'Demo Distributor', role = 'distributor'
    WHERE id = distributor_id;

    RAISE NOTICE 'Demo distributor profile updated successfully';
  END IF;

  IF owner_id IS NOT NULL THEN
    -- Update owner profile
    UPDATE public.profiles 
    SET full_name = 'Demo Owner', role = 'owner'
    WHERE id = owner_id;

    RAISE NOTICE 'Demo owner profile updated successfully';
  END IF;

  IF salesman_id IS NULL AND distributor_id IS NULL AND owner_id IS NULL THEN
    RAISE NOTICE 'No demo users found. Please create auth users first using the instructions below.';
  END IF;
END;
$$;

-- Instructions to create demo users:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" and create these accounts:
--    - Email: salesman@demo.com, Password: Demo@123
--    - Email: distributor@demo.com, Password: Demo@123
--    - Email: owner@demo.com, Password: Demo@123
-- 3. After creating users, run: SELECT setup_demo_data();

-- To run this setup after creating auth users:
-- SELECT setup_demo_data();

-- To verify the demo data:
-- SELECT * FROM public.profiles;
-- SELECT * FROM public.shops;
-- SELECT * FROM public.orders;
