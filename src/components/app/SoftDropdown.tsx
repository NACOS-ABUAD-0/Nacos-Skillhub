"use client";

import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export type DropdownOption<V extends string> = {
  value: V;
  label: string;
  description?: string;
  /** Leading visual — an icon or a colour dot. */
  icon?: React.ReactNode;
  /** Tints the icon chip, e.g. a track colour. */
  accent?: string;
};

const PANEL_GAP = 6;
const PANEL_MAX_HEIGHT = 320;

/**
 * Listbox-style dropdown that replaces a native <select>. The panel is portalled
 * so it is never clipped by scrolling containers such as DataTable.
 */
export function SoftDropdown<V extends string>({
  value,
  options,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  className,
  panelMinWidth = 220,
  disabled,
}: {
  value: V;
  options: DropdownOption<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  panelMinWidth?: number;
  disabled?: boolean;
}) {
  const id = useId();
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; above: boolean } | null>(null);

  const selected = options.find((o) => o.value === value);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.max(r.width, panelMinWidth);
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < Math.min(PANEL_MAX_HEIGHT, options.length * 52 + 12) && r.top > spaceBelow;
    const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
    setPos(
      above
        ? { left, width, above, bottom: window.innerHeight - r.top + PANEL_GAP }
        : { left, width, above, top: r.bottom + PANEL_GAP }
    );
  }, [options.length, panelMinWidth]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openPanel = () => {
    if (disabled) return;
    setActive(selectedIndex);
    place();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!listRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place, close]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (i: number) => {
    const opt = options[i];
    if (opt) onChange(opt.value);
    close();
  };

  const onListKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (i + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => (i - 1 + options.length) % options.length);
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
      default:
        if (e.key.length === 1) {
          const ch = e.key.toLowerCase();
          const n = options.length;
          for (let k = 1; k <= n; k++) {
            const i = (active + k) % n;
            if (options[i].label.toLowerCase().startsWith(ch)) {
              setActive(i);
              break;
            }
          }
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            openPanel();
          }
        }}
        className={cn(
          "group inline-flex h-9 items-center gap-2 rounded-full bg-soft-surface pl-1.5 pr-2.5 text-sm font-medium text-ink",
          "shadow-[0_1px_2px_rgba(15,25,18,0.06)] ring-1 ring-[var(--line)] transition-all duration-150",
          "hover:ring-[rgba(22,69,46,0.3)] hover:shadow-[0_2px_8px_-2px_rgba(15,25,18,0.12)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(22,69,46,0.4)]",
          open && "ring-2 ring-[rgba(22,69,46,0.4)]",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <IconChip accent={selected?.accent}>{selected?.icon}</IconChip>
        <span className={cn("truncate", !selected && "text-ink/45")}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "ml-auto h-4 w-4 shrink-0 text-ink/40 transition-transform duration-200 group-hover:text-ink/60",
            open && "rotate-180"
          )}
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && pos && (
              <motion.ul
                ref={listRef}
                id={`${id}-list`}
                role="listbox"
                tabIndex={-1}
                aria-label={ariaLabel}
                aria-activedescendant={`${id}-opt-${active}`}
                onKeyDown={onListKey}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: pos.above ? 4 : -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: pos.above ? 4 : -4, scale: 0.97 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  position: "fixed",
                  left: pos.left,
                  top: pos.top,
                  bottom: pos.bottom,
                  width: pos.width,
                  maxHeight: PANEL_MAX_HEIGHT,
                  transformOrigin: pos.above ? "bottom" : "top",
                }}
                className={cn(
                  "z-[100] overflow-y-auto rounded-[14px] border border-[var(--line-subtle)] bg-soft-surface p-1.5 outline-none",
                  "shadow-[0_16px_40px_-12px_rgba(15,25,18,0.25),0_4px_10px_-4px_rgba(15,25,18,0.08)]"
                )}
              >
                {options.map((opt, i) => {
                  const isSelected = opt.value === value;
                  const isActive = i === active;
                  return (
                    <li
                      key={opt.value || `__empty-${i}`}
                      id={`${id}-opt-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={isSelected}
                      onPointerMove={() => setActive(i)}
                      onClick={() => choose(i)}
                      className={cn(
                        "flex cursor-pointer select-none items-center gap-3 rounded-[10px] px-2.5 py-2 transition-colors duration-100",
                        isActive ? "bg-soft-tint" : "bg-transparent"
                      )}
                    >
                      <IconChip accent={opt.accent} size="lg">
                        {opt.icon}
                      </IconChip>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm text-ink",
                            isSelected ? "font-semibold" : "font-medium"
                          )}
                        >
                          {opt.label}
                        </span>
                        {opt.description && (
                          <span className="block truncate text-xs text-ink/50">{opt.description}</span>
                        )}
                      </span>
                      <Check
                        aria-hidden
                        className={cn(
                          "h-4 w-4 shrink-0 text-forest transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function IconChip({
  accent,
  size = "sm",
  children,
}: {
  accent?: string;
  size?: "sm" | "lg";
  children?: React.ReactNode;
}) {
  if (!children) return size === "sm" ? <span className="w-1" /> : null;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        size === "sm" ? "h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5" : "h-8 w-8 [&_svg]:h-4 [&_svg]:w-4",
        !accent && "bg-soft-tint text-forest"
      )}
      style={accent ? { backgroundColor: `${accent}1F`, color: accent } : undefined}
    >
      {children}
    </span>
  );
}

/** Small filled circle, used as an option icon for colour-coded items. */
export function ColorDot({ color }: { color: string }) {
  return <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />;
}
