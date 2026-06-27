declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(
    url: string,
    key: string,
    options?: {
      global?: {
        headers?: Record<string, string>;
      };
    }
  ): unknown;
}
