"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Activity,
  Globe,
  Shield,
  ArrowRight,
  LineChart,
  Check,
} from "lucide-react";
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
              <span className="text-sm font-medium">
                Web3-Powered Uptime Monitoring
              </span>
            </div>

            <h1 className="animate-fade-up text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-blue-600 to-purple-500">
              Enterprise-Grade Monitoring
              <br />
              Powered by Web3
            </h1>

            <p className="animate-fade-up text-foreground/60 max-w-2xl text-lg md:text-xl">
              Monitor your website&apos;s uptime with blockchain-verified
              accuracy. Get real-time insights and analytics with unparalleled
              security.
            </p>

            <div className="animate-fade-up flex gap-4">
              <Button
                size="lg"
                className="group bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
              >
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
              <p className="text-foreground/60">
                Distributed monitoring nodes across multiple continents ensure
                accurate uptime data.
              </p>
            </Card>

            <Card className="group p-6 bg-card/50 backdrop-blur hover:bg-card/80 transition-all duration-300 border-muted">
              <Shield className="h-12 w-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold mb-2">Blockchain Verified</h3>
              <p className="text-foreground/60">
                Every uptime check is verified and stored on the blockchain for
                complete transparency.
              </p>
            </Card>

            <Card className="group p-6 bg-card/50 backdrop-blur hover:bg-card/80 transition-all duration-300 border-muted">
              <LineChart className="h-12 w-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-semibold mb-2">Real-time Metrics</h3>
              <p className="text-foreground/60">
                Advanced analytics and instant notifications about your
                website&apos;s performance.
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
              <p className="text-foreground/60 mt-2">Uptime Guarantee</p>
            </div>
            <div className="p-6 rounded-lg bg-card/30 backdrop-blur">
              <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500 animate-pulse">
                10,000+
              </div>
              <p className="text-foreground/60 mt-2">Active Monitors</p>
            </div>
            <div className="p-6 rounded-lg bg-card/30 backdrop-blur">
              <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse">
                50ms
              </div>
              <p className="text-foreground/60 mt-2">Average Response</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="animate-fade-up text-3xl md:text-4xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">
            Ready to Secure Your Website&apos;s Uptime?
          </h2>
          <Button
            size="lg"
            className="group bg-gradient-to-r from-blue-500 to-purple-500 hover:opacity-90"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition" />
          </Button>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-16">
            Simple, transparent pricing
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              title="Starter"
              price="29"
              features={[
                "10 monitors",
                "1-minute checks",
                "Email notifications",
                "5 team members",
                "24h data retention",
              ]}
            />
            <PricingCard
              title="Professional"
              price="79"
              featured={true}
              features={[
                "50 monitors",
                "30-second checks",
                "All notification channels",
                "Unlimited team members",
                "30-day data retention",
                "API access",
              ]}
            />
            <PricingCard
              title="Enterprise"
              price="199"
              features={[
                "Unlimited monitors",
                "15-second checks",
                "Priority support",
                "Custom solutions",
                "90-day data retention",
                "SLA guarantee",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2">
                <Activity className="h-6 w-6 text-indigo-400" />
                <span className="text-xl font-bold">DeepFry</span>
              </div>
              <p className="mt-4 text-gray-400">
                Keeping your services online, always.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
            <p>&copy; 2025 DeepFry. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

// We keep FeatureCard but suppress the "unused" warning.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  features,
  featured = false,
}: {
  title: string;
  price: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`p-8 rounded-lg ${
        featured
          ? "bg-indigo-600 text-white ring-4 ring-indigo-300 dark:ring-indigo-500"
          : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      }`}
    >
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">${price}</span>
        <span className="text-sm">/month</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature: string, index: number) => (
          <li key={index} className="flex items-center space-x-2">
            <Check className="h-5 w-5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <button
        className={`w-full py-3 rounded-lg transition ${
          featured
            ? "bg-white text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-200"
            : "bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
        }`}
      >
        Get Started
      </button>
    </div>
  );
}
