/**
 * What the recorder screens depend on, in one place: the signed-in client,
 * the capture engine and the clock. The app uses the real ones; a preview or
 * a browser test wraps the screens in <RecorderDepsProvider> with stand-ins.
 */
import { createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { browserEngine, type EngineApi } from "./engine";

export interface RecorderDeps {
  client: any;
  engine: EngineApi;
  now: () => number;
}

const Ctx = createContext<RecorderDeps>({ client: supabase, engine: browserEngine, now: () => Date.now() });

export function RecorderDepsProvider({ value, children }: { value: Partial<RecorderDeps>; children: ReactNode }) {
  const base = useContext(Ctx);
  return <Ctx.Provider value={{ ...base, ...value }}>{children}</Ctx.Provider>;
}

export const useRecorderDeps = () => useContext(Ctx);
