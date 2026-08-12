"use client";

import Link from "next/link";
import { useState } from "react";

export default function KycPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  async function startVerification() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/kyc/start", { method: "POST" });
      if (!res.ok) {
        throw new Error("Ne mogu da pokrenem verifikaciju. Pokušajte ponovo.");
      }
      const data: { url: string } = await res.json();
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Došlo je do greške.");
      setLoading(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            D
          </span>
          DEMO
        </Link>
        <span className="brand-demo">Korak 1 / 2</span>
      </header>

      <main className="flow">
        <p className="flow-kicker">Verifikacija identiteta</p>
        <h1>Pripremite dokument i kameru</h1>
        <p className="flow-lead">
          Biće vam potreban važeći lični dokument i pristup kameri radi
          provjere lica (liveness). Proces traje samo nekoliko minuta.
        </p>

        <ul className="checklist">
          <li>Lična karta, pasoš ili vozačka dozvola</li>
          <li>Dobra osvijetljenost i stabilna kamera</li>
          <li>Preusmjerenje na Didit, našeg partnera za KYC</li>
        </ul>

        <section className="consent">
          <h2>Saglasnost</h2>
          <p>
            Klikom na dugme ispod bićete preusmjereni na Didit. Tokom procesa
            obrađuju se podaci sa dokumenta i biometrijski podaci (snimak lica)
            radi poređenja sa dokumentom. Podaci se koriste isključivo u svrhu
            verifikacije identiteta i sprečavanja prevara.
          </p>
          <label className="consent-label">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
            />
            <span>
              Slažem se sa obradom mojih ličnih i biometrijskih podataka u svrhu
              verifikacije identiteta.
            </span>
          </label>
        </section>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        <button
          className="btn btn-primary"
          onClick={startVerification}
          disabled={loading || !consentChecked}
        >
          {loading ? "Pokrećem..." : "Pokreni verifikaciju"}
        </button>
      </main>
    </>
  );
}
