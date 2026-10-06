"use client";

import { useSyncExternalStore } from "react";

const GRID_KEY = "flow-dev:grid";
const GRID_OFF = "off";
const GRID_ON = "on";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The grid preference is a per-viewer convenience; storage may be unavailable, so it falls back to "on".
function read() {
  try {
    return window.localStorage.getItem(GRID_KEY) !== GRID_OFF;
  } catch {
    return true;
  }
}

function write(on: boolean) {
  try {
    window.localStorage.setItem(GRID_KEY, on ? GRID_ON : GRID_OFF);
  } catch {}
  listeners.forEach((listener) => listener());
}

export function useGridPreference() {
  const grid = useSyncExternalStore(subscribe, read, () => true);
  return { grid, toggleGrid: () => write(!grid) };
}
