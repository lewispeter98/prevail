/** Placeholder shown for the split second a screen isn't ready yet. */
export function ContentSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3" aria-busy="true" aria-label="Loading">
      <div className="h-48 rounded-[20px] border border-line bg-surface" />
      <div className="h-24 rounded-[20px] border border-line bg-surface" />
      <div className="h-20 rounded-[20px] border border-line bg-surface" />
    </div>
  );
}

/** Whole-module placeholder: header, streak strip, tabs and content. */
export function ModuleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="h-[38px] font-serif text-[22px] font-semibold">
        Prevail<span className="text-camel">.</span>
      </div>
      <div className="mt-[18px] animate-pulse">
        <div className="h-3 w-40 rounded bg-pill" />
        <div className="mt-2 h-10 w-44 rounded-lg bg-pill" />
        <div className="mt-4 flex gap-2">
          <div className="h-[58px] flex-1 rounded-[14px] border border-line bg-surface" />
          <div className="h-[58px] flex-1 rounded-[14px] border border-line bg-surface" />
        </div>
        <div className="mt-[18px] h-[46px] rounded-full bg-pill" />
      </div>
      <div className="mt-4">
        <ContentSkeleton />
      </div>
    </div>
  );
}
