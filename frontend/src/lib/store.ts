import { create } from "zustand";
import { User } from "./types";
import { api } from "./api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/auth/login", { email, password });

    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    api.setToken(res.data.accessToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  register: async (name, email, password) => {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>("/auth/register", { name, email, password });

    localStorage.setItem("accessToken", res.data.accessToken);
    localStorage.setItem("refreshToken", res.data.refreshToken);
    api.setToken(res.data.accessToken);
    set({ user: res.data.user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      api.setToken(token);
      const res = await api.get<User>("/auth/me");
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
