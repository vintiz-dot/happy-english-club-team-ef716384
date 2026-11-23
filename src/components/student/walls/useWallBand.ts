import { useAgeBand } from "@/hooks/useAgeBand";

/** The band as the wall pages need it. The band's name is never shown to a child. */
export function useWallBand() {
  const { band } = useAgeBand();
  return { band, kid: band === "early" || band === "young", teen: band === "teen" };
}
