"use client";

import { ArrowRight, Bot, BarChart3, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/auth/login");
  };

  const handleGetStarted = () => {
    router.push("/auth/register");
  };

  const features = [
    {
      icon: <Bot className="h-8 w-8" />,
      title: "AI-Powered Classification",
      description: "Automatically categorize bugs using advanced NLP models",
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Smart Prioritization",
      description:
        "Intelligent ranking based on impact, frequency, and urgency",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Duplicate Detection",
      description: "Identify similar issues with 95% accuracy",
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Automated Triage",
      description: "Reduce manual work by 80% with intelligent routing",
    },
  ];

  const stats = [
    { value: "80%", label: "Faster Triage" },
    { value: "85%", label: "Accuracy Rate" },
    { value: "60%", label: "Fewer Duplicates" },
    { value: "24/7", label: "AI Monitoring" },
  ];

  return (
    <div className="min-h-screen bg-gradient-bugsense text-foreground">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="h-10 w-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Bot className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold text-gradient-primary">
            BugSense AI
          </span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogin}
          className="px-6 py-3 bg-gradient-primary rounded-lg font-semibold hover-glow transition-all duration-300 shadow-glow-primary cursor-pointer"
        >
          Sign In
        </motion.button>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="block">Transform Bug Management</span>
              <span className="text-gradient-extended">
                with AI Intelligence
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              Automatically categorize, prioritize, severity predicted and
              analyse reports using advanced NLP and machine learning. Reduce
              manual triaging time by 80% and improve software quality with
              intelligent duplicate detection system.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGetStarted}
                className="px-8 py-4 bg-gradient-primary rounded-xl font-semibold text-lg flex items-center justify-center space-x-2 hover-glow transition-all duration-300 shadow-2xl cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="glass-card rounded-xl p-6 text-center border-gradient"
              >
                <div className="text-3xl md:text-4xl font-bold text-gradient-primary">
                  {stat.value}
                </div>
                <div className="text-muted-foreground mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Why Choose{" "}
              <span className="text-gradient-primary">BugSense AI</span>?
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 + 0.3 }}
                  whileHover={{ y: -10, transition: { duration: 0.2 } }}
                  className="glass-card rounded-xl p-6 border-gradient hover:border-red-500/50 transition-all duration-300"
                >
                  <div className="mb-4 p-3 bg-gradient-primary/20 rounded-lg w-fit">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 md:p-12"
          >
            <div className="absolute inset-0 bg-gradient-primary/10 blur-3xl" />
            <div className="relative z-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Transform Your Bug Management?
              </h2>
              <p className="text-muted-foreground mb-4 max-w-2xl mx-auto">
                Join thousands of developers and QA teams who trust BugSense AI
                for intelligent bug triaging.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 mt-20 border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="h-8 w-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">BugSense AI</span>
          </div>
          <div className="text-muted-foreground text-center md:text-right">
            <p>
              © {new Date().getFullYear()} BugSense AI. All rights reserved.
            </p>
            <p className="text-sm mt-1">
              Intelligent bug classification powered by AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
