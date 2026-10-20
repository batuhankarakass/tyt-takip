import { createContext, useContext } from "react";
import type { KayitTaslak } from "../components/KayitFormu";

export type SekmeAd = "bugun" | "kayitlar" | "konular" | "deneme" | "sayac" | "analiz" | "ayarlar";

export interface Gezinti {
  sekme: SekmeAd;
  git: (s: SekmeAd) => void;
  kayitAc: (t?: KayitTaslak) => void;
  sayacAc: (ders?: string, konu?: string) => void;
}

export const GezintiCtx = createContext<Gezinti | null>(null);

export function useGezinti() {
  const g = useContext(GezintiCtx);
  if (!g) throw new Error("GezintiCtx yok");
  return g;
}
