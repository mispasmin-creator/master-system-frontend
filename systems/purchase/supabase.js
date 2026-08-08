import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Supabase is used by the frontend for ONE thing only: file/image uploads via
// Supabase Storage. Every other connection — data queries (.from()/.rpc()) and
// realtime (.channel()) — is intentionally stubbed out so the frontend never
// talks to Supabase for data; that all goes through the backend API
// (NEXT_PUBLIC_API_URL).

const realClient =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// No-op query builder: stays chainable (.select/.eq/.in/.not/.order/.insert/
// .update/...) and resolves to an empty result instead of hitting Supabase.
const makeQuery = () => {
  const result = Promise.resolve({ data: [], error: null });
  return new Proxy(result, {
    get(target, prop) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        return target[prop].bind(target);
      }
      return () => makeQuery();
    },
  });
};

// No-op realtime channel.
const makeChannel = () => {
  const channel = {
    on: () => makeChannel(),
    subscribe: (cb) => {
      if (typeof cb === "function") cb("CLOSED");
      return channel;
    },
    unsubscribe: () => {},
  };
  return channel;
};

const storageUnavailable = {
  from: () => ({
    upload: async () => ({
      data: null,
      error: {
        message:
          "Supabase Storage unavailable — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env for image uploads.",
      },
    }),
    getPublicUrl: () => ({ data: { publicUrl: "" } }),
    remove: async () => ({ data: null, error: null }),
  }),
};

export const supabase = {
  // The ONLY live Supabase connection — file/image uploads.
  storage: realClient ? realClient.storage : storageUnavailable,
  // Everything else is a no-op (data + realtime go through the backend).
  from: () => makeQuery(),
  rpc: () => makeQuery(),
  channel: () => makeChannel(),
  removeChannel: () => {},
};
