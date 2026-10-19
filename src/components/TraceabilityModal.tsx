/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Product } from "../types";
import { 
  X, 
  MapPin, 
  CheckCircle, 
  Calendar, 
  Droplet, 
  Thermometer, 
  Award, 
  Compass, 
  FileCheck, 
  ShieldAlert,
  Sparkles,
  Inbox
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TraceabilityModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TraceabilityModal({ product, isOpen, onClose }: TraceabilityModalProps) {
  const [inquirySent, setInquirySent] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!product) return null;

  const { traceability } = product;

  const handleRequestCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail) return;
    setSubmitting(true);
    setTimeout(() => {
      setInquirySent(true);
      setSubmitting(false);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-2xl bg-grain border-2 border-brand-gold overflow-hidden rounded-xl shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Fine golden bounding line */}
            <div className="absolute inset-2 border border-brand-gold/25 pointer-events-none rounded-lg" />

            {/* Header */}
            <header className="relative bg-primary-green p-4 sm:p-6 text-brand-cream border-b border-brand-gold/30 flex justify-between items-start">
              <div>
                <span className="text-xs font-mono text-brand-gold tracking-widest uppercase block mb-1">
                  Batch Information
                </span>
                <h3 className="font-serif text-2xl tracking-wide text-brand-cream">
                  {product.name}
                </h3>
                <p className="text-xs text-brand-cream/80 font-mono italic mt-1 font-light">
                  {product.scientificName}
                </p>
              </div>

              <button
                id={`close-modal-${product.id}`}
                onClick={onClose}
                className="p-1.5 rounded-full bg-brand-cream/10 text-brand-cream hover:bg-brand-cream/20 hover:text-brand-gold transition-colors focus:outline-none"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 select-text">
              {/* Highlight Badge and Sweetness */}
              <div className="p-3.5 sm:p-4 bg-primary-green/5 border border-primary-green/10 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-full bg-primary-green text-brand-gold">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-primary-green">
                      Guaranteed Equatorial Richness
                    </h4>
                    <p className="text-xs text-dark-text/70">
                      {product.sugarContentDetails}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-brand-gold text-primary-green text-xs font-mono font-bold rounded-full uppercase tracking-wider">
                  {traceability.bxSweetnessRating.split(" ")[0]} Brix
                </div>
              </div>

              {/* Grid: Trace details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Valley Origin */}
                <div className="p-4 bg-white/50 border border-brand-gold/20 rounded-lg flex gap-3">
                  <Compass className="w-5 h-5 text-brand-gold-dark shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-dark-text/50 block font-mono">
                      Crop Valley Source
                    </span>
                    <strong className="text-sm font-serif text-primary-green block">
                      {traceability.sourceValley}
                    </strong>
                    <span className="text-xs text-dark-text/70">
                      UN Food and Agriculture Organization {traceability.unFaoZone}
                    </span>
                  </div>
                </div>

                {/* Coordinate Location */}
                <div className="p-4 bg-white/50 border border-brand-gold/20 rounded-lg flex gap-3">
                  <MapPin className="w-5 h-5 text-brand-gold-dark shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-dark-text/50 block font-mono">
                      Exact GPS Coordinates
                    </span>
                    <strong className="text-sm font-serif text-primary-green block">
                      {traceability.farmCoordinate.split(" (")[0]}
                    </strong>
                    <span className="text-xs text-dark-text/70 font-mono">
                      {traceability.farmCoordinate.substring(traceability.farmCoordinate.indexOf("("))}
                    </span>
                  </div>
                </div>

                {/* Harvest & Altitude */}
                <div className="p-4 bg-white/50 border border-brand-gold/20 rounded-lg flex gap-3">
                  <Calendar className="w-5 h-5 text-brand-gold-dark shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-dark-text/50 block font-mono">
                      Peak Hand-Harvest Date
                    </span>
                    <strong className="text-xs font-semibold text-primary-green block">
                      {traceability.harvestDate}
                    </strong>
                    <span className="text-[11px] text-dark-text/70 block">
                      Altitude: {traceability.altitude}
                    </span>
                  </div>
                </div>

                {/* Drying profile */}
                <div className="p-4 bg-white/50 border border-brand-gold/20 rounded-lg flex gap-3">
                  <Thermometer className="w-5 h-5 text-brand-gold-dark shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-dark-text/50 block font-mono">
                      3.5kW Precision Cycle
                    </span>
                    <strong className="text-xs font-semibold text-primary-green block">
                      {traceability.dryingTimeHours} Hours Low-Temp Curve
                    </strong>
                    <span className="text-[11px] text-dark-text/70 block">
                      Moisture content retained at standard {traceability.moistureLevel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section: Batch records */}
              <div className="bg-primary-green text-brand-cream/90 p-5 rounded-lg border border-brand-gold/40 relative">
                <h4 className="font-serif text-lg text-brand-gold tracking-wide mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5" /> Batch Quality Information
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs font-mono border-b border-brand-cream/10 pb-4 mb-4">
                  <div className="flex justify-between border-b border-brand-cream/5 py-1">
                    <span className="text-brand-cream/60">Batch record:</span>
                    <span className="text-brand-gold font-bold">{traceability.labCertificateNo}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-cream/5 py-1">
                    <span className="text-brand-cream/60">Analysis Date:</span>
                    <span className="text-brand-cream">{traceability.testDate}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-cream/5 py-1">
                    <span className="text-brand-cream/60">Pesticide:</span>
                    <span className="text-emerald-400 font-bold">{traceability.pesticideStatus}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-cream/5 py-1">
                    <span className="text-brand-cream/60">Heavy Metals:</span>
                    <span className="text-emerald-400 font-bold">{traceability.heavyMetalsStatus}</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-cream/5 py-1 col-span-1 sm:col-span-2">
                    <span className="text-brand-cream/60">Biological Culture test:</span>
                    <span className="text-brand-gold font-bold">{traceability.microbialStatus} ({traceability.yeastMoldCount})</span>
                  </div>
                </div>

                <div className="flex gap-2.5 items-start text-[11px] text-brand-cream/80 leading-relaxed font-sans italic">
                  <CheckCircle className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                  <span>
                    Contact Horn & Harvest for the information available for your specific batch.
                  </span>
                </div>
              </div>

              {/* Form to Request Authenticity Dossier */}
              <div className="border border-brand-gold/30 rounded-lg p-5 bg-white/30 space-y-3">
                <h5 className="font-serif text-sm font-semibold text-primary-green flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-brand-gold-dark" />
                  Request batch information
                </h5>
                <p className="text-xs text-dark-text/70 leading-relaxed">
                  Enter your email to request available batch information for batch <strong>{traceability.batchNumber}</strong>.
                </p>

                {inquirySent ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Demonstration request recorded for <strong>{clientEmail}</strong> — no email has been sent.
                    </span>
                  </motion.div>
                ) : (
                  <form onSubmit={handleRequestCertificate} className="flex flex-col sm:flex-row gap-2">
                    <input
                      id={`client-email-input-${product.id}`}
                      type="email"
                      required
                      placeholder="trade@yourdomain.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-brand-gold/40 text-xs rounded focus:outline-none focus:ring-1 focus:ring-brand-gold text-dark-text grow font-mono w-full sm:w-auto"
                    />
                    <button
                      id={`request-doc-button-${product.id}`}
                      type="submit"
                      disabled={submitting}
                      className="bg-primary-green hover:bg-primary-green/90 text-brand-cream text-xs font-mono font-medium px-4 py-1.5 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer w-full sm:w-auto shrink-0"
                    >
                      <Inbox className="w-3.5 h-3.5" />
                      {submitting ? "Sending..." : "Request dossier"}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <footer className="bg-white/80 border-t border-brand-gold/20 p-4 flex justify-between items-center text-xs text-dark-text/50 font-mono">
              <span>Lot Ref: {traceability.batchNumber}</span>
              <span className="uppercase text-[9px] px-2 py-0.5 bg-primary-green/5 text-primary-green rounded tracking-wider">
                100% Traceable Somali Export
              </span>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
