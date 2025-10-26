-- Consolidated migration script - fixes all remaining issues
-- This replaces both 008 and 009 scripts

-- 1. Fix events table - add start_date and end_date columns
DO $$ 
BEGIN
    -- Check if start_date column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'start_date') THEN
        -- Rename date to start_date
        ALTER TABLE public.events RENAME COLUMN date TO start_date;
    END IF;
    
    -- Add end_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'events' AND column_name = 'end_date') THEN
        ALTER TABLE public.events ADD COLUMN end_date date;
    END IF;
    
    -- Make time column nullable if it's not already
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'events' AND column_name = 'time' AND is_nullable = 'NO') THEN
        ALTER TABLE public.events ALTER COLUMN time DROP NOT NULL;
    END IF;
END $$;

-- 2. Create task_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.task_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  color text NOT NULL DEFAULT 'blue',
  author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create new tasks table (we'll use this instead of the old one)
CREATE TABLE IF NOT EXISTS public.tasks_new (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  task_group_id uuid REFERENCES public.task_groups(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3.1. Drop old tasks table if it exists and rename new one
DO $$ 
BEGIN
    -- Drop old tasks table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks' AND table_schema = 'public') THEN
        DROP TABLE public.tasks CASCADE;
    END IF;
    
    -- Rename tasks_new to tasks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks_new' AND table_schema = 'public') THEN
        ALTER TABLE public.tasks_new RENAME TO tasks;
    END IF;
END $$;

-- 4. Fix bills table - ensure paid column exists and remove status references
DO $$ 
BEGIN
    -- Check if paid column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bills' AND column_name = 'paid') THEN
        -- Add paid column
        ALTER TABLE public.bills ADD COLUMN paid boolean NOT NULL DEFAULT false;
        
        -- Update based on existing status if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'bills' AND column_name = 'status') THEN
            UPDATE public.bills SET paid = true WHERE status = 'paid';
            ALTER TABLE public.bills DROP COLUMN status;
        END IF;
    END IF;
END $$;

-- 5. Add missing columns to bills table
ALTER TABLE public.bills 
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'recurring' CHECK (type IN ('recurring', 'metered', 'one-time'));

ALTER TABLE public.bills 
  ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Create bill_shares table
CREATE TABLE IF NOT EXISTS public.bill_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid REFERENCES public.bills(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Fix guest_stays table column names
DO $$ 
BEGIN
    -- Rename check_in to from_date if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'guest_stays' AND column_name = 'check_in') THEN
        ALTER TABLE public.guest_stays RENAME COLUMN check_in TO from_date;
    END IF;
    
    -- Rename check_out to to_date if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'guest_stays' AND column_name = 'check_out') THEN
        ALTER TABLE public.guest_stays RENAME COLUMN check_out TO to_date;
    END IF;
END $$;

ALTER TABLE public.guest_stays 
  ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. Create allowlist table
CREATE TABLE IF NOT EXISTS public.allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  created_by_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Create join_requests table
CREATE TABLE IF NOT EXISTS public.join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. Add missing columns to existing tables
ALTER TABLE public.notes 
  ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 11. Create indexes
CREATE INDEX IF NOT EXISTS idx_task_groups_author_id ON public.task_groups(author_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_group_id ON public.tasks(task_group_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date);
CREATE INDEX IF NOT EXISTS idx_bills_type ON public.bills(type);
CREATE INDEX IF NOT EXISTS idx_bills_created_by_id ON public.bills(created_by_id);
CREATE INDEX IF NOT EXISTS idx_bill_shares_bill_id ON public.bill_shares(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_shares_user_id ON public.bill_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_shares_paid ON public.bill_shares(paid);
CREATE INDEX IF NOT EXISTS idx_guest_stays_created_by_id ON public.guest_stays(created_by_id);
CREATE INDEX IF NOT EXISTS idx_allowlist_email ON public.allowlist(email);
CREATE INDEX IF NOT EXISTS idx_allowlist_role ON public.allowlist(role);
CREATE INDEX IF NOT EXISTS idx_join_requests_email ON public.join_requests(email);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON public.join_requests(status);

-- 12. Enable RLS
ALTER TABLE public.task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for task_groups (more permissive for now)
DROP POLICY IF EXISTS "Users can view all task groups" ON public.task_groups;
CREATE POLICY "Users can view all task groups" ON public.task_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create task groups" ON public.task_groups;
CREATE POLICY "Users can create task groups" ON public.task_groups
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own task groups" ON public.task_groups;
CREATE POLICY "Users can update their own task groups" ON public.task_groups
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete their own task groups" ON public.task_groups;
CREATE POLICY "Users can delete their own task groups" ON public.task_groups
  FOR DELETE USING (true);

-- 14. Create RLS policies for tasks
DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
CREATE POLICY "Users can view all tasks" ON public.tasks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Users can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
CREATE POLICY "Users can update tasks" ON public.tasks
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
CREATE POLICY "Users can delete tasks" ON public.tasks
  FOR DELETE USING (true);

-- 15. Create RLS policies for bill_shares
DROP POLICY IF EXISTS "Users can view their own bill shares" ON public.bill_shares;
CREATE POLICY "Users can view their own bill shares" ON public.bill_shares
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create bill shares" ON public.bill_shares;
CREATE POLICY "Users can create bill shares" ON public.bill_shares
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own bill shares" ON public.bill_shares;
CREATE POLICY "Users can update their own bill shares" ON public.bill_shares
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bill shares" ON public.bill_shares;
CREATE POLICY "Users can delete their own bill shares" ON public.bill_shares
  FOR DELETE USING (auth.uid() = user_id);

-- 16. Create RLS policies for allowlist (superadmin only)
DROP POLICY IF EXISTS "Superadmins can view allowlist" ON public.allowlist;
CREATE POLICY "Superadmins can view allowlist" ON public.allowlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can manage allowlist" ON public.allowlist;
CREATE POLICY "Superadmins can manage allowlist" ON public.allowlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

-- 17. Create RLS policies for join_requests (superadmin only for viewing/managing, anyone can create)
DROP POLICY IF EXISTS "Superadmins can view join requests" ON public.join_requests;
CREATE POLICY "Superadmins can view join requests" ON public.join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Anyone can create join requests" ON public.join_requests;
CREATE POLICY "Anyone can create join requests" ON public.join_requests
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Superadmins can manage join requests" ON public.join_requests;
CREATE POLICY "Superadmins can manage join requests" ON public.join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "Superadmins can delete join requests" ON public.join_requests;
CREATE POLICY "Superadmins can delete join requests" ON public.join_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'superadmin'
    )
  );
