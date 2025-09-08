-- Add unique constraint for usernames (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'profiles' AND constraint_name = 'profiles_username_unique'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
    END IF;
END $$;

-- Add online status tracking (if column doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_online') THEN
        ALTER TABLE public.profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update the handle_new_user function to generate unique usernames
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Get base username from metadata or email
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  final_username := base_username;
  
  -- Check if username exists and make it unique
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  
  INSERT INTO public.profiles (user_id, username, display_name, is_online)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    true
  );
  RETURN NEW;
END;
$$;

-- Create function to update user online status
CREATE OR REPLACE FUNCTION public.update_user_status(user_uuid uuid, online_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    is_online = online_status,
    last_seen = CASE WHEN online_status = false THEN now() ELSE last_seen END
  WHERE user_id = user_uuid;
END;
$$;