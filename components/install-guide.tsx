"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };

export function InstallGuide() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  if (!promptEvent) return null;
  return (
    <button className="touch-target inline-flex items-center gap-2 rounded-md bg-leaf px-3 py-2 text-sm font-semibold text-white" onClick={() => promptEvent.prompt()}>
      <Download className="h-4 w-4" aria-hidden="true" />
      Install
    </button>
  );
}
