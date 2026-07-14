import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  subtitle?: string;
  tone?: "light" | "dark";
  size?: "default" | "large";
}

export default function BrandLogo({
  className = "",
  subtitle,
  tone = "dark",
  size = "default",
}: BrandLogoProps) {
  const titleClassName = tone === "light" ? "text-white" : "text-slate-900";
  const subtitleClassName = tone === "light" ? "text-white/75" : "text-[#616f89]";

  return (
    <div className={`flex items-center ${size === "large" ? "gap-4" : "gap-3"} ${className}`}>
      <div className={`relative shrink-0 overflow-hidden border border-slate-200/70 bg-white shadow-sm ${size === "large" ? "size-20 rounded-2xl" : "size-10 rounded-xl"}`}>
        <Image
          alt="Logotipo de Atentix"
          className="scale-[1.65] -translate-y-[15%] object-cover"
          fill
          priority
          sizes={size === "large" ? "80px" : "40px"}
          src="/brand/atentix.jpeg"
        />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className={`${size === "large" ? "text-2xl" : "text-lg"} font-bold leading-tight tracking-tight ${titleClassName}`}>
          Atentix
        </span>
        {subtitle && (
          <span className={`text-xs font-normal ${subtitleClassName}`}>{subtitle}</span>
        )}
      </div>
    </div>
  );
}
