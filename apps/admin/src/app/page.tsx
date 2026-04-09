"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminUserId } from "@/lib/api";

export default function AdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    if (getAdminUserId()) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
