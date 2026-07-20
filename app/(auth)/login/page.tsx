import { PasswordField } from "@/components/password-field";
import { inputClass } from "@/components/ui";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <form action="/api/auth/login" method="post" className="grid w-full max-w-sm gap-5 rounded-lg border border-black/10 bg-white p-5 shadow-soft">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold text-ink">Grocery Deal Tracker</h1>
          <p className="text-sm text-ink/65">Private administrator access.</p>
        </div>
        <label className="grid gap-1 text-sm font-medium text-ink">
          <span>Email</span>
          <input className={inputClass} type="email" name="email" autoComplete="email" required />
        </label>
        <PasswordField />
        <button className="touch-target rounded-md bg-leaf px-4 py-2 font-semibold text-white" type="submit">Sign in</button>
      </form>
    </main>
  );
}
