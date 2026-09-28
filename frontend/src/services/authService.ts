import api from "../api/axios";
import type { TokenResponse, UserResponse } from "../types/api";

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  const response = await api.post<TokenResponse>("/api/auth/login", body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return response.data;
}

export async function register(payload: RegisterPayload): Promise<UserResponse> {
  const response = await api.post<UserResponse>("/api/auth/register", payload);
  return response.data;
}

export async function getCurrentUser(): Promise<UserResponse> {
  const response = await api.get<UserResponse>("/api/auth/me");
  return response.data;
}
