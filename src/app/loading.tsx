import { NailLoader } from '@/components/ui/nail-loader'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <NailLoader size="lg" />
    </div>
  )
}
