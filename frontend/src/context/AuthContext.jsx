import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import authService from "../services/auth.service";
import { useUser } from "@clerk/react";

const AuthContext = createContext(null);
const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const ClerkAuthProvider = ({ children }) => {
  const { isSignedIn: clerkSignedIn, user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const [user, setUser] = useState(() => authService.getStoredUser());
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await authService.getCurrentUser();
          if (res.success && res.data.user) {
            setUser(res.data.user);
          }
        } catch (error) {
          console.warn("Token validation failed:", error.message || error);
          authService.logout();
          setToken(null);
          setUser(null);
        }
      }
      setLocalLoading(false);
    };
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await authService.register(name, email, password);
    if (res.success && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const effectiveClerkUser = clerkUser ? {
    id: clerkUser.id,
    name: clerkUser.fullName || clerkUser.firstName || clerkUser.username || "User",
    email: clerkUser.primaryEmailAddress?.emailAddress || ""
  } : null;

  const effectiveUser = user || effectiveClerkUser;
  const isAuthenticated = (!!token && !!user) || Boolean(clerkSignedIn);
  const loading = !clerkLoaded || (Boolean(token) && localLoading);

  const contextValue = useMemo(() => ({
    user: effectiveUser,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    logout
  }), [effectiveUser, token, loading, isAuthenticated]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

const StandardAuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getStoredUser());
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const res = await authService.getCurrentUser();
          if (res.success && res.data.user) {
            setUser(res.data.user);
          }
        } catch (error) {
          console.warn("Token validation failed:", error.message || error);
          authService.logout();
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res;
  };

  const register = async (name, email, password) => {
    const res = await authService.register(name, email, password);
    if (res.success && res.data.token) {
      setToken(res.data.token);
      setUser(res.data.user);
    }
    return res;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout
  }), [user, token, loading]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider = ({ children }) => {
  if (isClerkConfigured) {
    return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  }
  return <StandardAuthProvider>{children}</StandardAuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
