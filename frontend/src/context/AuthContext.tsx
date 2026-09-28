import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  getCurrentUser,
  login as loginRequest,
  register as registerRequest,
} from "../services/authService";

import type { TokenResponse, UserResponse } from "../types/api";

interface AuthContextValue {
  user: UserResponse | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<UserResponse>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function saveToken(token: TokenResponse): void {
  localStorage.setItem("offline_sync_token", token.access_token);
}

function saveUser(user: UserResponse): void {
  localStorage.setItem("offline_sync_user", JSON.stringify(user));
}

function clearSession(): void {
  localStorage.removeItem("offline_sync_token");
  localStorage.removeItem("offline_sync_user");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(() => {
    const storedUser = localStorage.getItem("offline_sync_user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as UserResponse;
    } catch {
      localStorage.removeItem("offline_sync_user");
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener("auth-expired", handleAuthExpired);

    const token = localStorage.getItem("offline_sync_token");

    if (!token) {
      setLoading(false);

      return () => {
        window.removeEventListener("auth-expired", handleAuthExpired);
      };
    }

    getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        saveUser(currentUser);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      window.removeEventListener("auth-expired", handleAuthExpired);
    };
  }, [logout]);

  const login = useCallback(
    async (username: string, password: string) => {
      /*
       * Step 1:
       * Authenticate and receive the JWT.
       */
      const token = await loginRequest(username, password);

      /*
       * Step 2:
       * Save the JWT BEFORE calling /me.
       *
       * Axios reads the token from localStorage and automatically
       * adds:
       *
       * Authorization: Bearer <token>
       */
      saveToken(token);

      try {
        /*
         * Step 3:
         * Fetch the authenticated user's profile.
         */
        const currentUser = await getCurrentUser();

        /*
         * Step 4:
         * Store the authenticated user.
         */
        saveUser(currentUser);
        setUser(currentUser);
      } catch (error) {
        /*
         * If /me fails, don't leave an invalid session behind.
         */
        clearSession();
        setUser(null);
        throw error;
      }
    },
    [],
  );

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
    ): Promise<UserResponse> => {
      return registerRequest({
        username,
        email,
        password,
      });
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      isAuthenticated: Boolean(user),
    }),
    [user, loading, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}