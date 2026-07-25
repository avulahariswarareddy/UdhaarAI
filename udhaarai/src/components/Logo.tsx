import { IndianRupee } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" }[size];
  const icon = { sm: 17, md: 21, lg: 27 }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${box} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-light to-brand text-navy shadow-lg shadow-brand/20`}
      >
        <IndianRupee size={icon} strokeWidth={2.7} />
      </div>
      <div className="leading-none">
        <div className={`font-display font-extrabold tracking-tight ${text}`}>
          Udhaar<span className="text-brand">AI</span>
        </div>
        <div className="mt-1 text-[11px] tracking-wide text-white/45">
          Snap · <span className="text-brand">Understand</span> · Collect
        </div>
      </div>
    </div>
  );
}
