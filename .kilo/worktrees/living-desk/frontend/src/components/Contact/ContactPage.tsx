import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Mail, Phone, Send, MapPin, Clock, HelpCircle, FileText, Users } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [sent, setSent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', topic: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  const contactMethods = [
    { icon: Mail, label: 'Email support', value: 'support@a1raters.com', desc: 'Send us an email anytime', color: '#06b6d4' },
    { icon: Phone, label: 'Phone', value: '+1 (555) 123-4567', desc: 'Mon-Fri, 9AM-6PM UTC', color: '#34d399' },
    { icon: MapPin, label: 'Office', value: 'Remote-first', desc: 'Global team', color: '#f59e0b' },
    { icon: Clock, label: 'Response window', value: 'Within 1 business day', desc: 'We aim to reply fast', color: '#8b5cf6' },
  ];

  const quickLinks = [
    { icon: FileText, label: 'Documentation', desc: 'Read our guides and API docs' },
    { icon: Users, label: 'Sales inquiries', desc: 'Talk to our sales team' },
    { icon: HelpCircle, label: 'Technical support', desc: 'Get help with your account' },
  ];

  const formFields = [
    { key: 'name' as const, label: 'Name', type: 'text', placeholder: 'Your full name', required: true },
    { key: 'email' as const, label: 'Email', type: 'email', placeholder: 'you@example.com', required: true },
  ];

  const topics = ['', 'Task access', 'Training', 'Payment or invoice', 'Technical issue', 'Account & billing', 'Report a bug'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="inline-flex items-center gap-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-4 py-1.5 rounded-full text-xs font-semibold mb-5"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
          >
            <Send className="w-3.5 h-3.5" />
            Support Center
          </motion.div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Contact the Team
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Have a question about task access, evaluations, payments, or training?
            Fill out the form or reach out using the methods below and we'll get back to you soon.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Contact Info + Quick Links Column */}
          <motion.div
            className="lg:col-span-1 space-y-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h2>
              <div className="space-y-4">
                {contactMethods.map((method, i) => (
                  <motion.div
                    key={method.label}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${method.color}15` }}
                    >
                      <method.icon className="w-5 h-5" style={{ color: method.color }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{method.label}</div>
                      <div className="text-sm text-cyan-600 dark:text-cyan-400 mt-0.5">{method.value}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{method.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Quick Links</h3>
              <div className="space-y-3">
                {quickLinks.map((link, i) => (
                  <motion.button
                    key={link.label}
                    type="button"
                    className="w-full flex items-start gap-3 text-left group"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.06, duration: 0.35 }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors flex-shrink-0">
                      <link.icon className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">{link.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{link.desc}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Contact Form Column */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Send us a message</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formFields.map((field, i) => (
                    <motion.div
                      key={field.key}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.4 }}
                    >
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.key]}
                        onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                        className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors duration-200 text-sm outline-none"
                      />
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42, duration: 0.4 }}
                >
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Topic
                  </label>
                  <select
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    required
                    className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors duration-200 text-sm outline-none appearance-none"
                  >
                    {topics.map((t) => (
                      <option key={t || 'empty'} value={t || ''}>
                        {t || 'Select a topic'}
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.48, duration: 0.4 }}
                >
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us how we can help..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors duration-200 text-sm outline-none resize-y"
                  />
                </motion.div>

                <motion.button
                  type="submit"
                  disabled={sent}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white transition-all duration-200 ${
                    sent
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-cyan-600 hover:bg-cyan-700 hover:shadow-lg active:scale-[0.98]'
                  }`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  whileHover={!sent ? { scale: 1.02 } : undefined}
                  whileTap={!sent ? { scale: 0.98 } : undefined}
                >
                  {sent ? (
                    <>
                      <CheckCircle2 size={16} /> Message sent
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Send message
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
