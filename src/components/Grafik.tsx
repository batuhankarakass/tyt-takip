import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Kabın gerçek piksel genişliği: SVG'yi esnetmek yerine bu genişlikte çizeriz, yazılar bozulmaz. */
function useGenislik(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [g, setG] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setG(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, g];
}

// Elle çizilen SVG grafikler: kütüphane yok, tema tokenlarıyla boyanır, üzerine gelince ipucu gösterir.

export interface Seri {
  ad: string;
  renk: string; // CSS değişkeni, ör. "var(--seri-1)"
}

interface IpucuDurum {
  x: number;
  y: number;
  icerik: ReactNode;
}

function Ipucu({ d, genislik }: { d: IpucuDurum | null; genislik: number }) {
  if (!d) return null;
  const sag = d.x > genislik * 0.6;
  return (
    <div className="ipucu" style={{ left: sag ? undefined : d.x + 12, right: sag ? genislik - d.x + 12 : undefined, top: Math.max(0, d.y - 10) }}>
      {d.icerik}
    </div>
  );
}

function olcek(maks: number) {
  if (maks <= 0) return { ust: 10, adimlar: [0, 5, 10] };
  const kaba = maks / 4;
  const us = Math.pow(10, Math.floor(Math.log10(kaba)));
  const adim = [1, 2, 2.5, 5, 10].map((m) => m * us).find((a) => a >= kaba)!;
  const ust = Math.ceil(maks / adim) * adim;
  const adimlar: number[] = [];
  for (let v = 0; v <= ust + 1e-9; v += adim) adimlar.push(Math.round(v * 100) / 100);
  return { ust, adimlar };
}

export interface YiginNokta {
  etiket: string;
  uzunEtiket: string;
  degerler: number[];
}

/** Yığılmış sütun grafiği (ör. günlük soru, aşamalara göre). */
export function YiginSutun({ veri, seriler, yukseklik = 180, birim = "soru", hedef }: { veri: YiginNokta[]; seriler: Seri[]; yukseklik?: number; birim?: string; hedef?: number }) {
  const [kutu, G] = useGenislik();
  const [ip, setIp] = useState<IpucuDurum | null>(null);
  const [aktif, setAktif] = useState<number | null>(null);
  const sol = 34, alt = 22, ust = 8;
  const ic = yukseklik - alt - ust;
  const toplamlar = veri.map((v) => v.degerler.reduce((a, b) => a + b, 0));
  const { ust: maks, adimlar } = olcek(Math.max(...toplamlar, hedef ?? 0));
  const bw = (G - sol) / veri.length;
  const barW = Math.max(2, Math.min(28, bw * 0.62));
  const y = (v: number) => ust + ic - (v / maks) * ic;
  const etiketAdim = Math.ceil(veri.length / Math.max(3, Math.floor(G / 70)));

  const goster = (i: number, e: React.PointerEvent) => {
    const r = kutu.current!.getBoundingClientRect();
    setAktif(i);
    setIp({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      icerik: (
        <>
          <strong>{veri[i].uzunEtiket}</strong>
          {seriler.map((s, j) => (
            <div key={s.ad} className="ipucu-satir">
              <span className="ipucu-isaret" style={{ background: s.renk }} />
              {s.ad}
              <span className="ipucu-deger">{veri[i].degerler[j]}</span>
            </div>
          ))}
          <div className="ipucu-satir ipucu-toplam">
            Toplam<span className="ipucu-deger">{toplamlar[i]} {birim}</span>
          </div>
        </>
      ),
    });
  };

  return (
    <div className="grafik" ref={kutu} onPointerLeave={() => { setIp(null); setAktif(null); }}>
      <svg viewBox={`0 0 ${G} ${yukseklik}`} role="img" aria-label="Günlük soru grafiği" width={G} height={yukseklik}>
        {adimlar.map((a) => (
          <g key={a}>
            <line x1={sol} x2={G} y1={y(a)} y2={y(a)} className="izgara" />
            <text x={sol - 6} y={y(a) + 4} className="eksen" textAnchor="end">{a}</text>
          </g>
        ))}
        {hedef ? (
          <g>
            <line x1={sol} x2={G} y1={y(hedef)} y2={y(hedef)} className="hedef-cizgi" />
            <text x={G - 2} y={y(hedef) - 4} className="eksen" textAnchor="end">hedef {hedef}</text>
          </g>
        ) : null}
        {veri.map((v, i) => {
          const cx = sol + bw * i + bw / 2;
          let acc = 0;
          const parcalar = v.degerler.map((d, j) => {
            const y0 = y(acc), y1 = y(acc + d);
            acc += d;
            return { j, y0, y1, d };
          }).filter((p) => p.d > 0);
          return (
            <g key={i} opacity={aktif === null || aktif === i ? 1 : 0.45}>
              {parcalar.map((p, k) => {
                const enUst = k === parcalar.length - 1;
                const h = Math.max(0, p.y0 - p.y1 - (enUst ? 0 : 2));
                const r = enUst ? Math.min(4, barW / 2, h) : 0;
                const x = cx - barW / 2, yy = p.y1;
                const d = `M${x},${yy + h} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + barW - r} Q${x + barW},${yy} ${x + barW},${yy + r} V${yy + h} Z`;
                return <path key={p.j} d={d} fill={seriler[p.j].renk} />;
              })}
              {i % etiketAdim === (veri.length - 1) % etiketAdim && (
                <text x={cx} y={yukseklik - 6} className="eksen" textAnchor="middle">{v.etiket}</text>
              )}
              <rect x={sol + bw * i} y={ust} width={bw} height={ic} fill="transparent" onPointerMove={(e) => goster(i, e)} onPointerDown={(e) => goster(i, e)} />
            </g>
          );
        })}
        <line x1={sol} x2={G} y1={y(0)} y2={y(0)} className="taban" />
      </svg>
      <Ipucu d={ip} genislik={G} />
    </div>
  );
}

export interface CizgiNokta {
  etiket: string;
  uzunEtiket: string;
  deger: number | null;
  ek?: ReactNode;
}

/** Tek serili çizgi grafiği; isteğe bağlı referans çizgisiyle (ör. %70 kapanma eşiği). */
export function Cizgi({ veri, renk = "var(--seri-1)", yukseklik = 170, bicim = (v: number) => String(v), referans, sabitUst, ad }: { veri: CizgiNokta[]; renk?: string; yukseklik?: number; bicim?: (v: number) => string; referans?: { deger: number; etiket: string }; sabitUst?: number; ad: string }) {
  const [kutu, G] = useGenislik();
  const [aktif, setAktif] = useState<number | null>(null);
  const [ip, setIp] = useState<IpucuDurum | null>(null);
  const sol = 38, sag = 12, alt = 22, ust = 12;
  const ic = yukseklik - alt - ust;
  const degerler = veri.map((v) => v.deger).filter((v): v is number => v !== null);
  const { ust: maks, adimlar } = useMemo(() => (sabitUst ? { ust: sabitUst, adimlar: [0, 0.25, 0.5, 0.75, 1].map((m) => m * sabitUst) } : olcek(Math.max(...degerler, referans?.deger ?? 0, 1))), [degerler, sabitUst, referans]);
  const x = (i: number) => (veri.length === 1 ? sol + (G - sol - sag) / 2 : sol + ((G - sol - sag) * i) / (veri.length - 1));
  const y = (v: number) => ust + ic - (v / maks) * ic;
  const yol = veri.reduce((acc, v, i) => {
    if (v.deger === null) return acc;
    const onceki = i > 0 && veri[i - 1].deger !== null;
    return acc + `${onceki ? "L" : "M"}${x(i)},${y(v.deger)} `;
  }, "");
  const etiketAdim = Math.ceil(veri.length / Math.max(3, Math.floor(G / 80)));

  const hareket = (e: React.PointerEvent<SVGRectElement>) => {
    const r = kutu.current!.getBoundingClientRect();
    const svgX = e.clientX - r.left;
    let en = 0;
    veri.forEach((_, i) => { if (Math.abs(x(i) - svgX) < Math.abs(x(en) - svgX)) en = i; });
    setAktif(en);
    const v = veri[en];
    setIp({
      x: x(en),
      y: v.deger === null ? 20 : y(v.deger),
      icerik: (
        <>
          <strong>{v.uzunEtiket}</strong>
          <div className="ipucu-satir">
            <span className="ipucu-isaret" style={{ background: renk }} />
            {ad}
            <span className="ipucu-deger">{v.deger === null ? "veri yok" : bicim(v.deger)}</span>
          </div>
          {v.ek}
        </>
      ),
    });
  };

  return (
    <div className="grafik" ref={kutu} onPointerLeave={() => { setIp(null); setAktif(null); }}>
      <svg viewBox={`0 0 ${G} ${yukseklik}`} role="img" aria-label={ad} width={G} height={yukseklik}>
        {adimlar.map((a) => (
          <g key={a}>
            <line x1={sol} x2={G - sag} y1={y(a)} y2={y(a)} className="izgara" />
            <text x={sol - 6} y={y(a) + 4} className="eksen" textAnchor="end">{bicim(a)}</text>
          </g>
        ))}
        {referans && (
          <g>
            <line x1={sol} x2={G - sag} y1={y(referans.deger)} y2={y(referans.deger)} className="hedef-cizgi" />
            <text x={sol + 4} y={y(referans.deger) - 5} className="eksen" textAnchor="start">{referans.etiket}</text>
          </g>
        )}
        {veri.map((v, i) => i % etiketAdim === (veri.length - 1) % etiketAdim && (
          <text key={i} x={x(i)} y={yukseklik - 6} className="eksen" textAnchor="middle">{v.etiket}</text>
        ))}
        {aktif !== null && <line x1={x(aktif)} x2={x(aktif)} y1={ust} y2={ust + ic} className="nisangah" />}
        <path d={yol} fill="none" stroke={renk} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {veri.map((v, i) => v.deger !== null && (veri.length <= 16 || i === aktif) && (
          <circle key={i} cx={x(i)} cy={y(v.deger)} r={i === aktif ? 5 : 3.5} fill={renk} stroke="var(--yuzey)" strokeWidth={2} />
        ))}
        <rect x={sol} y={0} width={G - sol} height={yukseklik} fill="transparent" onPointerMove={hareket} onPointerDown={hareket} />
      </svg>
      <Ipucu d={ip} genislik={G} />
    </div>
  );
}

export function Gosterge({ seriler }: { seriler: Seri[] }) {
  return (
    <div className="gosterge">
      {seriler.map((s) => (
        <span key={s.ad}>
          <span className="gosterge-isaret" style={{ background: s.renk }} />
          {s.ad}
        </span>
      ))}
    </div>
  );
}

/** İnce ilerleme çubuğu. */
export function Cubuk({ deger, renk = "var(--vurgu)", etiket }: { deger: number; renk?: string; etiket?: string }) {
  return (
    <div className="cubuk" role="progressbar" aria-valuenow={Math.round(deger * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={etiket}>
      <div style={{ width: `${Math.min(100, Math.max(0, deger * 100))}%`, background: renk }} />
    </div>
  );
}
