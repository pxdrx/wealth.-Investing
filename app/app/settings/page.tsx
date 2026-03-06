"use client";
import { useEffect } from "react";
export default function SettingsRedirect() {
  useEffect(() => { window.location.href = "/app"; }, []);
  return null;
}
