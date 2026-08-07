"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/store";

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      if (code && supabase) {
        await supabase.auth.exchangeCodeForSession(code);
      }
      router.replace("/");
    }
    handleCallback();
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#faf6f4", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 36 }}>💊</div>
      <div style={{ fontSize: 14, color: "#777" }}>로그인 중...</div>
    </div>
  );
}
