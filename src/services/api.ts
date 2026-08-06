import axios from "axios";
import env from "../config/env";
import { useAuthStore } from "../store/authStore";

const apiClient = axios.create({
  baseURL: env.API_BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const authAPI = {
  login: (data: { email: string; password: string }) =>
    apiClient.post("/auth/login", data),
  googleAuth: (token: string, role?: string) =>
    apiClient.post("/auth/google", { token, role }),
  forgotPassword: (email: string) =>
    apiClient.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    apiClient.post(`/auth/reset-password/${token}`, { password }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post("/auth/change-password", data),
};
