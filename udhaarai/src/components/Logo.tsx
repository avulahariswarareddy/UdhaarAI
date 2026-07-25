import Image from "next/image";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" }[size];
  const px = { sm: 36, md: 44, lg: 56 }[size];
  const text = { sm: "text-lg", md: "text-xl", lg: "text-3xl" }[size];

  return (
    <div className="flex items-center gap-3">
      <div className={`${box} shrink-0 overflow-hidden rounded-2xl shadow-lg shadow-brand/20`}>
        <Image
          src="/icon-512.png"
          alt="UdhaarAI"
          width={px}
          height={px}
          priority
          className="h-full w-full object-cover"
        />
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
