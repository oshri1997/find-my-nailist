import { NailLoader } from '@/components/ui/nail-loader'

export default function SearchLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <NailLoader size="lg" text="מחפשת נייליסטיות..." />
    </div>
  )
}
