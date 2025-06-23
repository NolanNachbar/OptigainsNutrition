// Supabase client with Clerk authentication
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useAuth, useSession } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

// Create a Supabase client without auth for initial setup
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Hook to get Supabase client with Clerk auth
export function useSupabaseClient() {
  const { getToken } = useAuth();
  const { session } = useSession();
  const [client, setClient] = useState<SupabaseClient>(supabase);

  useEffect(() => {
    const setupClient = async () => {
      if (session) {
        try {
          // Get the Clerk JWT token using the 'supabase' template
          const token = await getToken({ template: 'supabase' });
          
          if (token) {
            // Create a new Supabase client with the Clerk token
            const supabaseWithAuth = createClient(
              supabaseUrl!,
              supabaseAnonKey!,
              {
                global: {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
                auth: {
                  persistSession: false,
                },
              }
            );
            setClient(supabaseWithAuth);
          }
        } catch (error) {
          console.error('Error setting up Supabase client with Clerk token:', error);
          // Fall back to anon client
          setClient(supabase);
        }
      }
    };

    setupClient();
  }, [getToken, session]);

  return client;
}

// For non-React contexts, get token first then create client
export async function getAuthenticatedSupabaseClient(getToken: () => Promise<string | null>) {
  try {
    const token = await getToken();
    
    if (!token) {
      console.warn('No Clerk token available, using anonymous Supabase client');
      return supabase;
    }

    return createClient(
      supabaseUrl!,
      supabaseAnonKey!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
        },
      }
    );
  } catch (error) {
    console.error('Error creating authenticated Supabase client:', error);
    return supabase;
  }
}