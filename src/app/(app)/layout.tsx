import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="mx-auto w-full max-w-[440px] px-5 pt-3.5 pb-[calc(104px+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
