import api from "./api";

class AuthService {
  /**
   * Registers a new user account.
   */
  async register(name, email, password) {
    const response = await api.post("/auth/register", { name, email, password });
    if (response.data?.success && response.data?.data?.token) {
      this.setSession(response.data.data.token, response.data.data.user);
    }
    return response.data;
  }

  /**
   * Logs in an existing user with credentials.
   */
  async login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    if (response.data?.success && response.data?.data?.token) {
      this.setSession(response.data.data.token, response.data.data.user);
    }
    return response.data;
  }

  /**
   * Retrieves current authenticated user profile from backend.
   */
  async getCurrentUser() {
    const response = await api.get("/auth/me");
    if (response.data?.success && response.data?.data?.user) {
      localStorage.setItem("user", JSON.stringify(response.data.data.user));
    }
    return response.data;
  }

  /**
   * Clears stored JWT token & user session.
   */
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  /**
   * Saves JWT token and user info in localStorage.
   */
  setSession(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }

  /**
   * Returns stored user object if available.
   */
  getStoredUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * Checks if user token exists.
   */
  isAuthenticated() {
    return !!localStorage.getItem("token");
  }
}

export default new AuthService();
