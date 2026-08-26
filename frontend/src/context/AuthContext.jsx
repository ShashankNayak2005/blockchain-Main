import React, { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/auth.service";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout
      }}
    >
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
