import Link from "next/link";
import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Next.js not-found page for the /share/[token] segment.
 * Triggered automatically by Next.js when a deeper route is unmatched
 * (e.g. /share/[token]/something/unknown) or when notFound() is called.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <FileQuestion className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Halaman tidak ditemukan
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
