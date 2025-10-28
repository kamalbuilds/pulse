'use client';

import React from 'react';
import { Zap, Shield, TrendingUp, Github, Twitter, FileText, MessageCircle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="footer-modern relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="footer-gradient" />
      
      <div className="container relative z-10">
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
            {/* Brand Section - Takes more space */}
            <div className="md:col-span-5 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 shadow-lg shadow-purple-500/30">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold footer-brand-text">SolVibes</span>
                </div>
                <p className="text-base footer-description max-w-md">
                  Experience the future of prediction markets with intuitive swipe-based trading, 
                  powered by Solana blockchain and secured with Arcium's privacy technology.
                </p>
              </div>

              {/* Social Links */}
              <div className="flex items-center space-x-3">
                <a 
                  href="#" 
                  className="footer-social-link group"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a 
                  href="#" 
                  className="footer-social-link group"
                  aria-label="Discord"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a 
                  href="#" 
                  className="footer-social-link group"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a 
                  href="#" 
                  className="footer-social-link group"
                  aria-label="Documentation"
                >
                  <FileText className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Links Grid */}
            <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
              {/* Product */}
              <div className="space-y-4">
                <h4 className="footer-heading">Product</h4>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="footer-link group">
                      <TrendingUp className="w-3 h-3 inline mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      Markets
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link group">
                      <Shield className="w-3 h-3 inline mr-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      Privacy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">Analytics</a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">Leaderboard</a>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div className="space-y-4">
                <h4 className="footer-heading">Resources</h4>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="footer-link">Documentation</a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">API Reference</a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">Tutorials</a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">Community</a>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div className="space-y-4">
                <h4 className="footer-heading">Legal</h4>
                <ul className="space-y-3">
                  <li>
                    <a href="#" className="footer-link">Terms</a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">Privacy</a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">Cookies</a>
                  </li>
                  <li>
                    <a href="#" className="footer-link">Disclaimer</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-divider" />
        <div className="py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="footer-copyright">
              © 2025 SolVibes. Powered by innovation.
            </p>
            <div className="flex items-center space-x-6 footer-tech-stack">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span>Solana</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Arcium MPC</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>Web3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};