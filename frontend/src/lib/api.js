import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ 
  baseURL: API,
  withCredentials: true, // Send cookies with every request
});

api.interceptors.request.use((config) => {
  // Add CSRF token from localStorage if available (for state-changing requests)
  const csrfToken = localStorage.getItem("csrf_token");
  if (csrfToken && ["post", "put", "patch", "delete"].includes(config.method)) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

export const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export const resolveImg = (url) => (url && url.startsWith("/api/") ? `${BACKEND_URL}${url}` : url);
