'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity, Globe, Shield, ArrowRight, LineChart } from "lucide-react";
import { LiveChart } from "@/components/live-chart";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground pt-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        
        <div className="container mx-auto px-4 py-24 relative">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="animate-fade-in flex items-center space-x-2 bg-muted/80 p-2 rounded-full backdrop-blur-sm">
              <Activity className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm font-medium">Web3-Powered Uptime Monitoring</span>
            </div>
            
            <h1 className="animate-fade-up text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-primary to-purple-500">
              Enterprise-Grade Monitoring
              <br />
              Powered by Web3
            </h1>
            
            <p className="animate-fade-up text-muted-foreground max-w-2xl text-lg md:text-xl">
              Monitor your website&apos;s uptime with blockchain-verified accuracy. Get real-time insights and analytics with unparalleled security.
            </p>
            
            <div className="animate-fade-up flex gap-4">
              <Button size="lg" className="group bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90">
                Start Monitoring
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition" />
              </Button>
              <Button size="lg" variant="outline" className="group">
                View Demo
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12">
          <LiveChart />
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="group p-6 bg-card/50 backdrop-blur hover:bg-card/80 transition-all duration-300 border-muted">
              <Globe className="h-12 w-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold mb-2">Global Network</h3>
              <p className="text-muted-foreground">
                Distributed monitoring nodes across multiple continents ensure accurate uptime data.
              </p>
            </Card>

            <Card className="group p-6 bg-card/50 backdrop-blur hover:bg-card/80 transition-all duration-300 border-muted">
              <Shield className="h-12 w-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold mb-2">Blockchain Verified</h3>
              <p className="text-muted-foreground">
                Every uptime check is verified and stored on the blockchain for complete transparency.
              </p>
            </Card>

            <Card className="group p-6 bg-card/50 backdrop-blur hover:bg-card/80 transition-all duration-300 border-muted">
              <LineChart className="h-12 w-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold mb-2">Real-time Metrics</h3>
              <p className="text-muted-foreground">
                Advanced analytics and instant notifications about your website&apos;s performance.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-lg bg-card/30 backdrop-blur">
              <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-primary animate-pulse">
                99.99%
              </div>
              <p className="text-muted-foreground mt-2">Uptime Guarantee</p>
            </div>
            <div className="p-6 rounded-lg bg-card/30 backdrop-blur">
              <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500 animate-pulse">
                10,000+
              </div>
              <p className="text-muted-foreground mt-2">Active Monitors</p>
            </div>
            <div className="p-6 rounded-lg bg-card/30 backdrop-blur">
              <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse">
                50ms
              </div>
              <p className="text-muted-foreground mt-2">Average Response</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-primary to-purple-500">
            Ready to Secure Your Website&apos;s Uptime?
          </h2>
          <Button size="lg" className="group bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90">
            Get Started Now
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition" />
          </Button>
        </div>
      </section>
    </main>
  );
}