/** Lightweight skeleton shown while a route chunk loads. */
export function RouteFallback() {
  return (
    <div className="space-y-4 px-4 py-5" aria-busy="true" aria-label="Loading screen">
      <div className="skeleton h-2.5 w-24" />
      <div className="skeleton h-7 w-52" />
      <div className="skeleton h-40 w-full rounded-3xl" />
      <div className="grid grid-cols-3 gap-2.5">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
      <div className="space-y-2.5">
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="skeleton h-28 w-full rounded-2xl" />
      </div>
    </div>
  )
}
