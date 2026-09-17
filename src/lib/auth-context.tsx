'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/circulsense';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, metadata: { nama_lengkap: string }) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfile>) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_COOKIE_NAME = 'circulsense_auth_token';

function formatAuthError(errMessage: string): string {
  const msg = errMessage.toLowerCase();
  if (msg.includes('email not confirmed')) {
    return 'Email Anda belum dikonfirmasi. Silakan matikan opsi "Confirm email" di Dashboard Supabase agar pendaftaran bisa langsung masuk tanpa batas.';
  }
  if (msg.includes('invalid login credentials')) {
    return 'Email atau kata sandi tidak valid. Pastikan akun sudah terdaftar.';
  }
  if (msg.includes('user already registered')) {
    return 'Email ini sudah terdaftar. Silakan masuk menggunakan kata sandi Anda.';
  }
  return errMessage;
}

function setAuthCookie(token?: string) {
  if (typeof document !== 'undefined' && token) {
    document.cookie = `${AUTH_COOKIE_NAME}=${token}; path=/; max-age=604800; SameSite=Lax`;
    document.cookie = `sb-access-token=${token}; path=/; max-age=604800; SameSite=Lax`;
  }
}

function removeAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax`;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch full user profile from public.pengguna (dengan auto-sync jika belum ada di database)
  const loadUserProfile = useCallback(async (authUser: SupabaseUser) => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('pengguna')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as UserProfile);
      } else {
        // Data belum ada di tabel pengguna -> Otomatis sinkronkan & simpan ke tabel pengguna
        const meta = authUser.user_metadata || {};
        const fallbackProfile: UserProfile = {
          id: authUser.id,
          email: authUser.email || '',
          nama_lengkap: meta.nama_lengkap || meta.full_name || authUser.email?.split('@')[0] || 'Pengguna CirculSense',
          peran: meta.peran || 'Pengguna / Peneliti',
          foto_profil_url: meta.foto_profil_url
        };

        // Simpan langsung ke tabel public.pengguna agar relasi foreign key tabel lain berjalan
        const { data: syncedData, error: upsertError } = await supabase
          .from('pengguna')
          .upsert(
            {
              id: fallbackProfile.id,
              email: fallbackProfile.email,
              nama_lengkap: fallbackProfile.nama_lengkap,
              peran: fallbackProfile.peran,
              foto_profil_url: fallbackProfile.foto_profil_url,
              diperbarui_pada: new Date().toISOString()
            },
            { onConflict: 'id' }
          )
          .select()
          .maybeSingle();

        if (!upsertError && syncedData) {
          setProfile(syncedData as UserProfile);
        } else {
          setProfile(fallbackProfile);
        }
      }
    } catch (e) {
      console.warn('Failed to load/sync user profile to public.pengguna:', e);
    }
  }, []);

  // Initialize and listen to Supabase Auth State
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            setUser(session.user);
            setAuthCookie(session.access_token);
            await loadUserProfile(session.user);
          } else if (isMounted) {
            setUser(null);
            setProfile(null);
            removeAuthCookie();
          }
        } catch (e) {
          console.warn('Auth initialization error:', e);
        }
      }
      if (isMounted) setIsLoading(false);
    }

    initAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          setAuthCookie(session.access_token);
          await loadUserProfile(session.user);
        } else {
          setUser(null);
          setProfile(null);
          removeAuthCookie();
        }
        setIsLoading(false);
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }
  }, [loadUserProfile]);

  // Sign In with Supabase
  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    if (!supabase) {
      return { error: 'Koneksi Supabase belum terkonfigurasi pada .env.local' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        return { error: formatAuthError(error.message) };
      }

      if (data.session) {
        setUser(data.user);
        setAuthCookie(data.session.access_token);
        if (data.user) {
          loadUserProfile(data.user).catch((e) => console.warn('Profile load deferred:', e));
        }
      }

      return {};
    } catch (err: any) {
      return { error: formatAuthError(err?.message || 'Terjadi kesalahan saat masuk') };
    }
  };

  // Sign Up with Supabase (Pendaftaran Instan & Langsung Masuk)
  const signUp = async (
    email: string,
    password: string,
    metadata: { nama_lengkap: string }
  ): Promise<{ error?: string }> => {
    if (!supabase) {
      return { error: 'Koneksi Supabase belum terkonfigurasi pada .env.local' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            nama_lengkap: metadata.nama_lengkap,
            peran: 'Pengguna / Peneliti'
          }
        }
      });

      if (error) {
        return { error: formatAuthError(error.message) };
      }

      if (data.session) {
        setUser(data.user);
        setAuthCookie(data.session.access_token);
        if (data.user) {
          loadUserProfile(data.user).catch((e) => console.warn('Profile load deferred:', e));
        }
      } else if (data.user) {
        // Coba login otomatis jika session belum langsung terlampir
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (!signInErr && signInData.session) {
          setUser(signInData.user);
          setAuthCookie(signInData.session.access_token);
          if (signInData.user) {
            loadUserProfile(signInData.user).catch((e) => console.warn('Profile load deferred:', e));
          }
        }
      }

      return {};
    } catch (err: any) {
      return { error: formatAuthError(err?.message || 'Terjadi kesalahan saat mendaftar') };
    }
  };

  // Sign Out
  const signOut = async (): Promise<void> => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    setUser(null);
    setProfile(null);
    removeAuthCookie();
  };

  // Update Profile
  const updateProfile = async (updated: Partial<UserProfile>): Promise<{ error?: string }> => {
    if (!user || !supabase) return { error: 'Pengguna belum terautentikasi' };

    try {
      const payload = {
        ...updated,
        diperbarui_pada: new Date().toISOString()
      };

      const { error } = await supabase
        .from('pengguna')
        .upsert({ id: user.id, email: user.email, ...payload });

      if (error) {
        return { error: error.message };
      }

      setProfile((prev) => (prev ? { ...prev, ...updated } : null));
      return {};
    } catch (err: any) {
      return { error: err?.message || 'Gagal memperbarui data profil' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
