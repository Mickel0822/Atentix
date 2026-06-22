"use client";

import type { BlinkCounterProps } from "@/types";

export default function BlinkCounter({ count }: BlinkCounterProps) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-lg font-medium text-black dark:text-zinc-50">
        Mirada a la pantalla:
      </label>
      <div className="flex items-center justify-center min-w-[60px] h-10 px-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
        <span className="text-xl font-semibold text-black dark:text-zinc-50">
          {count}
        </span>
      </div>
    </div>
  );
}
