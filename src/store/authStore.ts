import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Employee, WorkCategory } from '../types';

interface AuthState {
  session: Session | null;
  user: Employee | null;
  selectedCategory: WorkCategory | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: Employee | null) => void;
  refreshUser: () => Promise<void>;
  setSelectedCategory: (category: WorkCategory) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  selectedCategory: null,
  isLoading: true,
  setSession: (session) => set({ session, isLoading: false }),
  setUser: (user) => set({ user }),
  refreshUser: async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser?.id) {
      set({ user: null });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!error && data) {
      set({ user: data as Employee });
    }
  },
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Sign out error:', error);
      // Still clear local state even if remote sign out fails
    }
    set({ session: null, user: null, selectedCategory: null, isLoading: false });
  },
}));
