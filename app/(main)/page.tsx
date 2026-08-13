import HomeScreen from '@/components/home/HomeViews'
import LandingHome from '@/components/home/LandingHome'
import { isLandingHomepage } from '@/lib/home/homepage-mode'

export default function HomePage() {
  if (isLandingHomepage()) {
    return <LandingHome />
  }

  return <HomeScreen />
}
