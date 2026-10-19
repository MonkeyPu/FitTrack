"use client";
import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { clearAllPersisted } from "@/lib/client/persist";

export function LogoutButton() {
  const qc = useQueryClient();
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" className="w-full" disabled={pending} onClick={() => start(async () => { qc.clear(); await clearAllPersisted(); await signOut(); })}>
      <LogOut className="h-4 w-4" />Log out
    </Button>
  );
}
