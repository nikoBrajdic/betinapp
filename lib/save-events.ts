"use client"

export function notifySaving() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("save:start"))
}

export function notifySaved() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("save:end"))
}

export async function trackSave<T>(promise: Promise<T>): Promise<T> {
  notifySaving()
  try {
    return await promise
  } finally {
    notifySaved()
  }
}
