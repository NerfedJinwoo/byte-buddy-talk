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
        
        // Update online status when auth state changes
        if (session?.user) {
          setTimeout(() => {
            updateOnlineStatus(session.user.id, true);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        updateOnlineStatus(session.user.id, true);
      }
    });

    // Update online status when page becomes visible/hidden
    const handleVisibilityChange = () => {
      if (user) {
        updateOnlineStatus(user.id, !document.hidden);
      }
    };

    // Update online status before page unload
    const handleBeforeUnload = () => {
      if (user) {
        navigator.sendBeacon('/api/offline', JSON.stringify({ userId: user.id }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const updateOnlineStatus = async (userId: string, isOnline: boolean) => {
    await supabase.rpc('update_user_status', {
      user_uuid: userId,
      online_status: isOnline
    });
  };

  const signOut = async () => {
    if (user) {
      await updateOnlineStatus(user.id, false);
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