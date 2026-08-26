import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  },
  timeout: 30000 // 30 second request timeout
});

// Request interceptor: Attach JWT authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Global Error Normalizer (401, 403, 404, 413, 500, Network Error)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network failure or backend server unreachable
      return Promise.reject({
        status: 0,
        message: "Network Error: Cannot connect to backend server at " + API_BASE_URL + ". Is the server running?"
      });
    }

    const { status, data } = error.response;
    let customMessage = data?.error?.message || data?.message;

    switch (status) {
      case 401:
        customMessage = customMessage || "Session expired or unauthorized. Please log in again.";
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (
          window.location.pathname !== "/login" &&
          window.location.pathname !== "/register" &&
          window.location.pathname !== "/"
        ) {
          window.location.href = "/login?expired=true";
        }
        break;

      case 403:
        customMessage = customMessage || "Access denied: You do not have permission to perform this action.";
        break;

      case 404:
        customMessage = customMessage || "Requested resource or file record was not found.";
        break;

      case 413:
        customMessage = customMessage || "Payload too large: Uploaded file exceeds maximum allowed limit (50MB).";
        break;

      case 500:
        customMessage = customMessage || "Internal Server Error: Something went wrong on the backend.";
        break;

      default:
        customMessage = customMessage || `Request failed with status code ${status}.`;
        break;
    }

    return Promise.reject({
      status,
      message: customMessage,
      code: data?.error?.code,
      data
    });
  }
);

export default api;
