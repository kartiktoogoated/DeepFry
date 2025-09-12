import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Network,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  Lock
} from 'lucide-react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
  useEffect(() => {
    document.title = 'How It Works - DeepFry';
  }, []);

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <motion.section
        className="py-20 px-4 md:px-6 lg:px-8"
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto text-center">
          <motion.h1 variants={cardVariants} className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            How DeepFry Works
          </motion.h1>
          <motion.p variants={cardVariants} className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            A deep dive into our distributed validator network, consensus mechanism, and monitoring processes.
          </motion.p>
        </div>
      </motion.section>

      {/* Validator Network Section */}
      <motion.section
        className="py-16 px-4 md:px-6 lg:px-8 bg-muted/50"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto">
          <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none bg-muted">
                <span className="text-primary">Validator Network</span>
              </div>
              <h2 className="text-3xl font-bold">Distributed Validator Network</h2>
              <p className="text-muted-foreground">
                Our network consists of geographically distributed validators that work together to monitor website uptime and performance. Each validator runs independently and contributes to the consensus process.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Server className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Validator Nodes</h3>
                    <p className="text-muted-foreground">Independent nodes running across different locations, performing checks and contributing to the network's health and data integrity.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Network className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Network Topology</h3>
                    <p className="text-muted-foreground">A decentralized mesh network design ensures high redundancy and reliability, allowing validators to communicate and share data efficiently.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Performance Monitoring</h3>
                    <p className="text-muted-foreground">Continuous, real-time monitoring of various website metrics, including uptime, response times, and content integrity, from multiple vantage points.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative h-[400px] bg-card rounded-lg border p-6 overflow-hidden">
              <img
                src="/Box with Paper Photo.jpg"
                alt="Global Validator Network"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Consensus Process Section */}
      <motion.section
        className="py-16 px-4 md:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto">
          <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] bg-card rounded-lg border p-6 overflow-hidden">
              <img
                src="/Connected Cubes Photo.jpg"
                alt="Consensus Architecture Diagram"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none bg-muted">
                <span className="text-primary">Consensus</span>
              </div>
              <h2 className="text-3xl font-bold">Raft Consensus Protocol</h2>
              <p className="text-muted-foreground">
                We use the Raft consensus protocol to ensure all validators agree on website status and performance metrics. This provides strong consistency and fault tolerance.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Leader Election</h3>
                    <p className="text-muted-foreground">A robust process for selecting a single leader among validators to orchestrate log replication and maintain consistency, ensuring smooth operation even during network partitions.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Log Replication</h3>
                    <p className="text-muted-foreground">The leader replicates log entries to follower validators, ensuring that all nodes have an identical and up-to-date record of monitoring events and decisions.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Safety Guarantees</h3>
                    <p className="text-muted-foreground">Raft provides strong safety guarantees, ensuring that the system never returns an incorrect result and that all committed entries are durable and consistent across the network.</p>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Monitoring Process Section */}
      <motion.section
        className="py-16 px-4 md:px-6 lg:px-8 bg-muted/50"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto">
          <motion.div variants={cardVariants} className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none bg-muted">
                <span className="text-primary">Monitoring</span>
              </div>
              <h2 className="text-3xl font-bold">Website Monitoring Process</h2>
              <p className="text-muted-foreground">
                Our validators perform comprehensive checks on monitored websites, collecting data on uptime, response time, and other critical metrics.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Regular Checks</h3>
                    <p className="text-muted-foreground">Our distributed validators perform automated, periodic checks on websites from multiple geographic locations, ensuring continuous oversight and early detection of issues.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Alert System</h3>
                    <p className="text-muted-foreground">Instant, configurable alerts notify users via various channels (e.g., email, SMS, webhooks) when anomalies or downtime are detected, enabling swift response.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <BarChart3 className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Performance Metrics</h3>
                    <p className="text-muted-foreground">Comprehensive collection and analysis of key performance indicators such as uptime percentage, response time latency, and error rates, presented through intuitive dashboards.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative h-[400px] bg-card rounded-lg border p-6 overflow-hidden flex items-center justify-center">
              <img
                src="/Earth from Space.jpg"
                alt="Performance Monitoring Dashboard"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-20 px-4 md:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto text-center">
          <motion.div variants={cardVariants} className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">Ready to Join Our Network?</h2>
            <p className="text-muted-foreground">
              Become a validator and start earning rewards while helping to build a more reliable web.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/docs">Read Documentation</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
};

export default HowItWorks; 