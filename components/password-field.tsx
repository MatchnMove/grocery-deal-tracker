"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputClass } from "./ui";

export function PasswordField({ name = "password", label = "Password", minLength }: { name?: string; label?: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      <span>{label}</span>
      <span className="relative block">
        <input className={`${inputClass} w-full pr-12`} type={show ? "text" : "password"} name={name} required minLength={minLength} autoComplete="current-password" />
        <button
          type="button"
          className="touch-target absolute right-1 top-1/2 grid -translate-y-1/2 place-items-center rounded-md text-ink/65"
          onClick={() => setShow((value) => !value)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  );
}
