import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Users, DollarSign, Star, TrendingUp, Clock } from 'lucide-react'

const stats = [
  { label: 'Total Bookings', value: '0', icon: Calendar, change: '+0 this month' },
  { label: 'Active Clients', value: '0', icon: Users, change: '+0 this month' },
  { label: 'Revenue', value: '$0', icon: DollarSign, change: '+$0 this month' },
  { label: 'Avg Rating', value: '—', icon: Star, change: 'No reviews yet' },
]

const profileChecklist = [
  'Business Information',
  'Add Services & Pricing',
  'Upload Portfolio Photos',
  'Set Working Hours',
  'Add Social Links',
]

export default function NailistDashboard() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here is an overview of your business.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Your next bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No upcoming appointments</p>
              <Button variant="outline" size="sm" className="mt-4">Set Your Availability</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>What clients are saying</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Star className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No reviews yet</p>
              <p className="text-xs text-muted-foreground mt-1">Complete appointments to receive reviews</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile Completion</CardTitle>
            <CardDescription>Complete your profile to attract more clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileChecklist.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start gap-2" variant="outline">
              <Clock className="h-4 w-4" /> Set Working Hours
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Star className="h-4 w-4" /> Add Services
            </Button>
            <Button className="w-full justify-start gap-2" variant="outline">
              <Users className="h-4 w-4" /> View Public Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
