import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ornekVeri } from "./lib/aktar";
import { profilleriOku, profilOlustur } from "./lib/depo";
import { VeriSaglayici } from "./lib/durum";
import { VARSAYILAN_AYARLAR } from "./lib/types";
import "./styles.css";

// Tek dosyalık önizleme sürümü ilk açılışta boş görünmesin diye örnek bir profille başlar.
if (import.meta.env.MODE === "tek" && profilleriOku().liste.length === 0) {
  profilOlustur("Örnek", { ...ornekVeri(), ayarlar: { ...VARSAYILAN_AYARLAR, ad: "Örnek" } });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VeriSaglayici>
      <App />
    </VeriSaglayici>
  </StrictMode>,
);
