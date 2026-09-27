import { ModuleHeader } from "@/components/ModuleHeader";

export default function Layout({ children }: LayoutProps<"/goals">) {
  return (
    <>
      <ModuleHeader module="goals" />
      <main className="mt-4 flex flex-col gap-3">{children}</main>
    </>
  );
}
