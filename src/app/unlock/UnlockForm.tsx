"use client";

import { useActionState } from "react";
import { unlock, type UnlockState } from "./actions";

export function UnlockForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlock, {});
  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="passcode" className="sr-only">
        Passcode
      </label>
      <input
        id="passcode"
        name="passcode"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        className="field text-center font-serif text-2xl tracking-[0.3em]"
      />
      {state.error && <p className="text-sm text-error">{state.error}</p>}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? "Unlocking…" : "Unlock"}
      </button>
    </form>
  );
}
