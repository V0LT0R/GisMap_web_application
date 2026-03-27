export type LoginRequest = {
  email: string;
  password: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
};

export type UserMe = {
  id: number;
  email: string;
  role: "super_admin" | "admin" | "user";
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
};

export type MessageResponse = {
  message: string;
};