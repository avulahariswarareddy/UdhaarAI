"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { CustomerFormModal } from "@/components/CustomerFormModal";

export function AddCustomerButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
      >
        <UserPlus size={15} /> Add customer
      </button>
      {open && <CustomerFormModal onClose={() => setOpen(false)} />}
    </>
  );
}
