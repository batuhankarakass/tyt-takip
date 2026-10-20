// Tarihler yerel saatle "YYYY-MM-DD" metni olarak tutulur; saat dilimi kayması olmasın diye
// Date nesnesine hiç UTC üzerinden çevrilmez.

const pad = (n: number) => String(n).padStart(2, "0");

export function gunMetni(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function bugun(): string {
  return gunMetni(new Date());
}

export function metindenGun(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function gunEkle(s: string, n: number): string {
  const d = metindenGun(s);
  d.setDate(d.getDate() + n);
  return gunMetni(d);
}

export function gunFarki(a: string, b: string): number {
  return Math.round((metindenGun(a).getTime() - metindenGun(b).getTime()) / 86400000);
}

/** Pazartesi başlangıçlı haftanın ilk günü. */
export function haftaBasi(s: string): string {
  const d = metindenGun(s);
  const gun = (d.getDay() + 6) % 7;
  return gunEkle(s, -gun);
}

const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const GUNLER = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function kisaTarih(s: string): string {
  const d = metindenGun(s);
  return `${d.getDate()} ${AYLAR[d.getMonth()]}`;
}

export function uzunTarih(s: string): string {
  const d = metindenGun(s);
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}, ${GUNLER[d.getDay()]}`;
}

export function gunAdi(s: string): string {
  return GUNLER[metindenGun(s).getDay()];
}

/** "08.10.2026", "8/10/2026" veya "2026-10-08" biçimlerini okur. */
export function tarihCoz(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
  return null;
}
