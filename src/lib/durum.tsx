import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { bulutDepo, supabase, yerelDepo, yerelOku, yeniId, type Depo } from "./depo";
import { konuOzetleri } from "./hesap";
import { BOS_VERI, type Ayarlar, type Deneme, type Kayit, type KonuOzet, type Odak, type Veri } from "./types";

interface Baglam {
  veri: Veri;
  ozetler: KonuOzet[];
  yukleniyor: boolean;
  depo: Depo["ad"];
  oturum: Session | null;
  hata: string | null;
  bildirim: string | null;
  bildir: (m: string) => void;
  hataTemizle: () => void;
  kayitKaydet: (k: Omit<Kayit, "id" | "olusturma"> & Partial<Pick<Kayit, "id" | "olusturma">>) => Promise<void>;
  kayitSil: (id: string) => Promise<void>;
  denemeKaydet: (d: Omit<Deneme, "id" | "olusturma"> & Partial<Pick<Deneme, "id" | "olusturma">>) => Promise<void>;
  denemeSil: (id: string) => Promise<void>;
  odakEkle: (o: Omit<Odak, "id">) => Promise<void>;
  ayarGuncelle: (a: Partial<Ayarlar>) => Promise<void>;
  topluEkle: (v: Partial<Pick<Veri, "kayitlar" | "denemeler" | "odaklar">>) => Promise<void>;
  hepsiniDegistir: (v: Veri) => Promise<void>;
  cihazVerisiniBulutaAktar: () => Promise<number>;
  cikis: () => Promise<void>;
}

const Ctx = createContext<Baglam | null>(null);

export function VeriSaglayici({ children }: { children: ReactNode }) {
  const [oturum, setOturum] = useState<Session | null>(null);
  const [oturumHazir, setOturumHazir] = useState(!supabase);
  const [veri, setVeri] = useState<Veri>(() => yerelOku());
  const [yukleniyor, setYukleniyor] = useState(!!supabase);
  const [hata, setHata] = useState<string | null>(null);
  const [bildirim, setBildirim] = useState<string | null>(null);
  const depoRef = useRef<Depo>(null as unknown as Depo);
  if (!depoRef.current) depoRef.current = yerelDepo();
  const bildirimZamani = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setOturum(data.session);
      setOturumHazir(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setOturum(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const kullaniciId = oturum?.user.id;
  useEffect(() => {
    if (!oturumHazir) return;
    const depo = supabase && oturum ? bulutDepo(supabase, oturum.user) : yerelDepo();
    depoRef.current = depo;
    setYukleniyor(true);
    depo
      .yukle()
      .then(setVeri)
      .catch((e: Error) => setHata(`Veriler yüklenemedi: ${e.message}`))
      .finally(() => setYukleniyor(false));
    // oturum nesnesi token yenilendikçe değişir; sadece kullanıcı değişince yeniden yükle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oturumHazir, kullaniciId]);

  const bildir = useCallback((m: string) => {
    setBildirim(m);
    window.clearTimeout(bildirimZamani.current);
    bildirimZamani.current = window.setTimeout(() => setBildirim(null), 2600);
  }, []);

  // İyimser güncelleme: ekran hemen değişir, depo hata verirse eski hale döner.
  const uygula = useCallback(async (yeni: (v: Veri) => Veri, is: (d: Depo) => Promise<void>) => {
    let onceki: Veri = BOS_VERI;
    setVeri((v) => {
      onceki = v;
      return yeni(v);
    });
    try {
      await is(depoRef.current);
    } catch (e) {
      setVeri(onceki);
      setHata(`Kaydedilemedi: ${(e as Error).message}. İnternet bağlantını kontrol et.`);
      throw e;
    }
  }, []);

  const degistir = <T extends { id: string }>(liste: T[], s: T) =>
    liste.some((x) => x.id === s.id) ? liste.map((x) => (x.id === s.id ? s : x)) : [...liste, s];

  const deger = useMemo<Baglam>(() => {
    const ozetler = konuOzetleri(veri.ayarlar, veri.kayitlar);
    return {
      veri,
      ozetler,
      yukleniyor,
      depo: depoRef.current.ad,
      oturum,
      hata,
      bildirim,
      bildir,
      hataTemizle: () => setHata(null),
      kayitKaydet: async (k) => {
        const s: Kayit = { ...k, id: k.id ?? yeniId(), olusturma: k.olusturma ?? new Date().toISOString() };
        await uygula((v) => ({ ...v, kayitlar: degistir(v.kayitlar, s) }), (d) => d.kaydet("kayit", s));
      },
      kayitSil: (id) => uygula((v) => ({ ...v, kayitlar: v.kayitlar.filter((x) => x.id !== id) }), (d) => d.sil("kayit", id)),
      denemeKaydet: async (k) => {
        const s: Deneme = { ...k, id: k.id ?? yeniId(), olusturma: k.olusturma ?? new Date().toISOString() };
        await uygula((v) => ({ ...v, denemeler: degistir(v.denemeler, s) }), (d) => d.kaydet("deneme", s));
      },
      denemeSil: (id) => uygula((v) => ({ ...v, denemeler: v.denemeler.filter((x) => x.id !== id) }), (d) => d.sil("deneme", id)),
      odakEkle: async (o) => {
        const s: Odak = { ...o, id: yeniId() };
        await uygula((v) => ({ ...v, odaklar: [...v.odaklar, s] }), (d) => d.kaydet("odak", s));
      },
      ayarGuncelle: async (a) => {
        const yeni = { ...veri.ayarlar, ...a };
        await uygula((v) => ({ ...v, ayarlar: yeni }), (d) => d.ayarKaydet(yeni));
      },
      topluEkle: async (ek) => {
        const yeni: Veri = {
          ...veri,
          kayitlar: [...veri.kayitlar, ...(ek.kayitlar ?? [])],
          denemeler: [...veri.denemeler, ...(ek.denemeler ?? [])],
          odaklar: [...veri.odaklar, ...(ek.odaklar ?? [])],
        };
        const sadeceEk: Veri = { kayitlar: ek.kayitlar ?? [], denemeler: ek.denemeler ?? [], odaklar: ek.odaklar ?? [], ayarlar: veri.ayarlar };
        await uygula(() => yeni, (d) => (d.ad === "bulut" ? d.topluYaz(sadeceEk) : d.topluYaz(yeni)));
      },
      hepsiniDegistir: async (v) => {
        const d = depoRef.current;
        if (d.ad === "bulut") {
          // Bulutta tam değiştirme: önce eski satırları sil.
          await Promise.all([
            ...veri.kayitlar.map((x) => d.sil("kayit", x.id)),
            ...veri.denemeler.map((x) => d.sil("deneme", x.id)),
            ...veri.odaklar.map((x) => d.sil("odak", x.id)),
          ]);
        }
        await uygula(() => v, (dd) => dd.topluYaz(v));
      },
      cihazVerisiniBulutaAktar: async () => {
        const yerel = yerelOku();
        const varOlan = new Set([...veri.kayitlar, ...veri.denemeler, ...veri.odaklar].map((x) => x.id));
        const ek = {
          kayitlar: yerel.kayitlar.filter((x) => !varOlan.has(x.id)),
          denemeler: yerel.denemeler.filter((x) => !varOlan.has(x.id)),
          odaklar: yerel.odaklar.filter((x) => !varOlan.has(x.id)),
        };
        const n = ek.kayitlar.length + ek.denemeler.length + ek.odaklar.length;
        if (n) await deger.topluEkle(ek);
        return n;
      },
      cikis: async () => {
        await supabase?.auth.signOut();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [veri, yukleniyor, oturum, hata, bildirim]);

  return <Ctx.Provider value={deger}>{children}</Ctx.Provider>;
}

export function useVeri() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useVeri VeriSaglayici içinde kullanılmalı");
  return c;
}
