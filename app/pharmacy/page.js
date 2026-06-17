"use client";
import { useEffect } from "react";

export default function PharmacyRedirect() {
  useEffect(() => {
    window.location.replace("https://web-production-af2c4.up.railway.app");
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", color: "#555" }}>
      약사 포털로 이동 중…
    </div>
  );
}
