"use client";

import type { ReactElement, ReactNode } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import * as m from "motion/react-m";
import { ToggleGroup, Tooltip } from "radix-ui";
import { Toaster } from "sonner";

const loadMotion = () => import("./motion-features").then(module => module.default);
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Experience({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: .2 }}>
    <LazyMotion features={loadMotion} strict>
      <Tooltip.Provider delayDuration={350}>
        {children}
        <Toaster closeButton visibleToasts={2} duration={3500} position="bottom-right"
          mobileOffset={{ bottom: 85, left: 16, right: 16 }}
          toastOptions={{ className: "app-notice", style: { background: "var(--panel)", color: "var(--text)", borderColor: "var(--line)" } }}/>
      </Tooltip.Provider>
    </LazyMotion>
  </MotionConfig>;
}

export function Hint({ label, children }: { label: string; children: ReactElement }) {
  return <Tooltip.Root><Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
    <Tooltip.Portal><Tooltip.Content className="ui-tooltip" sideOffset={8}>
      {label}<Tooltip.Arrow className="ui-tooltip-arrow"/>
    </Tooltip.Content></Tooltip.Portal>
  </Tooltip.Root>;
}

export function GoalPicker({ goal, onChange, locked = false }: { goal: number; onChange: (goal: number) => void; locked?: boolean }) {
  return <ToggleGroup.Root type="single" className="goal-options" value={String(goal)}
    aria-label="Weekly gym days" onValueChange={value => { if (value) onChange(Number(value)); }}>
    {[2, 3, 4, 5].map(value => <ToggleGroup.Item key={value} value={String(value)} asChild
      disabled={locked && value !== goal} aria-label={`${value} days per week`}>
      <m.button type="button" className={goal === value ? "selected" : ""} whileTap={{ scale: .95 }}>
        {value}<small>days / week</small>
      </m.button>
    </ToggleGroup.Item>)}
  </ToggleGroup.Root>;
}

export function DayPicker({ selected, onChange }: { selected: number[]; onChange: (days: number[]) => void }) {
  return <ToggleGroup.Root type="multiple" className="day-options" value={selected.map(String)}
    aria-label="Planned gym days" onValueChange={values => onChange(values.map(Number).sort((a, b) => a - b))}>
    {days.map((day, index) => <ToggleGroup.Item key={day} value={String(index)} asChild aria-label={day}>
      <m.button type="button" className={selected.includes(index) ? "selected" : ""} whileTap={{ scale: .9 }}>{day}</m.button>
    </ToggleGroup.Item>)}
  </ToggleGroup.Root>;
}

export async function celebrate() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) return;
  try {
    const { default: confetti } = await import("canvas-confetti");
    if (document.hidden) return;
    void confetti({ particleCount: 65, spread: 65, startVelocity: 28, origin: { y: .7 },
      colors: ["#b9f25b", "#b7a5fb", "#80d9a2"], ticks: 130, disableForReducedMotion: true });
  } catch { /* A decorative effect must never interrupt a saved action. */ }
}
