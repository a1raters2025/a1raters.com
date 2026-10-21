import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { APP_CONFIG } from '../../config/appConfig';
import {
  Heart,
  Shield,
  Clock,
  Mail,
  Phone,
  Github,
  Twitter,
  Linkedin,
} from 'lucide-react';

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Task Workspace', to: '/dashboard' },
      { label: 'Training Library', to: '/training' },
      { label: 'Reports', to: '/report' },
      { label: 'History & Invoices', to: '/history' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact', to: '/contact' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Support Hours', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: `Email: ${APP_CONFIG.supportEmail}`, href: `mailto:${APP_CONFIG.supportEmail}` },
      { label: 'Documentation', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
];

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const user = authService.getUser();
  const isAuth = !!user;

  return (
    <motion.footer
      className="app-footer glass-footer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="footer-content">
        {/* Brand */}
        <motion.div
          className="footer-brand"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <img src="/A1raters_black_bg.png" alt="A1 Raters Logo" className="h-8 max-w-[140px] w-auto object-contain" />
          <p className="tagline">AI-powered evaluation platform for raters and clients</p>
          <div className="footer-social">
            <motion.a
              href="#"
              whileHover={{ scale: 1.1, y: -2 }}
              className="footer-social-link"
              aria-label="GitHub"
            >
              <Github size={16} />
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.1, y: -2 }}
              className="footer-social-link"
              aria-label="Twitter"
            >
              <Twitter size={16} />
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.1, y: -2 }}
              className="footer-social-link"
              aria-label="LinkedIn"
            >
              <Linkedin size={16} />
            </motion.a>
          </div>
        </motion.div>

        {/* Columns */}
        {footerLinks.map((col, i) => (
          <motion.div
            key={col.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.4 }}
          >
            <h3>{col.title}</h3>
            <ul>
              {col.links.map((link, index) => {
                if (link.to) {
                  return (
                    <li key={`${link.to}-${index}`}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  );
                }
                return (
                  <li key={`${link.label}-${index}`}>
                    <a
                      href={link.href}
                      target={link.href?.startsWith('http') ? '_blank' : undefined}
                      rel={link.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ))}

        {/* Contact Info Column */}
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <h3>Reach us</h3>
          <ul>
            <li className="flex items-center gap-2.5">
              <Mail size={14} className="text-slate-500" />
              {APP_CONFIG.supportEmail}
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={14} className="text-slate-500" />
              24/7 Platform support
            </li>
            <li className="flex items-center gap-2.5">
              <Clock size={14} className="text-slate-500" />
              Response within 1 business day
            </li>
          </ul>
        </motion.div>
      </div>

      {/* Bottom */}
      <motion.div
        className="footer-bottom"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="flex items-center gap-1">
          {!isAuth && <span className="text-xs text-slate-500">Signed out</span>}
          {isAuth && (
            <>
              <span className="text-xs text-slate-500">Signed in as</span>
              <span className="text-xs font-medium text-white">{user?.username || user?.email}</span>
            </>
          )}
        </div>
        <span className="flex items-center gap-1">
          Made with <Heart className="w-3 h-3 text-rose-400" /> © {currentYear} A1 Raters
        </span>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield size={12} /> Protected & encrypted
        </div>
      </motion.div>
    </motion.footer>
  );
};
