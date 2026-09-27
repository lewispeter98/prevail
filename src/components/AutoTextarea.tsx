"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

/** A textarea that grows with its content instead of scrolling. */
export function AutoTextarea({
  minRows = 1,
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      className={`w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-serif text-[20px] leading-[1.5] font-medium text-ink outline-none placeholder:text-faint placeholder:italic ${className}`}
      {...props}
    />
  );
}
