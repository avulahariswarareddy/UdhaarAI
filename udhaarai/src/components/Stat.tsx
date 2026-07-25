import { rupee } from "@/lib/utils";

export function Stat({
  label, value, money, accent,
}: { label: string; value: number | string; money?: boolean; accent?: "brand" | "good" }) {
  const color = accent === "brand" ? "text-brand" : accent === "good" ? "text-good" : "text-white";
  return (
    <div className="glass rounded-2xl p-4">
      <div className="font-mono text-[10px] tracking-widest text-white/40">
        {label.toUpperCase()}
      </div>
      <div className={`mt-1.5 font-mono text-xl font-semibold sm:text-2xl ${color}`}>
        {money ? rupee(value as number) : value}
      </div>
    </div>
  );
}
