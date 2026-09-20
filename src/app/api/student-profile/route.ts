import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AcademicMode, StudentProfileInput } from "@/lib/types";

const VALID_ACADEMIC_MODES: AcademicMode[] = [
  "KULIAH",
  "UTS",
  "UAS",
  "LIBUR",
  "SKRIPSI",
  "MAGANG",
];

// GET /api/student-profile — get the first student profile (single-user app)
// Returns null if none exists yet.
export async function GET() {
  try {
    const profile = await db.studentProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(profile);
  } catch (err) {
    console.error("[GET /api/student-profile]", err);
    return NextResponse.json(
      { error: "Gagal memuat profil mahasiswa." },
      { status: 500 }
    );
  }
}

// PUT /api/student-profile — upsert profile (update if exists, else create)
// Body: { monthlyAllowance, allowanceDay, semester, academicMode, university, major, academicYear }
export async function PUT(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as StudentProfileInput;
    const {
      monthlyAllowance,
      allowanceDay,
      semester,
      academicMode,
      university,
      major,
      academicYear,
    } = body ?? {};

    // Validate numeric fields
    const allowance =
      monthlyAllowance !== undefined ? Number(monthlyAllowance) : undefined;
    if (
      allowance !== undefined &&
      (!Number.isFinite(allowance) || allowance < 0)
    ) {
      return NextResponse.json(
        { error: "Uang saku bulanan tidak valid." },
        { status: 400 }
      );
    }

    const aDay = allowanceDay !== undefined ? Number(allowanceDay) : undefined;
    if (
      aDay !== undefined &&
      (!Number.isFinite(aDay) ||
        !Number.isInteger(aDay) ||
        aDay < 1 ||
        aDay > 31)
    ) {
      return NextResponse.json(
        { error: "Tanggal uang saku harus antara 1-31." },
        { status: 400 }
      );
    }

    if (
      academicMode !== undefined &&
      !VALID_ACADEMIC_MODES.includes(academicMode)
    ) {
      return NextResponse.json(
        { error: "Mode akademik tidak valid." },
        { status: 400 }
      );
    }

    const existing = await db.studentProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    const data = {
      ...(allowance !== undefined ? { monthlyAllowance: allowance } : {}),
      ...(aDay !== undefined ? { allowanceDay: aDay } : {}),
      ...(semester !== undefined ? { semester: semester.trim() || null } : {}),
      ...(academicMode !== undefined ? { academicMode } : {}),
      ...(university !== undefined
        ? { university: university.trim() || null }
        : {}),
      ...(major !== undefined ? { major: major.trim() || null } : {}),
      ...(academicYear !== undefined
        ? { academicYear: academicYear.trim() || null }
        : {}),
    };

    let profile;
    if (existing) {
      profile = await db.studentProfile.update({
        where: { id: existing.id },
        data,
      });
    } else {
      profile = await db.studentProfile.create({
        data: {
          monthlyAllowance: allowance ?? 0,
          allowanceDay: aDay ?? 1,
          semester: semester?.trim() || null,
          academicMode: academicMode ?? "KULIAH",
          university: university?.trim() || null,
          major: major?.trim() || null,
          academicYear: academicYear?.trim() || null,
        },
      });
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("[PUT /api/student-profile]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan profil mahasiswa." },
      { status: 500 }
    );
  }
}
