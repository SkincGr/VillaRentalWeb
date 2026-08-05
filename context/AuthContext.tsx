'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export type UserRole = 'MANAGER' | 'OWNER';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  managerId?: number;
  ownerId?: number;
}

interface AuthContextType {
  user: UserSession;
  role: UserRole;
  managerId: number | null;
  ownerId: number | null;
  selectedHouseId: number | 'ALL';
  setSelectedHouseId: (houseId: number | 'ALL') => void;
  assignedHouseIds: number[];
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  initialized: boolean;
  login: (emailOrUsername: string, role: UserRole, targetId?: number) => Promise<boolean>;
  logout: () => void;
}

// Default fallback session for instant home loading (Alex Manager)
const DEFAULT_MANAGER_SESSION: UserSession = {
  id: 'mgr_1',
  name: 'Alex (Διαχειριστής)',
  email: 'alex@gmail.com',
  role: 'MANAGER',
  managerId: 1
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession>(DEFAULT_MANAGER_SESSION);
  const [selectedHouseId, setSelectedHouseId] = useState<number | 'ALL'>('ALL');
  const [assignedHouseIds, setAssignedHouseIds] = useState<number[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Load initial theme & session from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('vr_theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const savedUser = localStorage.getItem('vr_session');
    let sessionToUse = DEFAULT_MANAGER_SESSION;

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as UserSession;
        if (parsed && parsed.role) {
          sessionToUse = parsed;
        }
      } catch (e) {
        console.error('Error parsing session:', e);
      }
    } else {
      localStorage.setItem('vr_session', JSON.stringify(DEFAULT_MANAGER_SESSION));
    }

    setUser(sessionToUse);
    loadAssignedHouses(sessionToUse);
    setInitialized(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('vr_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  async function loadAssignedHouses(session: UserSession) {
    try {
      if (session.role === 'MANAGER' && session.managerId) {
        // Manager -> fetch houses assigned in manager_to_house table
        const { data } = await supabase
          .from('manager_to_house')
          .select('f_house_aid')
          .eq('f_manager_aid', session.managerId);
        
        const houseIds = (data || []).map(item => item.f_house_aid);
        setAssignedHouseIds(houseIds);
      } else if (session.role === 'OWNER' && session.ownerId) {
        // Owner -> fetch houses assigned in house_owners table
        const { data } = await supabase
          .from('house_owners')
          .select('f_house_aid')
          .eq('f_owner_aid', session.ownerId);

        const houseIds = (data || []).map(item => item.f_house_aid);
        setAssignedHouseIds(houseIds);
      }
    } catch (err) {
      console.error('Error loading assigned houses:', err);
    }
  }

  async function login(emailOrUsername: string, roleToSet: UserRole, targetId?: number): Promise<boolean> {
    let sessionUser: UserSession;

    if (roleToSet === 'MANAGER') {
      const mgrId = targetId || 1;
      const { data } = await supabase
        .from('managers')
        .select('*')
        .eq('manager_aid', mgrId)
        .single();

      sessionUser = {
        id: `mgr_${mgrId}`,
        name: data?.name || 'Alex (Διαχειριστής)',
        email: data?.email?.trim() || 'alex@gmail.com',
        role: 'MANAGER',
        managerId: mgrId
      };
    } else {
      const ownId = targetId || 1;
      const { data } = await supabase
        .from('owners')
        .select('*')
        .eq('owner_aid', ownId)
        .single();

      sessionUser = {
        id: `own_${ownId}`,
        name: data?.name || 'Κωνσταντίνος Σκινδήλιας (Ιδιοκτήτης)',
        email: data?.email?.trim() || 'skinkon@gmail.com',
        role: 'OWNER',
        ownerId: ownId
      };
    }

    setUser(sessionUser);
    localStorage.setItem('vr_session', JSON.stringify(sessionUser));
    await loadAssignedHouses(sessionUser);
    return true;
  }

  function logout() {
    setUser(DEFAULT_MANAGER_SESSION);
    setSelectedHouseId('ALL');
    setAssignedHouseIds([]);
    localStorage.removeItem('vr_session');
    router.replace('/login');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user.role,
        managerId: user.managerId || null,
        ownerId: user.ownerId || null,
        selectedHouseId,
        setSelectedHouseId,
        assignedHouseIds,
        theme,
        toggleTheme,
        initialized,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
