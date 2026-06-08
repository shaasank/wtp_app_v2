-- Create Leaves Table
CREATE TABLE leaves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    type TEXT NOT NULL,
    duration TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'Pending' NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE NOT NULL,
    end_date DATE DEFAULT CURRENT_DATE NOT NULL,
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Leaves
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own leaves
CREATE POLICY "Users can insert their own leaves" 
ON leaves FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own leaves
CREATE POLICY "Users can view their own leaves" 
ON leaves FOR SELECT 
USING (auth.uid() = user_id);

-- Create Attendance Table
CREATE TABLE attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    category TEXT NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    date DATE DEFAULT CURRENT_DATE NOT NULL
);

-- Enable RLS for Attendance
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Allow users to insert their own attendance
CREATE POLICY "Users can insert their own attendance" 
ON attendance FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own attendance
CREATE POLICY "Users can view their own attendance" 
ON attendance FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to update their own attendance (for checkout)
CREATE POLICY "Users can update their own attendance" 
ON attendance FOR UPDATE
USING (auth.uid() = user_id);
