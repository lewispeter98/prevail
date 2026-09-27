import { ModuleHeader } from "@/components/ModuleHeader";

export default function Layout({ children }: LayoutProps<"/weight">) {
  return (
    <>
      <ModuleHeader module="weight" />
      <main className="mt-4 flex flex-col gap-3">{children}</main>
    </>
  );
}
