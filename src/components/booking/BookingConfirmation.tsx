"use client";

import Link from "next/link";
import { motion } from "framer-motion";

interface Props {
  result: {
    id?: string;
    service: string;
    stylist: string;
    date: string;
    startTime: string;
    endTime: string;
  };
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function BookingConfirmation({ result }: Props) {
  return (
    <div className="text-center max-w-lg mx-auto relative">
      {/* Confetti burst */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 pointer-events-none overflow-visible">
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const distance = 80 + Math.random() * 60;
          const x = Math.cos(angle) * distance;
          const y = Math.sin(angle) * distance;
          const colors = ["#c2274b", "#c9a96e", "#82c4b0", "#fbbf24", "#60a5fa"];
          const color = colors[i % colors.length];
          return (
            <motion.div
              key={i}
              initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
              animate={{ x, y, scale: 1, opacity: 0, rotate: 360 }}
              transition={{ duration: 1.4, delay: 0.15 + i * 0.02, ease: "easeOut" }}
              className="absolute top-16 left-1/2 w-2 h-2 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: color }}
            />
          );
        })}
      </div>

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg"
      >
        <motion.svg
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="font-heading text-3xl mb-2"
      >
        You&apos;re All Set!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-navy/50 font-body text-sm mb-2"
      >
        A confirmation email has been sent with your appointment details.
      </motion.p>
      {result.id && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="text-navy/40 font-body text-xs mb-8"
        >
          Reference: <span className="font-mono text-navy/60">{result.id.slice(0, 8).toUpperCase()}</span>
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="bg-white border border-navy/10 p-8 text-left space-y-4 shadow-sm"
      >
        <div className="flex justify-between">
          <span className="text-navy/50 text-sm font-body">Service</span>
          <span className="font-body font-bold text-sm">{result.service}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/50 text-sm font-body">Stylist</span>
          <span className="font-body font-bold text-sm">{result.stylist}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/50 text-sm font-body">Date</span>
          <span className="font-body font-bold text-sm">{formatDate(result.date)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-navy/50 text-sm font-body">Time</span>
          <span className="font-body font-bold text-sm">
            {formatTime(result.startTime)} – {formatTime(result.endTime)}
          </span>
        </div>
        <div className="border-t border-navy/10 pt-4 mt-4">
          <p className="text-navy/50 text-xs font-body">
            919 South Central Ave Suite #E, Glendale, CA 91204
          </p>
          <p className="text-navy/50 text-xs font-body">(818) 662-5665</p>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-navy/50 text-xs font-body mt-6 mb-8"
      >
        Need to cancel or reschedule? Check your confirmation email for links.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <Link
          href="/"
          className="inline-block border border-navy/20 text-navy text-[11px] tracking-[0.2em] uppercase px-8 py-3 transition-all duration-300 hover:border-navy font-body"
        >
          Return to Home
        </Link>
      </motion.div>
    </div>
  );
}
