/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import DashboardLayout from '@/components/layout/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { ArrowUpRight, Clock, Server, Activity } from 'lucide-react'
import RecentPings from '@/components/validators/recent-pings'
import ValidatorStats from '@/components/validators/validator-stats'
import ValidatorMap from '@/components/validators/validator-map'
import ValidatorSettings from '@/components/validators/validator-settings'
import PingChart from '@/components/validators/ping-chart'
import { comingSoon } from '@/lib/utils'

interface DashboardData {
  uptime: number
  pingCount: number
  lastPing: string
  performanceScore: number
}

interface LogEntry {
  id: number
  validatorId: number
  region: string
  site: string
  status: 'UP' | 'DOWN'
  latency: number | null
  timestamp: string
  location: string
}

const ValidatorDashboard: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false)
  const [validatorId, setValidatorId] = useState<number | null>(null)
  const { toast } = useToast()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(true)
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
  const [metrics, setMetrics] = useState<{
    uptime: number
    avgLatency: number
    totalPings: number
  }>({
    uptime: 0,
    avgLatency: 0,
    totalPings: 0
  })

  // Use environment variables for backend URLs
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.deepfry.tech';

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    uptime: 0,
    pingCount: 0,
    lastPing: '',
    performanceScore: 0,
  })

  const totalMessages = useRef(0)
  const totalUpPercent = useRef(0)

  // Cleanup function for all resources
  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }

  // Initialize WebSocket connection
  const initWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    cleanup() // Clean up any existing connections

    // Use env or fallback to window.location.host
    const host = import.meta.env.VITE_AGGREGATOR_BASE_URL?.replace(/^https?:\/\//, '') || window.location.host;
    const proto = host.includes('localhost') ? 'ws' : 'wss';
    const ws = new WebSocket(`${proto}://${host}/api/ws`);
    wsRef.current = ws

    ws.onopen = () => {
      console.info('WebSocket connected')
      totalMessages.current = 0
      totalUpPercent.current = 0
    }

    ws.onerror = (err) => {
      console.error('WebSocket error', err)
      if (isMounted.current) {
        toast({ title: 'WebSocket Error', description: 'Lost connection to live data. Please check backend services.', variant: 'destructive', duration: 5000 });
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }

    ws.onmessage = (event) => {
      if (!isMounted.current) return;
      
      try {
        const data = JSON.parse(event.data) as {
          type: 'validator_log';
          url: string;
          consensus: 'UP' | 'DOWN';
          votes: Array<{ 
            validatorId: number; 
            status: 'UP' | 'DOWN'; 
            latencyMs: number;
            location: string;
          }>;
          timestamp: string;
          metrics?: {
            upCount: number;
            totalCount: number;
            avgLatency: number;
            uptime: number;
          };
        };
        // Add null checks for metrics
        const metrics = data.metrics || { upCount: 0, totalCount: 0, avgLatency: 0, uptime: 0 };
        setMetrics(prev => ({
          uptime: metrics.uptime,
          avgLatency: metrics.avgLatency,
          totalPings: prev.totalPings + 1
        }));
        setRecentLogs(prev => {
          const newLog = {
            id: Date.now(),
            validatorId: data.votes[0]?.validatorId || 0,
            region: data.votes[0]?.location || 'unknown',
            site: data.url,
            status: data.consensus,
            latency: data.votes[0]?.latencyMs ?? null,
            timestamp: data.timestamp,
            location: data.votes[0]?.location || 'unknown'
          };
          return [newLog, ...prev].slice(0, 100);
        });
        if (!isStarted) setIsStarted(true)
      } catch (err) {
        console.error('Failed to parse WebSocket message', err)
      }
    }

    ws.onclose = () => {
      console.info('WebSocket disconnected')
      wsRef.current = null
      // Attempt to reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          initWebSocket();
        }
      }, 5000);
    }
  }

  // Fetch logs function with error handling
  const fetchLogs = async () => {
    if (!isMounted.current || !validatorId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/logs?validatorId=${validatorId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch logs');
      }
      const { logs }: { logs: LogEntry[] } = await res.json()
      if (!isMounted.current) return;
      
      // Deduplicate logs by site, timestamp, and validatorId
      const seen = new Set<string>();
      const uniqueLogs = logs.filter(log => {
        if (log.validatorId === 0) return false; // Skip aggregator logs
        const key = `${log.site}-${log.timestamp}-${log.validatorId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Map latency: only show if positive number, else null
      const mappedLogs = uniqueLogs.map(log => ({
        ...log,
        latency: typeof log.latency === 'number' && log.latency > 0 ? log.latency : null,
      }));

      const sorted = mappedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const count = sorted.length
      const lastPing = sorted[0]?.timestamp || ''

      // Calculate performance score from recent logs (last 10)
      const recentLogs = sorted.slice(0, 10)
      const recentUpCount = recentLogs.filter((l) => l.status === 'UP').length
      const performanceScore = recentLogs.length ? Math.round((recentUpCount / recentLogs.length) * 100) : 0
      
      // Calculate uptime from recent logs (last 100)
      const recentLogsForUptime = sorted.slice(0, 100);
      const upCountForUptime = recentLogsForUptime.filter((l) => l.status === 'UP').length;
      const uptimeFromRecentLogs = recentLogsForUptime.length ? Math.round((upCountForUptime / recentLogsForUptime.length) * 100) : 0;
      
      setDashboardData((prev) => ({
        ...prev,
        pingCount: count,
        uptime: uptimeFromRecentLogs,
        lastPing,
        performanceScore,
      }))
      // If logs exist, set isStarted true
      if (count > 0) setIsStarted(true)
    } catch (err: any) {
      console.error('Failed to fetch logs', err)
      if (isMounted.current) {
        toast({ title: 'Backend Unreachable', description: 'Could not fetch logs from backend.', variant: 'destructive', duration: 5000 });
      }
    }
  }

  // Effect for polling backend status and initializing connections
  useEffect(() => {
    isMounted.current = true;
    let statusPollInterval: NodeJS.Timeout | null = null;

    const pollBackendStatus = async () => {
      try {
        // Optimistically assume reachable for the check. If it fails, set to false.
        const res = await fetch(`${API_BASE_URL}/api/status`);
        if (!res.ok) {
          throw new Error(`Failed to fetch validator status: ${res.statusText}`);
        }
        const data = await res.json();
        if (isMounted.current && data.success && data.validators && data.validators.length > 0) {
          setValidatorId(data.validators[0].id);
          if (!isStarted) {
            // Reset counters when stopping
            totalMessages.current = 0
            totalUpPercent.current = 0
            setDashboardData(prev => ({
              ...prev,
              performanceScore: 0,
              uptime: 0
            }))
          }
        } else {
          setIsStarted(false);
        }
      } catch (err: any) {
        console.error('Failed to get validator ID or backend unreachable:', err);
        if (isMounted.current) {
          setIsStarted(false);
        }
      }
    };

    // Start polling backend status immediately and then every 10 seconds
    pollBackendStatus(); 
    statusPollInterval = setInterval(pollBackendStatus, 10000);

    return () => {
      isMounted.current = false;
      cleanup(); // Cleans up WS and log polling intervals
      if (statusPollInterval) {
        clearInterval(statusPollInterval);
      }
    };
  }, []); // Only run once on mount for setting up the initial poll

  // Effect for WebSocket and log fetching, dependent on backendReachable and isStarted
  useEffect(() => {
    if (isStarted) {
      initWebSocket();
      fetchLogs();
    } else {
      // If backend becomes unreachable, ensure WS and log polling are stopped/cleaned
      cleanup(); // This will clear WS and log polling intervals
    }
  }, [isStarted, validatorId]);

  // Handle validator start/stop with better error handling
  useEffect(() => {
    const toggleValidatorOnBackend = async () => {
      try {
        // Ensure AGGREGATOR_BASE_URL does not have protocol or trailing slash
        const host = import.meta.env.VITE_AGGREGATOR_BASE_URL?.replace(/^https?:\/\//, '').replace(/\/$/, '') || window.location.host;
        const proto = host.includes('localhost') ? 'http' : 'https';
        const path = isStarted
          ? `${proto}://${host}/api/simulate/start`
          : `${proto}://${host}/api/simulate/stop`;
        const res = await fetch(path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ validatorId })
        });
        if (!res.ok) {
          throw new Error(`Failed to toggle validator: ${res.statusText}`);
        }
        
        if (!isStarted) {
          // Reset counters when stopping
          setMetrics(prev => ({
            ...prev,
            uptime: 0,
            totalPings: 0
          }));
        }
      } catch (err: any) {
        console.error(`Failed to ${isStarted ? 'start' : 'stop'} validator:`, err);
        if (isMounted.current) {
          toast({
            title: `Failed to ${isStarted ? 'start' : 'stop'} validator`,
            description: err.message || 'Could not reach backend service.',
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    };
    toggleValidatorOnBackend();
  }, [isStarted]); // Depend on isStarted only

  const toggleValidator = () => {
    if (!validatorId) {
      toast({ title: 'Error', description: 'Validator ID not loaded yet.', variant: 'destructive' });
      return;
    }
    setIsStarted(prev => !prev)
  }

  return (
    <DashboardLayout userType="validator">
      <Routes>
        <Route
          path="/"
          element={
            <div className="max-w-[1600px] mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Validator Dashboard
                  </h1>
                </div>
                <div className="flex gap-2">
                  <Button onClick={fetchLogs} variant="outline" disabled={!validatorId}>
                    Reload
                  </Button>
                  <Button
                    onClick={toggleValidator}
                    disabled={!validatorId}
                    className={isStarted ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
                  >
                    {isStarted ? 'Stop Validator' : 'Start Validator'}
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          isStarted ? 'bg-green-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="text-2xl font-bold">
                        {isStarted ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isStarted
                        ? 'Validator is running'
                        : 'Validator is offline'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics.uptime.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Last 30 days
                    </p>
                    <Progress
                      value={metrics.uptime}
                      className="h-2 mt-3"
                    />
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden">
                  <div className="absolute top-2 right-2 z-10 bg-muted text-muted-foreground px-2 py-0.5 rounded text-[10px] font-semibold border border-border shadow-sm opacity-80 pointer-events-none">
                    Coming Soon
                  </div>
                  <CardHeader className="flex justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Earnings</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold opacity-75">—</div>
                    <Button
                      variant="ghost"
                      className="text-xs text-muted-foreground p-0 h-auto"
                      onClick={comingSoon}
                    >
                      Token rewards launching soon
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pings</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData.pingCount}
                    </div>
                    <div className="flex items-center pt-1 text-green-500 text-sm">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {dashboardData.performanceScore}% from last message
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Section */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Ping Response Time</CardTitle>
                  <CardDescription>
                    Average response time over the last 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <PingChart isStarted={isStarted} validatorId={validatorId} />
                </CardContent>
              </Card>

              {/* Recent Pings Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Pings</CardTitle>
                  <CardDescription>
                    Latest website pings from your validator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentPings validatorId={validatorId} logs={recentLogs} />
                </CardContent>
              </Card>

              {/* Performance Score Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Score</CardTitle>
                  <CardDescription>
                    Based on response time, uptime, and consistency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ValidatorStats score={dashboardData.performanceScore} />
                </CardContent>
              </Card>

              {/* Validator Location Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Validator Location</CardTitle>
                  <CardDescription>
                    Your validator's geographic position in the network
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ValidatorMap />
                </CardContent>
              </Card>

              {/* You can re-add "System Stats" cards here if needed, since tabs are removed */}
            </div>
          }
        />
        <Route path="/settings" element={<ValidatorSettings />} />
      </Routes>
    </DashboardLayout>
  )
}

export default ValidatorDashboard
