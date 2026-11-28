
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { AuthUser, LoginRequest } from "../types/auth";
import * as authService from "../services/authService";

const USER_KEY = "apartmentcare_user";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function getStoredUser(): AuthUser | null {
  try {
    const storedUser = sessionStorage.getItem(USER_KEY);

    if (!storedUser) return null;

    const user = JSON.parse(storedUser) as AuthUser;

    if (
      !["admin", "building_manager", "resident"].includes(user.role) ||
      !user.user_id ||
      !user.full_name
    ) {
      sessionStorage.removeItem(USER_KEY);
      return null;
    }

    // Support users stored by an older version of ApartmentCare.
    if (typeof user.is_super_admin !== "boolean") {
      user.is_super_admin = false;
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    return user;
  } catch {
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [isLoading] = useState(false);

  async function handleLogin(credentials: LoginRequest): Promise<void> {
    const response = await authService.login(credentials);

    const loggedInUser: AuthUser = {
      role: response.role,
      user_id: response.user_id,
      full_name: response.full_name,
      is_super_admin: response.is_super_admin,
    };

    sessionStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  }

  function handleLogout(): void {
    authService.logout();
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
