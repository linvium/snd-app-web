import Header from '@/components/layout/Header'
import BottomNav from '@/components/layout/BottomNav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-gray-50)' }}>
      <Header />
      <div
        style={{
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom))',
        }}
        className="snd-main-content"
      >
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
