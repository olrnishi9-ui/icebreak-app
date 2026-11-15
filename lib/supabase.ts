"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let client: SupabaseClient | undefined;
export function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error(
      "Email sign-in is not configured. Ask your event organiser to try again later.",
    );
  return (client ??= createClient(url, key)); // SDK alone owns access/refresh token persistence.
}
export async function requireAccount() {
  const { data, error } = await supabase().auth.getSession();
  if (error) throw error;
  if (!data.session || data.session.user.is_anonymous)
    throw new Error("Sign in with your email code to continue.");
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const { data, error } = await supabase().auth.getSession();
  if (error) throw error;
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(data.session
        ? { Authorization: `Bearer ${data.session.access_token}` }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not save. Please try again.");
  return result;
}
