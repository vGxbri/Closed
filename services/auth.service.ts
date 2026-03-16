import { supabase } from "../lib/supabase";
import { Profile } from "../types/database";

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp({ email, password, displayName }: SignUpCredentials) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in with email and password
   */
  async signIn({ email, password }: SignInCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Get the current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  /**
   * Get the current user
   */
  async getCurrentUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Get the current user's profile
   */
  async getCurrentProfile(): Promise<Profile | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update the current user's profile
   */
  async updateProfile(updates: Partial<Omit<Profile, "id" | "created_at">>) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Upload avatar image and return public URL
   */
  async uploadAvatar(uri: string): Promise<string> {
    const { decode } = await import("base64-arraybuffer");
    const FileSystem = await import("expo-file-system/legacy");

    const user = await this.getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = uri.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const contentType = fileExt === "png" ? "image/png" : "image/jpeg";

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });

    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, decode(base64), { contentType, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return data.publicUrl;
  },

  /**
   * Send password reset email
   */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  /**
   * Update password
   */
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
