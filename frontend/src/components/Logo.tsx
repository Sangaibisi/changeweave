"use client";

import { useId } from "react";

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className }: LogoMarkProps) {
  const id = useId();
  const gradientId = `cai-${id}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <rect x="7" y="11" width="10" height="2" rx="1" fill="#09090b" />
      <rect x="7" y="16" width="13" height="2" rx="1" fill="#09090b" opacity="0.6" />
      <rect x="7" y="21" width="7" height="2" rx="1" fill="#09090b" opacity="0.3" />
      <path
        d="M24 6.5L25 9.2L27.5 10L25 10.8L24 13.5L23 10.8L20.5 10L23 9.2Z"
        fill="#09090b"
      />
      <path
        d="M19.5 20L20 21.5L21.5 22L20 22.5L19.5 24L19 22.5L17.5 22L19 21.5Z"
        fill="#09090b"
        opacity="0.35"
      />
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bef264" />
          <stop offset="1" stopColor="#84cc16" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface LogoProps {
  size?: number;
  className?: string;
  textClassName?: string;
}

export function Logo({ size = 28, className, textClassName }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className || ""}`}>
      <LogoMark size={size} className="shrink-0" />
      <span className={textClassName || "text-sm font-semibold text-txt tracking-tight"}>
        ChangeWeave
      </span>
    </div>
  );
}
