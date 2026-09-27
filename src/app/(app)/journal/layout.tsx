import { ModuleHeader } from "@/components/ModuleHeader";

export default function Layout({ children }: LayoutProps<"/journal">) {
  return (
    <>
      <ModuleHeader module="journal" />
      <main className="mt-4 flex flex-col gap-3">{children}</main>
    </>
  );
}
