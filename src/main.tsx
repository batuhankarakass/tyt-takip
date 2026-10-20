import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ornekVeri } from "./lib/aktar";
import { ornekKaynagiAyarla } from "./lib/depo";
import { VeriSaglayici } from "./lib/durum";
import "./styles.css";

ornekKaynagiAyarla(ornekVeri);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VeriSaglayici>
      <App />
    </VeriSaglayici>
  </StrictMode>,
);
