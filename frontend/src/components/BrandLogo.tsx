import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  subtitle?: string;
  tone?: "light" | "dark";
}

export default function BrandLogo({
  className = "",
  subtitle,
  tone = "dark",
}: BrandLogoProps) {
  const titleClassName = tone === "light" ? "text-white" : "text-slate-900";
  const subtitleClassName = tone === "light" ? "text-white/75" : "text-[#616f89]";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <Image
          alt="Logotipo de Atentix"
          className="scale-[1.65] -translate-y-[15%] object-cover"
          fill
          priority
          sizes="40px"
          src="/brand/atentix.jpeg"
        />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className={`text-lg font-bold leading-tight tracking-tight ${titleClassName}`}>
          Atentix
        </span>
        {subtitle && (
          <span className={`text-xs font-normal ${subtitleClassName}`}>{subtitle}</span>
        )}
      </div>
    </div>
  );
}
