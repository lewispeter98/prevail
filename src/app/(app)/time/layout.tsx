import { ModuleHeader } from "@/components/ModuleHeader";

export default function Layout({ children }: LayoutProps<"/time">) {
  return (
    <>
      <ModuleHeader module="time" />
      <main className="mt-4 flex flex-col gap-3">{children}</main>
    </>
  );
}
