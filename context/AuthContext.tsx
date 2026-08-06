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
  user: UserSession | null;
  role: UserRole | null;
  managerId: number | null;
  ownerId: number | null;
  selectedHouseId: number | 'ALL';
  setSelectedHouseId: (houseId: number | 'ALL') => void;
  assignedHouseIds: number[];
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  initialized: boolean;
  siteUnlocked: boolean;
  sitePasscode: string;
  updateSitePasscode: (newPasscode: string) => void;
  unlockSite: (passcode: string) => boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// EXCLUSIVE SITE SECURITY PASSCODE (Layer 1 Gatekeeper)
const EXCLUSIVE_SITE_PASSCODE = 'lesvos#54#Mirina#81';

// EXCLUSIVE REGISTERED ACCOUNTS FOR USER LOGIN (Layer 2)
const REGISTERED_ACCOUNTS = [
  {
    email: 'winston@gmail.com',
    passwords: ['winston2026!'],
    role: 'OWNER' as UserRole,
    ownerId: 1,
    name: 'Κωνσταντίνος Σκινδήλιας (Ιδιοκτήτης)'
  },
  {
    email: 'alex@gmail.com',
    passwords: ['Alex2026!'],
    role: 'MANAGER' as UserRole,
    managerId: 1,
    name: 'Alex (Διαχειριστής)'
  }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [siteUnlocked, setSiteUnlocked] = useState<boolean>(false);
  const [customSitePasscode, setCustomSitePasscode] = useState<string>(EXCLUSIVE_SITE_PASSCODE);
  const [selectedHouseId, setSelectedHouseId] = useState<number | 'ALL'>('ALL');
  const [assignedHouseIds, setAssignedHouseIds] = useState<number[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Load saved session & theme on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedTheme = localStorage.getItem('vr_theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }

      const savedCustomPass = localStorage.getItem('vr_custom_site_passcode');
      if (savedCustomPass) {
        setCustomSitePasscode(savedCustomPass);
      }

      // Check Site Gatekeeper Status
      const savedSiteUnlock = sessionStorage.getItem('vr_site_unlocked');
      if (savedSiteUnlock === 'true') {
        setSiteUnlocked(true);
        document.cookie = "vr_site_unlocked=true; path=/; max-age=86400; SameSite=Lax";
      }

      const savedUser = localStorage.getItem('vr_session');
      if (savedUser) {
        const parsed = JSON.parse(savedUser) as UserSession;
        if (parsed && parsed.role) {
          setUser(parsed);
          loadAssignedHouses(parsed);
        }
      }
    } catch (e) {
      console.error('AuthProvider initialization error:', e);
    } finally {
      setInitialized(true);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vr_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Update site passcode dynamically
  const updateSitePasscode = (newPasscode: string) => {
    setCustomSitePasscode(newPasscode.trim());
    if (typeof window !== 'undefined') {
      localStorage.setItem('vr_custom_site_passcode', newPasscode.trim());
    }
  };

  // Layer 1: Unlock Site Protection Gatekeeper (Strict Exact Match)
  const unlockSite = (passcodeInput: string): boolean => {
    const cleanPass = passcodeInput.trim();
    
    if (cleanPass === customSitePasscode || cleanPass === EXCLUSIVE_SITE_PASSCODE) {
      setSiteUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vr_site_unlocked', 'true');
        document.cookie = "vr_site_unlocked=true; path=/; max-age=86400; SameSite=Lax";
      }
      return true;
    }
    return false;
  };

  async function loadAssignedHouses(session: UserSession) {
    try {
      if (session.role === 'MANAGER' && session.managerId) {
        const { data } = await supabase
          .from('manager_to_house')
          .select('f_house_aid')
          .eq('f_manager_aid', session.managerId);
        
        const houseIds = (data || []).map(item => item.f_house_aid);
        setAssignedHouseIds(houseIds.length > 0 ? houseIds : [1]);
      } else if (session.role === 'OWNER' && session.ownerId) {
        const { data } = await supabase
          .from('house_owners')
          .select('f_house_aid')
          .eq('f_owner_aid', session.ownerId);

        const houseIds = (data || []).map(item => item.f_house_aid);
        setAssignedHouseIds(houseIds.length > 0 ? houseIds : [1]);
      }
    } catch (err) {
      console.error('Error loading assigned houses:', err);
      setAssignedHouseIds([1]);
    }
  }

  // Layer 2: User Login (Strict Password Match)
  async function login(emailInput: string, passwordInput: string): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = emailInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Παρακαλώ συμπληρώστε email και κωδικό πρόσβασης' };
    }

    const account = REGISTERED_ACCOUNTS.find(a => a.email.toLowerCase() === cleanEmail);
    if (!account) {
      return { success: false, error: 'Δεν βρέθηκε εγγεγραμμένος λογαριασμός με αυτό το email' };
    }

    const isValidPass = account.passwords.some(p => p === cleanPassword);
    if (!isValidPass) {
      return { success: false, error: 'Λανθασμένος κωδικός πρόσβασης' };
    }

    let sessionUser: UserSession;

    if (account.role === 'MANAGER') {
      const mgrId = account.managerId || 1;
      const { data } = await supabase
        .from('managers')
        .select('*')
        .eq('manager_aid', mgrId)
        .single();

      sessionUser = {
        id: `mgr_${mgrId}`,
        name: data?.name || account.name,
        email: account.email,
        role: 'MANAGER',
        managerId: mgrId
      };
    } else {
      const ownId = account.ownerId || 1;
      const { data } = await supabase
        .from('owners')
        .select('*')
        .eq('owner_aid', ownId)
        .single();

      sessionUser = {
        id: `own_${ownId}`,
        name: data?.name || account.name,
        email: account.email,
        role: 'OWNER',
        ownerId: ownId
      };
    }

    setUser(sessionUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vr_session', JSON.stringify(sessionUser));
      document.cookie = "vr_session=true; path=/; max-age=86400; SameSite=Lax";
    }
    await loadAssignedHouses(sessionUser);
    return { success: true };
  }

  function logout() {
    setUser(null);
    setSelectedHouseId('ALL');
    setAssignedHouseIds([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vr_session');
      sessionStorage.removeItem('vr_site_unlocked');
      document.cookie = "vr_site_unlocked=; path=/; max-age=0";
      document.cookie = "vr_session=; path=/; max-age=0";
    }
    router.replace('/login');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        managerId: user?.managerId || null,
        ownerId: user?.ownerId || null,
        selectedHouseId,
        setSelectedHouseId,
        assignedHouseIds,
        theme,
        toggleTheme,
        initialized,
        siteUnlocked,
        sitePasscode: customSitePasscode,
        updateSitePasscode,
        unlockSite,
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
