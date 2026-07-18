export default function NailistProfileLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="animate-pulse">
        <div className="h-64 bg-gradient-to-br from-primary via-primary/60 to-accent opacity-60" />
        <div className="container mx-auto max-w-4xl px-6 py-6 space-y-4">
          <div className="h-5 bg-muted rounded w-1/3" />
          <div className="h-5 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
