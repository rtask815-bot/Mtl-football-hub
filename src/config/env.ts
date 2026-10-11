/**
 * Centralized Application Environment Configuration
 * Reads from Vite environment variables (VITE_*) with secure fallback defaults.
 */

export const SUPABASE_URL: string =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.REACT_APP_SUPABASE_URL)) ||
  "https://dfcgbwfralikyqxzxlbd.supabase.co";

export const SUPABASE_ANON_KEY: string =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.REACT_APP_SUPABASE_ANON_KEY)) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmY2did2ZyYWxpa3lxeHp4bGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTQwNDUsImV4cCI6MjA5OTEzMDA0NX0.EJM4uRCquMoWRj9VQI-fvfqLhnGM32WbZmipSjLdGA4";

export const GOOGLE_CSE_CX: string =
  (import.meta as any).env?.VITE_GOOGLE_CSE_CX ||
  "65b2a83b60ec643c9";

export const PROXY_API_BASE: string = "/api/proxy";
