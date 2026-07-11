import React, { createContext, useEffect, useState, useContext } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch profile if user exists
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Fetch profile if user exists
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      setProfile(existingProfile);
      return;
    }

    // No profile row yet — create one (handles Google OAuth and any edge case)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const email = authUser.email ?? '';
    const defaultName =
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      email.split('@')[0] ||
      'User';
    const avatarUrl =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      null;

    const { data: newProfile } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        display_name: defaultName,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (newProfile) setProfile(newProfile);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, profile, refreshProfile, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for convenient context access
export const useAuth = () => useContext(AuthContext);
