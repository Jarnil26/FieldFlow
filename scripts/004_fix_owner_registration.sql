-- Drop existing policies and recreate with proper permissions
DROP POLICY IF EXISTS "Owners can insert companies" ON public.companies;

-- Allow any authenticated user to insert a company if they are the owner
CREATE POLICY "Owners can create companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Create a function to handle owner registration atomically
CREATE OR REPLACE FUNCTION public.create_owner_company(
  p_company_name TEXT,
  p_owner_name TEXT,
  p_owner_email TEXT,
  p_owner_phone TEXT,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT
)
RETURNS TABLE (
  company_id UUID,
  company_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_company_code TEXT;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Generate unique company code
  v_company_code := generate_company_code();
  
  -- Insert company
  INSERT INTO public.companies (
    company_name,
    company_code,
    owner_id,
    owner_name,
    owner_email,
    owner_phone,
    address,
    city,
    state
  )
  VALUES (
    p_company_name,
    v_company_code,
    v_user_id,
    p_owner_name,
    p_owner_email,
    p_owner_phone,
    p_address,
    p_city,
    p_state
  )
  RETURNING id INTO v_company_id;
  
  -- Update user profile with company_id
  UPDATE public.profiles
  SET company_id = v_company_id
  WHERE id = v_user_id;
  
  -- Return the company info
  RETURN QUERY SELECT v_company_id, v_company_code;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_owner_company TO authenticated;

-- Create a function to join a company (for salesman/distributor)
CREATE OR REPLACE FUNCTION public.join_company(
  p_company_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Find the company
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE company_code = upper(p_company_code);
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Invalid company code';
  END IF;
  
  -- Update user profile with company_id
  UPDATE public.profiles
  SET company_id = v_company_id
  WHERE id = v_user_id;
  
  RETURN v_company_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_company TO authenticated;
