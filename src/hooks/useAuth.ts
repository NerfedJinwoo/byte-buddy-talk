import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Update online status when user signs in/out
        if (session?.user && event === 'SIGNED_IN') {
          setTimeout(() => {
            updateUserStatus(session.user.id, true);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          // Will be handled by signOut function
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Set user as online if they have an active session
      if (session?.user) {
        setTimeout(() => {
          updateUserStatus(session.user.id, true);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateUserStatus = async (userId: string, isOnline: boolean) => {
    try {
      const { error } = await supabase.rpc('update_user_status', {
        user_uuid: userId,
        online_status: isOnline
      });
      if (error) console.error('Error updating user status:', error);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const signOut = async () => {
    // Set user as offline before signing out
    if (user) {
      await updateUserStatus(user.id, false);
    }
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
};