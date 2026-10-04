export function SkeletonPost() {
  return (
    <div className="card p-4 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded shimmer" />
          <div className="h-2 w-20 rounded shimmer" />
        </div>
      </div>
      <div className="aspect-square rounded-xl shimmer" />
      <div className="space-y-2">
        <div className="h-3 w-3/4 rounded shimmer" />
        <div className="h-3 w-1/2 rounded shimmer" />
      </div>
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full shimmer" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-32 rounded shimmer" />
          <div className="flex gap-6">
            {[1,2,3].map(i => <div key={i} className="h-10 w-16 rounded shimmer" />)}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {[...Array(9)].map((_, i) => <div key={i} className="aspect-square shimmer rounded-sm" />)}
      </div>
    </div>
  );
}
