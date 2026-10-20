import { useState } from "react";
import { supabase } from "../lib/depo";

export function Giris({ misafir }: { misafir: () => void }) {
  const [eposta, setEposta] = useState("");
  const [sifre, setSifre] = useState("");
  const [mod, setMod] = useState<"giris" | "kayit" | "baglanti">("giris");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekle, setBekle] = useState(false);

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setHata(null);
    setMesaj(null);
    setBekle(true);
    const yonlendir = window.location.origin + window.location.pathname;
    const sonuc =
      mod === "baglanti"
        ? await supabase.auth.signInWithOtp({ email: eposta, options: { emailRedirectTo: yonlendir } })
        : mod === "kayit"
          ? await supabase.auth.signUp({ email: eposta, password: sifre, options: { emailRedirectTo: yonlendir } })
          : await supabase.auth.signInWithPassword({ email: eposta, password: sifre });
    setBekle(false);
    if (sonuc.error) return setHata(Turkcele(sonuc.error.message));
    if (mod === "baglanti") setMesaj("Giriş bağlantısı e-postana gönderildi. Bağlantıya bu cihazda tıkla.");
    if (mod === "kayit" && !sonuc.data.session) setMesaj("Hesap oluşturuldu. E-postandaki onay bağlantısına tıkla.");
  };

  return (
    <div className="giris">
      <div className="giris-kutu">
        <div className="logo-buyuk">TYT<span>takip</span></div>
        <p className="soluk">Konu konu soru çöz, kontrol testiyle kapat, bir sonrakine geç.</p>
        <div className="sekmeler" role="tablist">
          {(["giris", "kayit", "baglanti"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mod === m} className={mod === m ? "secili" : ""} onClick={() => setMod(m)}>
              {m === "giris" ? "Giriş" : m === "kayit" ? "Hesap aç" : "Şifresiz"}
            </button>
          ))}
        </div>
        <form className="form" onSubmit={gonder}>
          <label>E-posta<input type="email" autoComplete="email" value={eposta} onChange={(e) => setEposta(e.target.value)} required /></label>
          {mod !== "baglanti" && (
            <label>Şifre<input type="password" autoComplete={mod === "kayit" ? "new-password" : "current-password"} minLength={6} value={sifre} onChange={(e) => setSifre(e.target.value)} required /></label>
          )}
          {hata && <p className="hata-metin" role="alert">{hata}</p>}
          {mesaj && <p className="basari-metin">{mesaj}</p>}
          <button className="dugme dugme-ana" disabled={bekle}>{bekle ? "Bekle…" : mod === "giris" ? "Giriş yap" : mod === "kayit" ? "Hesap aç" : "Bağlantı gönder"}</button>
        </form>
        <button className="dugme-metin" onClick={misafir}>Hesapsız devam et (veriler bu cihazda kalır)</button>
      </div>
    </div>
  );
}

function Turkcele(m: string) {
  if (/invalid login/i.test(m)) return "E-posta veya şifre hatalı.";
  if (/already registered/i.test(m)) return "Bu e-postayla zaten hesap var, giriş yap.";
  if (/email not confirmed/i.test(m)) return "E-postanı henüz onaylamadın.";
  if (/rate limit/i.test(m)) return "Çok fazla deneme yapıldı, biraz bekle.";
  return m;
}
