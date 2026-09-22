"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  UserCircle,
  Tags,
  ReceiptText,
  Wallet,
  SplitSquareHorizontal,
  HandCoins,
  Sparkles,
  Download,
  ChevronRight,
  type LucideIcon as LucideIconType,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import type { SectionId } from "@/components/layout/app-shell";

interface HubCardProps {
  icon: LucideIconType;
  label: string;
  description: string;
  iconColor: string;
  iconBg: string;
  onClick: () => void;
}

function HubCard({
  icon: Icon,
  label,
  description,
  iconColor,
  iconBg,
  onClick,
}: HubCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      className="block w-full text-left"
    >
      <Card className="flex items-center gap-3 p-4 transition-colors hover:border-primary/40 hover:bg-accent/30">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {label}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {description}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Card>
    </motion.button>
  );
}

interface HubProps {
  onNavigate: (id: SectionId) => void;
}

/* ------------------------- Pengaturan Hub ------------------------- */

export function PengaturanHub({ onNavigate }: HubProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Pengaturan</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Kelola keamanan, akun, kategori, tagihan, dan anggaran Anda.
        </p>
      </div>
      <div className="space-y-2.5">
        <HubCard
          icon={ShieldCheck}
          label="Keamanan"
          description="PIN, password, biometrik, auto-lock, dan privasi"
          iconColor="#0891b2"
          iconBg="#0891b21a"
          onClick={() => onNavigate("pengaturan-keamanan")}
        />
        <HubCard
          icon={UserCircle}
          label="Akun"
          description="Dompet, bank, dan e-wallet Anda"
          iconColor="#10b981"
          iconBg="#10b9811a"
          onClick={() => onNavigate("pengaturan-akun")}
        />
        <HubCard
          icon={Tags}
          label="Kategori"
          description="Atur kategori pemasukan & pengeluaran"
          iconColor="#8b5cf6"
          iconBg="#8b5cf61a"
          onClick={() => onNavigate("pengaturan-kategori")}
        />
        <HubCard
          icon={ReceiptText}
          label="Tagihan"
          description="Transaksi berulang & tagihan rutin"
          iconColor="#f43f5e"
          iconBg="#f43f5e1a"
          onClick={() => onNavigate("pengaturan-tagihan")}
        />
        <HubCard
          icon={Wallet}
          label="Anggaran"
          description="Batas pengeluaran per kategori"
          iconColor="#f97316"
          iconBg="#f973161a"
          onClick={() => onNavigate("pengaturan-anggaran")}
        />
      </div>
    </div>
  );
}

/* ------------------------- Patungan Hub ------------------------- */

export function PatunganHub({ onNavigate }: HubProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Patungan</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Bagi tagihan bersama dan catat hutang & piutang teman.
        </p>
      </div>
      <div className="space-y-2.5">
        <HubCard
          icon={SplitSquareHorizontal}
          label="Split Bill"
          description="Patungan tagihan bersama teman"
          iconColor="#10b981"
          iconBg="#10b9811a"
          onClick={() => onNavigate("patungan-bill")}
        />
        <HubCard
          icon={HandCoins}
          label="Hutang & Piutang"
          description="Catat utang dan piutang ke teman"
          iconColor="#f97316"
          iconBg="#f973161a"
          onClick={() => onNavigate("patungan-debt")}
        />
      </div>
    </div>
  );
}

/* ------------------------- Laporan Hub ------------------------- */

export function LaporanHub({ onNavigate }: HubProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Laporan</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Analisis keuangan Anda dan ekspor data ke berbagai format.
        </p>
      </div>
      <div className="space-y-2.5">
        <HubCard
          icon={Sparkles}
          label="Insight & Tips"
          description="Analisis pola pengeluaran & rekomendasi"
          iconColor="#8b5cf6"
          iconBg="#8b5cf61a"
          onClick={() => onNavigate("laporan-insight")}
        />
        <HubCard
          icon={Download}
          label="Export Data"
          description="Unduh laporan PDF, Excel, CSV, atau JSON"
          iconColor="#0891b2"
          iconBg="#0891b21a"
          onClick={() => onNavigate("laporan-export")}
        />
      </div>
    </div>
  );
}
