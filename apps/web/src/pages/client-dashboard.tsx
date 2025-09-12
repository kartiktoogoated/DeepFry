/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, Suspense, lazy } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Plus, Globe, Activity, Clock, Zap, ExternalLink, Loader2, Users, CalendarIcon } from 'lucide-react'
import { comingSoon } from '@/lib/utils'
import LiveConsensusStatus from '@/components/ui/LiveConsensusStatus'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { SelectSingleEventHandler } from 'react-day-picker'

// Lazy load components
const SitesList = lazy(() => import('@/components/clients/sites-list'))
const AddSiteDialog = lazy(() => import('@/components/clients/add-site-dialog'))
const ValidatorSelection = lazy(() => import('@/components/clients/validator-selection'))
const UptimeChart = lazy(() => import('@/components/clients/uptime-chart'))
const ResponseTimeChart = lazy(() => import('@/components/clients/response-time-chart'))
const ClientMap = lazy(() => import('@/components/clients/client-map'))
const ClientSettings = lazy(() => import('@/components/clients/client-settings'))

// Import type
import type { Website as NewWebsite } from '@/components/clients/add-site-dialog'

// Loading component
const LoadingSpinner = () => (
  <div className="h-32 w-full flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

interface WebsiteSummary {
  id: number
  url: string
  description?: string
  status: 'online' | 'offline'
  uptime: number
  responseTime: number
  lastChecked: string
}

const ClientDashboard: React.FC = () => {
  const [sites, setSites] = useState<WebsiteSummary[]>([])
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null)
  const [showAddSite, setShowAddSite] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLogDate, setSelectedLogDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem('token')

  // 1) Load sites + summaries
  const loadSites = async () => {
    if (!token) {
      toast({ title: 'Not logged in', variant: 'destructive' })
      navigate('/login', { replace: true, state: { from: location } })
      return
    }

    try {
      // fetch list
      const listRes = await fetch('/api/websites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (listRes.status === 401) {
        navigate('/login', { replace: true })
        return
      }
      if (!listRes.ok) throw new Error('Failed to fetch websites')
      const { websites }: { websites: Array<{ id: number; url: string }> } =
        await listRes.json()

      // enrich each with real summary (including latency)
      const enriched = await Promise.all(
        websites.map(async (w) => {
          const sumRes = await fetch(`/api/websites/${w.id}/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!sumRes.ok) throw new Error('Failed to fetch summary')
          // pull latency from summary
          const {
            status: rawStatus,
            uptime: upStr,
            lastChecked,
            latency,
          } = (await sumRes.json()) as {
            status: string
            uptime: string
            lastChecked: string | null
            latency: number | null
          }

          const isUp = rawStatus.toUpperCase() === 'UP'
          const numUp = parseFloat(upStr) || 0

          return {
            id: w.id,
            url: w.url,
            status: isUp ? 'online' : 'offline',
            uptime: numUp,
            responseTime: latency ?? 0,
            lastChecked: lastChecked
              ? new Date(lastChecked).toLocaleString()
              : '—',
          } as WebsiteSummary
        })
      )

      setSites(enriched)
      if (enriched.length && !enriched.find((s) => s.id === selectedSiteId)) {
        setSelectedSiteId(enriched[0].id)
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadSites()
  }, [])

  // filtered by search
  const filteredSites = sites.filter((s) =>
    s.url.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // add & reload
  const addNewSite = (website: NewWebsite) => {
    setShowAddSite(false)
    toast({ title: 'Website Added', description: `Now monitoring ${website.url}` })
    loadSites()
    setSelectedSiteId(Number(website.id))
  }

  const selectedSite = sites.find((s) => s.id === selectedSiteId) || null
  const siteCount = sites.length
  const avgUptime = siteCount
    ? (sites.reduce((sum, s) => sum + s.uptime, 0) / siteCount).toFixed(1)
    : '0'

  // ** NEW: compute average response time **
  const avgResponseTime = siteCount
    ? Math.round(sites.reduce((sum, s) => sum + s.responseTime, 0) / siteCount)
    : 0

  const handleDownloadLogs = async () => {
    if (!selectedSite || !selectedLogDate) {
      toast({ title: 'Error', description: 'Please select a website and a date.', variant: 'destructive' })
      return
    }

    const formattedDate = format(selectedLogDate, 'yyyy-MM-dd')
    const apiUrl = `/api/websites/${selectedSite.id}/logs?untilDate=${formattedDate}`

    try {
      // For demonstration, we'll just log the URL and simulate download
      console.log(`Attempting to download logs from: ${apiUrl}`)

      toast({ title: 'Download Initiated', description: `Logs for ${selectedSite.url} until ${formattedDate} will be downloaded. (Simulated)`, duration: 3000 })
    } catch (err: any) {
      toast({ title: 'Download Error', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <DashboardLayout userType="client">
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex-1 py-6">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                {/* header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold">Client Dashboard</h1>
                    <p className="text-muted-foreground">
                      Monitor your websites using our distributed validator network
                    </p>
                  </div>
                  <Button onClick={() => setShowAddSite(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Website
                  </Button>
                </div>

                {/* Live Consensus Status */}
                <LiveConsensusStatus monitoredUrls={sites.map(s => s.url)} />

                {/* stats */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                  <Card>
                    <CardHeader className="flex justify-between pb-2">
                      <CardTitle className="text-sm">Websites</CardTitle>
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{siteCount}</div>
                      <p className="text-xs text-muted-foreground">Monitored websites</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex justify-between pb-2">
                      <CardTitle className="text-sm">Average Uptime</CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{avgUptime}%</div>
                      <p className="text-xs text-muted-foreground">Last 30 days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex justify-between pb-2">
                      <CardTitle className="text-sm">Response Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {avgResponseTime}ms
                      </div>
                      <p className="text-xs text-muted-foreground">Average</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden">
                    <div className="absolute top-2 right-2 z-10 bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-semibold border border-border shadow-sm opacity-80 pointer-events-none">
                      Coming Soon
                    </div>
                    <CardHeader className="flex justify-between pb-2">
                      <CardTitle className="text-sm">Validators</CardTitle>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold opacity-75">2</div>
                      <Button variant="ghost" size="sm" onClick={comingSoon}>
                        Node selection coming soon
                      </Button>
                    </CardContent>
                  </Card>
                  {/* Consensus Status Card */}
                  <Card>
                    <CardHeader className="flex justify-between pb-2">
                      <CardTitle className="text-sm">Consensus Status</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <LiveConsensusStatus compact monitoredUrls={sites.map(s => s.url)} />
                    </CardContent>
                  </Card>
                </div>

                {/* list + analytics */}
                <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
                  {/* Sites list */}
                  <Card className="md:col-span-1">
                    <CardHeader>
                      <CardTitle>Websites</CardTitle>
                      <CardDescription>Your monitored sites</CardDescription>
                      <div className="mt-2">
                        <Input
                          placeholder="Search websites…"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Suspense fallback={<LoadingSpinner />}>
                        <SitesList
                          sites={filteredSites}
                          onSelect={setSelectedSiteId}
                          selectedSite={selectedSiteId}
                          onDelete={loadSites}
                        />
                      </Suspense>
                    </CardContent>
                    <CardFooter className="border-t p-4">
                      <Button variant="outline" onClick={() => setShowAddSite(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add New
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* analytics */}
                  <Card className="md:col-span-3">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>Website Analytics</CardTitle>
                          <CardDescription>
                            {selectedSite?.url || 'Select a website'}
                          </CardDescription>
                        </div>
                        {selectedSite && (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={selectedSite.status === 'online' ? 'default' : 'destructive'}
                            >
                              {selectedSite.status === 'online' ? 'Online' : 'Offline'}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(selectedSite.url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedSite ? (
                        <Tabs defaultValue="uptime">
                          <TabsList className="mb-4">
                            <TabsTrigger value="uptime">Uptime</TabsTrigger>
                            <TabsTrigger value="performance">Performance</TabsTrigger>
                            <TabsTrigger value="validators">Validators</TabsTrigger>
                            <TabsTrigger value="logs">Logs</TabsTrigger>
                          </TabsList>
                          <TabsContent value="uptime">
                            <Suspense fallback={<LoadingSpinner />}>
                              <UptimeChart 
                                siteId={selectedSite.id} 
                                siteUrl={selectedSite.url}
                              />
                            </Suspense>
                          </TabsContent>
                          <TabsContent value="performance">
                            <Suspense fallback={<LoadingSpinner />}>
                              <ResponseTimeChart
                                siteId={selectedSite.id}
                                siteUrl={selectedSite.url}
                              />
                            </Suspense>
                          </TabsContent>
                          <TabsContent value="validators">
                            <Suspense fallback={<LoadingSpinner />}>
                              <ClientMap />
                            </Suspense>
                          </TabsContent>
                          <TabsContent value="logs">
                            <div className="flex flex-col space-y-4">
                              <Card>
                                <CardHeader>
                                  <CardTitle>Download Logs</CardTitle>
                                  <CardDescription>
                                    Select a date to download all logs up to that point for {selectedSite.url}.
                                  </CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant={"outline"}
                                        className={"w-[200px] justify-start text-left font-normal flex-shrink-0"}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {selectedLogDate ? format(selectedLogDate, "PPP") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-4 shadow-md bg-popover border" align="start" side="bottom" sideOffset={10}>
                                      <Calendar
                                        mode="single"
                                        selected={selectedLogDate}
                                        onSelect={setSelectedLogDate as SelectSingleEventHandler}
                                        initialFocus
                                        captionLayout="buttons"
                                        fromYear={2020}
                                        toYear={new Date().getFullYear()}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Button onClick={handleDownloadLogs} disabled={!selectedLogDate} className="w-auto flex-shrink-0">
                                    Download Logs
                                  </Button>
                                </CardContent>
                              </Card>
                            </div>
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <div className="py-12 text-center text-muted-foreground">
                          <Globe className="h-12 w-12 mb-4 opacity-20" />
                          <h3 className="text-lg font-medium">No Website Selected</h3>
                          <p>Select a website to view analytics</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* validator selection + dialog */}
                <Card>
                  <CardHeader>
                    <CardTitle>Validator Selection</CardTitle>
                    <CardDescription>
                      Select which validator nodes monitor your websites
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<LoadingSpinner />}>
                      <ValidatorSelection />
                    </Suspense>
                  </CardContent>
                </Card>

                <Suspense fallback={<LoadingSpinner />}>
                  <AddSiteDialog
                    open={showAddSite}
                    onOpenChange={setShowAddSite}
                    onAdd={addNewSite}
                  />
                </Suspense>
              </div>
            </div>
          }
        />
        <Route 
          path="/settings" 
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <ClientSettings />
            </Suspense>
          } 
        />
      </Routes>
    </DashboardLayout>
  )
}

export default ClientDashboard