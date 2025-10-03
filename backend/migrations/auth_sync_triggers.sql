-- Auth Sync Triggers for Supabase
-- Run these SQL commands in your Supabase SQL editor to set up automatic sync

-- 1. Create a function to handle user deletion sync
CREATE OR REPLACE FUNCTION handle_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the user from the users table when deleted from auth.users
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create trigger for user deletion
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_deleted();

-- 3. Create a function to handle email updates
CREATE OR REPLACE FUNCTION handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Update email in users table when changed in auth
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    UPDATE public.users 
    SET email = NEW.email 
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_auth_user_updated();

-- 5. Enable Row Level Security on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Create policy to allow users to read their own data
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- 7. Create policy to allow users to update their own data
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 8. Create policy for service role to manage all users (for admin functions)
DROP POLICY IF EXISTS "Service role can manage all users" ON public.users;
CREATE POLICY "Service role can manage all users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- Note: You may need to adjust these policies based on your specific needs
-- The service_role policy allows your backend to manage users with the service role key