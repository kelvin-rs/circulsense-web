import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pzjcyubngczbrmtnmzle.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_l4xeT_IohkUyzc781QJE_g_lzuhveUB';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  console.log('Testing Supabase connection...');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'testcirculsense@example.com',
      password: 'Password123!',
      options: {
        data: {
          nama_lengkap: 'Pengguna Uji Coba'
        }
      }
    });

    if (error) {
      console.log('SignUp Error:', error.message, error.status);
    } else {
      console.log('SignUp Success:', data.user?.id, 'Session exists:', !!data.session);
      if (!data.session) {
        console.log('NOTE: Email confirmation is required by Supabase!');
      }
    }

    // Try sign in
    const { data: signData, error: signError } = await supabase.auth.signInWithPassword({
      email: 'testcirculsense@example.com',
      password: 'Password123!'
    });

    if (signError) {
      console.log('SignIn Error:', signError.message, signError.status);
    } else {
      console.log('SignIn Success! User ID:', signData.user?.id);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

test();
