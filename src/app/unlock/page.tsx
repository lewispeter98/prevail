import type { Metadata } from "next";
import { Crest } from "@/components/Crest";
import { UnlockForm } from "./UnlockForm";

export const metadata: Metadata = { title: "Unlock" };

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      <Crest size={88} />
      <div>
        <h1 className="font-serif text-[44px] font-medium leading-none">
          Prevail<span className="text-camel">.</span>
        </h1>
        <p className="mt-3 text-sm text-muted">Enter your passcode. This device will stay unlocked for a year.</p>
      </div>
      <UnlockForm next={typeof next === "string" ? next : "/"} />
    </main>
  );
}
