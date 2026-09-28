import api from "../api/axios";
import type {
  UserProfileResponse,
  UserProfileUpdate,
} from "../types/api";

export async function getMyProfile(): Promise<UserProfileResponse> {
  const response = await api.get<UserProfileResponse>(
    "/api/users/me",
  );

  return response.data;
}

export async function updateMyProfile(
  payload: UserProfileUpdate,
): Promise<UserProfileResponse> {
  const response = await api.put<UserProfileResponse>(
    "/api/users/me",
    payload,
  );

  return response.data;
}