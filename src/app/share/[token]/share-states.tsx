import Link from "next/link";
import { FileQuestion, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Inline ShareNotFound — used by page.tsx when a share link does not exist
 * or has been deactivated by the owner.
 */
export function ShareNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <FileQuestion className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Link tidak ditemukan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Link yang Anda buka tidak tersedia atau telah dicabut oleh pemilik.
          Mohon periksa kembali link yang Anda terima.
        </p>
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke DompetKu
          </Link>
        </Button>
      </div>
    </main>
  );
}

/**
 * Inline ShareExpired — used by page.tsx when isShareExpired returns true.
 * Shows the specific expiry reason (date, hours, views, or one-time).
 */
export function ShareExpired({ reason }: { reason: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Link sudah kedaluwarsa
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Silakan hubungi pemilik data untuk meminta link baru.
        </p>
        <Button asChild variant="outline" className="mt-6 w-full sm:w-auto">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke DompetKu
          </Link>
        </Button>
      </div>
    </main>
  );
}
