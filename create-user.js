const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLIC_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser() {
  console.log('Attempting to create user...');
  const { data, error } = await supabase.auth.signUp({
    email: 'test@wtp.com',
    password: 'test@1341',
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('User created successfully:', data.user?.email);
  }
}

createUser();
