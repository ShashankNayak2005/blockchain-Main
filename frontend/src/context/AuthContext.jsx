import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import authService from "../services/auth.service";
import { useUser } from "@clerk/react";

const AuthContext = createContext(null);
const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

const ClerkAuthBridge = ({ children, setClerkAuthState }) => {
  const { isSignedIn, user: clerkUser, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    setClerkAuthState({
      isSignedIn: Boolean(isSignedIn),
      clerkUser: clerkUser ? {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || clerkUser.username || "User",
        email: clerkUser.primaryEmailAddress?.emailAddress || ""
      } : null,
      isLoaded: true
    });
  }, [
    isSignedIn,
    clerkUser?.id,
    clerkUser?.fullName,
    clerkUser?.primaryEmailAddress?.emailAddress,
    isLoaded,
    setClerkAuthState
  ]);

  return children;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getStoredUser());
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);
  const [clerkAuth, setClerkAuth] = useState({
    isSignedIn: false,
    clerkUser: null,
    isLoaded: !isClerkConfigured
  });

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
          logout();
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

  const effectiveUser = user || clerkAuth.clerkUser;
  const isAuthenticated = (!!token && !!user) || clerkAuth.isSignedIn;
  const effectiveLoading = loading || (isClerkConfigured && !clerkAuth.isLoaded);

  const contextValue = useMemo(() => ({
    user: effectiveUser,
    token,
    loading: effectiveLoading,
    isAuthenticated,
    login,
    register,
    logout
  }), [effectiveUser, token, effectiveLoading, isAuthenticated]);

  if (isClerkConfigured) {
    return (
      <ClerkAuthBridge setClerkAuthState={setClerkAuth}>
        <AuthContext.Provider value={contextValue}>
          {children}
        </AuthContext.Provider>
      </ClerkAuthBridge>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
