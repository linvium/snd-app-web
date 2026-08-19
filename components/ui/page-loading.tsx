export function PageLoading({ children = 'Učitavanje…' }: { children?: string }) {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4" data-testid="page-loading">
      <p className="m-0 text-center text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
