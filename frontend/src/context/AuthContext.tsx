
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { AuthUser, LoginRequest } from "../types/auth";
import * as authService from "../services/authService";

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading] = useState(false);

  async function handleLogin(credentials: LoginRequest): Promise<void> {
    const response = await authService.login(credentials);

    setUser({
      role: response.role,
      user_id: response.user_id,
      full_name: response.full_name,
    });
  }

  function handleLogout(): void {
    authService.logout();
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
