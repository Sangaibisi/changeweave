import { ApiResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

class ApiClient {
  private accessToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  setToken(token: string | null) {
    this.accessToken = token;
  }

  getToken(): string | null {
    if (this.accessToken) return this.accessToken;
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return null;
  }

  private forceLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      this.accessToken = null;
      window.location.href = "/login";
    }
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // Prevent concurrent refresh requests
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return false;

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) return false;

        const data = await res.json();
        const newAccessToken = data.data?.accessToken ?? data.accessToken;
        const newRefreshToken = data.data?.refreshToken ?? data.refreshToken;

        if (newAccessToken) {
          localStorage.setItem("accessToken", newAccessToken);
          if (newRefreshToken) localStorage.setItem("refreshToken", newRefreshToken);
          this.accessToken = newAccessToken;
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401: try refresh, then retry once
    if (response.status === 401 && !isRetry && !endpoint.startsWith("/auth/")) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options, true);
      }
      this.forceLogout();
      throw new ApiError("Session expired", "UNAUTHORIZED", 401);
    }

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        this.forceLogout();
      }
      throw new ApiError(
        data.error?.message || "An error occurred",
        data.error?.code || "UNKNOWN",
        response.status
      );
    }

    return data;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const api = new ApiClient();
