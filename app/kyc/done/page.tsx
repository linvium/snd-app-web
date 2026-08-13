import Link from "next/link";
import { store } from "@/lib/kyc";

interface DoneSearchParams {
  verificationSessionId?: string;
  status?: string;
}

function statusTone(status: string): "ok" | "danger" | "pending" {
  if (status === "Approved") return "ok";
  if (status === "Declined" || status === "Expired" || status === "Abandoned") {
    return "danger";
  }
  return "pending";
}

function statusTitle(status: string, hasRecord: boolean): string {
  if (status === "Approved") return "Identitet potvrđen";
  if (status === "Declined") return "Verifikacija odbijena";
  if (!hasRecord) return "Čekamo potvrdu";
  return "Verifikacija u toku";
}

export default async function KycDonePage({
  searchParams,
}: {
  searchParams: Promise<DoneSearchParams>;
}) {
  const params = await searchParams;
  const sessionId = params.verificationSessionId;
  // The `status` query param is set by Didit but is unsigned — only use it
  // for an immediate, non-authoritative message. Real state comes from our
  // own store, which is only ever written from a verified webhook.
  const unverifiedStatusHint = params.status;

  const record = sessionId ? await store.getVerificationBySessionId(sessionId) : null;

  const displayStatus = record?.status ?? unverifiedStatusHint ?? "Nepoznato";
  const tone = statusTone(displayStatus);
  const title = statusTitle(displayStatus, Boolean(record));

  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            D
          </span>
          DEMO
        </Link>
        <span className="brand-demo">Korak 2 / 2</span>
      </header>

      <main className="flow">
        <p className="flow-kicker">Rezultat</p>
        <h1>{title}</h1>
        <p className="flow-lead">
          Status dolazi iz naše baze nakon potvrđenog Didit webhook-a. Query
          parametar služi samo kao privremeni hint.
        </p>

        <section className="status-panel">
          <p className="status-label">Trenutni status</p>
          <p className="status-value" data-tone={tone}>
            {tone === "pending" && <span className="pulse-dot" aria-hidden />}
            {displayStatus}
          </p>

          {!record && (
            <p className="status-note">
              Čekamo potvrdu od Didita. Osvježite stranicu za koji trenutak.
            </p>
          )}
          {record?.status === "Approved" && (
            <p className="status-note">
              Vaš identitet je uspješno verifikovan. Možete zatvoriti ovaj prozor
              ili se vratiti na početnu.
            </p>
          )}
          {record?.status === "Declined" && (
            <p className="status-note">
              Verifikacija nije prihvaćena. Kontaktirajte podršku ako mislite da
              je ovo greška.
            </p>
          )}
        </section>

        <div className="cta-row">
          <Link href="/" className="btn btn-primary">
            Nazad na početnu
          </Link>
          {!record && sessionId && (
            <Link
              href={`/kyc/done?verificationSessionId=${encodeURIComponent(sessionId)}${
                unverifiedStatusHint
                  ? `&status=${encodeURIComponent(unverifiedStatusHint)}`
                  : ""
              }`}
              className="btn btn-ghost"
            >
              Osvježi status
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
