import { NailLoader } from '@/components/ui/nail-loader'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
      <NailLoader size="lg" />
    </div>
  )
}
