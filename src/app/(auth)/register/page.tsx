import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-rose-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-primary">
            <MapPin className="h-6 w-6" />
            Find My Nailist
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create an account</CardTitle>
            <CardDescription>Join Find My Nailist today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="w-full h-auto py-4 text-sm">
                <span className="text-center">
                  <span className="block font-semibold">I&apos;m a Client</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Looking for services</span>
                </span>
              </Button>
              <Button variant="outline" className="w-full h-auto py-4 text-sm border-primary text-primary">
                <span className="text-center">
                  <span className="block font-semibold">I&apos;m a Nailist</span>
                  <span className="block text-xs mt-0.5">Growing my business</span>
                </span>
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">Full Name</label>
              <Input id="name" type="text" placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">Email</label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <Input id="password" type="password" placeholder="Min. 8 characters" />
            </div>
            <Button className="w-full">Create Account</Button>
            <Button variant="outline" className="w-full">Continue with Google</Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
