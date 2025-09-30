import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile after auth state change
          setTimeout(async () => {
            try {
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
              } else {
                setProfile(profileData);
              }
            } catch (error) {
              console.error('Error in profile fetch:', error);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      
      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Sign In Failed",
        description: message,
        variant: "destructive",
      });
      return { error: { message } };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, role: 'conductor' | 'passenger' = 'passenger') => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });
      
      if (error) {
        toast({
          title: "Sign Up Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      
      toast({
        title: "Account Created!",
        description: "You have successfully created your account.",
      });
      
      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Sign Up Failed",
        description: message,
        variant: "destructive",
      });
      return { error: { message } };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast({
          title: "Sign Out Failed",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }
      
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      
      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Sign Out Failed",
        description: message,
        variant: "destructive",
      });
      return { error: { message } };
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
    isConductor: profile?.role === 'conductor',
    isAdmin: profile?.role === 'admin',
    isPassenger: profile?.role === 'passenger',
  };
};