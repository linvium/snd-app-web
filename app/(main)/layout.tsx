import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
