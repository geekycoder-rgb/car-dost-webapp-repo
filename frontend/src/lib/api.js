import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cardost_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export const resolveImg = (url) => (url && url.startsWith("/api/") ? `${BACKEND_URL}${url}` : url);
