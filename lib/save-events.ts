"use client"

export function notifySaving() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("save:start"))
}

export function notifySaved() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("save:end"))
}

export function notifySaveFailed() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent("save:error"))
}

export async function trackSave<T>(promise: Promise<T>): Promise<T> {
  notifySaving()
  try {
    const result = await promise
    notifySaved()
    return result
  } catch (error) {
    notifySaveFailed()
    throw error
  }
}
