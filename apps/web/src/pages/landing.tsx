import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  Globe,
  Shield,
  Zap,
  Server,
  Activity,
  Network,
  GitMerge,
  Share2,
  Coins,
  Wallet,
  Lock,
  Blocks as Blockchain,
  Plus,
  Minus
} from 'lucide-react';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import HeroAnimation from '@/components/animations/hero-animation';
import Stats from '@/components/landing/stats';
import CryptoCard from '@/components/web3/crypto-card';
import { motion } from 'framer-motion';
import NetworkAnimation from '@/components/animations/network-animation';

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  useEffect(() => {
    document.title = 'DeepFry - Distributed Validator Network';
  }, []);

  const sectionVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const faqs = [
    {
      question: "What is DeepFry?",
      answer: "DeepFry is a decentralized website monitoring network that leverages a global network of distributed validators to provide reliable and accurate uptime and performance monitoring. Our consensus-driven approach ensures data integrity and eliminates single points of failure."
    },
    {
      question: "How does DeepFry ensure data accuracy?",
      answer: "DeepFry uses a robust consensus mechanism, including Raft consensus and Gossip protocol, to ensure that all validators agree on the website monitoring results. This distributed consensus eliminates malicious actors and ensures high data accuracy and reliability."
    },
    {
      question: "How can I earn crypto with DeepFry?",
      answer: "You can earn crypto by running a validator node and participating in our network's consensus. Validators are rewarded with DeepFry tokens for their uptime, performance, and contribution to the network's security and data verification."
    },
    {
      question: "What are the technical requirements to run a validator node?",
      answer: "Running a validator node requires a stable internet connection, a certain amount of stake in DeepFry tokens, and a machine that meets our minimum hardware specifications. Detailed requirements and setup guides are available in our documentation."
    },
    {
      question: "Is DeepFry suitable for large-scale enterprise monitoring?",
      answer: "Yes, DeepFry's decentralized and scalable architecture makes it ideal for enterprise-grade website monitoring. It offers enhanced reliability, global coverage, and verifiable data, providing a robust solution for businesses of all sizes."
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      {/* Hero Section */}
      <motion.section
        className="py-20 px-4 md:px-6 lg:px-8 flex flex-col items-center"
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <motion.div variants={cardVariants} className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-none bg-muted">
              <span className="text-primary">Coming Soon</span>
            </motion.div>
            <motion.h1 variants={cardVariants} className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Decentralized Website Monitoring Network
            </motion.h1>
            <motion.p variants={cardVariants} className="text-lg md:text-xl text-muted-foreground">
              Join our consensus-driven network of distributed validators to monitor websites and earn crypto rewards.
            </motion.p>
            <motion.div variants={cardVariants} className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild>
                <Link to="/login">Get Started <ChevronRight size={16} className="ml-2" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/how-it-works">How It Works</Link>
              </Button>
            </motion.div>
          </div>
          <motion.div variants={cardVariants} className="order-first lg:order-last">
            <HeroAnimation />
          </motion.div>
        </div>

        {/* Web3 Cards */}
        <motion.div
          className="container max-w-6xl mx-auto mt-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Removed MotionCard wrappers */}
            <CryptoCard
              title="Token Rewards"
              description="Earn tokens for running validator nodes and participating in consensus"
              icon={<Coins className="h-8 w-8 text-primary" />}
              backContent="Validators earn rewards based on uptime, performance, and consensus participation"
            />
            <CryptoCard
              title="Web3 Wallet"
              description="Connect your wallet to receive validator rewards"
              icon={<Wallet className="h-8 w-8 text-primary" />}
              backContent="Compatible with major Web3 wallets including MetaMask and WalletConnect"
            />
            <CryptoCard
              title="Secure Staking"
              description="Stake tokens to become a validator"
              icon={<Lock className="h-8 w-8 text-primary" />}
              backContent="Staking mechanisms ensure validator reliability and network security"
            />
            <CryptoCard
              title="On-chain Proofs"
              description="Consensus results stored on blockchain"
              icon={<Blockchain className="h-8 w-8 text-primary" />}
              backContent="Immutable record of website monitoring results and validator performance"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Stats Section */}
      <motion.section
        className="py-12 bg-muted/50"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 md:px-6">
          <motion.div variants={cardVariants}><Stats /></motion.div>
        </div>
      </motion.section>

      {/* Consensus Section */}
      <motion.section
        className="py-20 px-4 md:px-6 lg:px-8 bg-gradient-to-b from-background to-muted/20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto text-center mb-16">
          <motion.h2 variants={cardVariants} className="text-3xl md:text-4xl font-bold mb-6">Powered by Advanced Consensus</motion.h2>
          <motion.p variants={cardVariants} className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our network utilizes state-of-the-art consensus mechanisms to ensure reliable and accurate website monitoring.
          </motion.p>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 container max-w-6xl mx-auto"
          variants={{
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {/* Replaced each MotionCard with a plain div */}
          <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
            <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <GitMerge className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Raft Consensus</h3>
            <p className="text-muted-foreground">
              Leader-based consensus protocol ensuring strong consistency across validator nodes.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Leader Election</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Log Replication</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Safety Guarantees</span>
              </li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
            <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <Share2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Gossip Protocol</h3>
            <p className="text-muted-foreground">
              Efficient peer-to-peer communication for rapid information dissemination.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Epidemic Broadcast</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Network Resilience</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Eventual Consistency</span>
              </li>
            </ul>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
            <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
              <Network className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">P2P Network</h3>
            <p className="text-muted-foreground">
              Decentralized architecture enabling direct validator communication.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Node Discovery</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Mesh Networking</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                <span>Fault Tolerance</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </motion.section>

      {/* Features Section - Reinstated */}
      <motion.section
        id="learn-more"
        className="py-20 px-4 md:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto">  
          <div className="text-center mb-16">
            <motion.h2 variants={cardVariants} className="text-3xl md:text-4xl font-bold">How It Works</motion.h2>
            <motion.p variants={cardVariants} className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Our distributed validator network provides reliable website monitoring through consensus-driven validation
            </motion.p>
          </div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            {/* Plain divs for feature cards */}
            <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Global Network</h3>
              <p className="text-muted-foreground">
                Access validators from multiple geographic locations with consensus-based reporting
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Decentralized Infrastructure</h3>
              <p className="text-muted-foreground">
                Trustless monitoring with Raft consensus and gossip protocols
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Earn Crypto</h3>
              <p className="text-muted-foreground">
                Validators earn tokens by participating in the consensus network
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Server className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Run a Validator</h3>
              <p className="text-muted-foreground">
                Join the P2P network as a consensus participant
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Uptime Monitoring</h3>
              <p className="text-muted-foreground">
                Real-time website uptime and performance monitoring across the globe
              </p>
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm border transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Network className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Data Accuracy</h3>
              <p className="text-muted-foreground">
                Consensus mechanisms ensure high data integrity and reliability
              </p>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Network Animation Section */}
      <motion.section
        className="py-20 px-4 md:px-6 lg:px-8 bg-background"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container max-w-6xl mx-auto text-center mb-16">
          <motion.h2 variants={cardVariants} className="text-3xl md:text-4xl font-bold mb-6">Our Distributed Network</motion.h2>
          <motion.p variants={cardVariants} className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Visualize the real-time activity and health of our decentralized validator network.
          </motion.p>
        </div>
        <motion.div variants={cardVariants} className="container max-w-6xl mx-auto">
          <NetworkAnimation />
        </motion.div>
      </motion.section>

      {/* CTA Section */}
      <section className="py-20 px-4 md:px-6 lg:px-8 text-center bg-primary text-primary-foreground">
        <motion.div
          className="container max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={sectionVariants}
        >
          <motion.h2 variants={cardVariants} className="text-3xl md:text-4xl font-bold mb-4">
            Join the DeepFry Network
          </motion.h2>
          <motion.p variants={cardVariants} className="text-lg mb-8 opacity-90">
            Be part of the decentralized future of website monitoring. Run a validator node, contribute to a more reliable internet, and earn rewards.
          </motion.p>
          <motion.div variants={cardVariants}>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup">Sign Up Now <ChevronRight size={16} className="ml-2" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* FAQ Section */}
      <motion.section
        className="py-20 px-4 md:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={sectionVariants}
      >
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 variants={cardVariants} className="text-3xl md:text-4xl font-bold">
              Frequently Asked Questions
            </motion.h2>
            <motion.p variants={cardVariants} className="mt-4 text-lg text-muted-foreground">
              Find answers to common questions about DeepFry.
            </motion.p>
          </div>
          <motion.div
            className="space-y-4"
            variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          >
            {faqs.map((faq, index) => (
              <div key={index} className="border rounded-lg bg-card shadow-sm">
                <button
                  className="flex justify-between items-center w-full p-6 text-lg font-semibold focus:outline-none"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  {faq.question}
                  {openFaq === index ? <Minus size={20} /> : <Plus size={20} />}
                </button>
                {openFaq === index && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0, scaleY: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    style={{ transformOrigin: "top", overflow: "hidden" }}
                    className="p-6 pt-0 text-muted-foreground"
                  >
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 }}
                    >
                      {faq.answer}
                    </motion.p>
                  </motion.div>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </motion.section>
      
      <Footer />
    </div>
  );
};

export default LandingPage;
