"use client";

// Adapted from GodUI's Tab Bar for RepClub's theme and Motion provider.
// Copyright (c) 2026 Lucas Bassetti. MIT license: ./LICENSE.
// https://github.com/LucasBassetti/godui/blob/main/packages/lab/src/tab-bar/tab-bar.tsx
import { domMax, LazyMotion, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import * as React from "react";

export type TabBarTab = {
  value: string;
  label: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
};

export type TabBarProps = Omit<React.HTMLAttributes<HTMLElement>, "onChange" | "defaultValue"> & {
  tabs: TabBarTab[];
  value?: string;
  defaultValue?: string;
  labelsOnActiveOnly?: boolean;
  safeArea?: boolean;
  onChange?: (value: string) => void;
};

export const TabBar = React.forwardRef<HTMLElement, TabBarProps>(function TabBar(
  { tabs, value: valueProp, defaultValue, labelsOnActiveOnly = true, safeArea = false, onChange, className, ...props },
  ref,
) {
  const reduceMotion = useReducedMotion();
  const blobId = React.useId();
  const controlled = valueProp !== undefined;
  const [internal, setInternal] = React.useState(() => defaultValue ?? tabs[0]?.value);
  const value = controlled ? valueProp : internal;
  const spring = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 520, damping: 32 };

  return <LazyMotion features={domMax} strict>
    <nav ref={ref} aria-label="Bottom navigation" className={`godui-tab-bar ${className ?? ""}`} data-safe-area={safeArea || undefined} {...props}>
      {tabs.map(tab => {
        const active = tab.value === value;
        return <button key={tab.value} type="button" className="godui-tab-button" data-active={active || undefined}
          aria-label={tab.label} aria-current={active ? "page" : undefined} title={tab.label}
          onClick={() => { if (!controlled) setInternal(tab.value); onChange?.(tab.value); }}>
          {active && <m.span aria-hidden="true" layoutId={blobId} transition={spring} className="godui-tab-indicator" />}
          <m.span aria-hidden="true" className="godui-tab-icon"
            animate={reduceMotion || !active ? { scale: 1 } : { scale: [1, 1.18, 1] }}
            transition={{ duration: reduceMotion ? 0 : .3, ease: "easeOut" }}>
            {tab.icon}
            {tab.badge !== undefined && <span className="godui-tab-badge">{tab.badge}</span>}
          </m.span>
          {(!labelsOnActiveOnly || active) && <m.span layout initial={labelsOnActiveOnly && !reduceMotion ? { opacity: 0 } : false}
            animate={{ opacity: 1 }} transition={spring} className="godui-tab-label">{tab.label}</m.span>}
        </button>;
      })}
    </nav>
  </LazyMotion>;
});
