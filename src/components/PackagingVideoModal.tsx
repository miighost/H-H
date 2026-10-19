/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  X,
  Play,
  Cpu,
  Layers,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Activity,
  Leaf
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PackagingVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PackagingVideoModal({ isOpen, onClose }: PackagingVideoModalProps) {
  const [activeTab, setActiveTab] = useState<"video" | "layers" | "specs">("video");

  const layersList = [
    {
      title: "Layer 1: External Gilded Matte Shield",
      thickness: "25 Microns",
      purpose: "UV Radiation absorption & luxury soft-touch tactile packaging feel.",
      benefit: "Prevents direct sunlight oxidation of delicate fruit pigment."
    },
    {
      title: "Layer 2: High Density Oxygen Barrier (EVOH)",
      thickness: "15 Microns",
      purpose: "Locks in natural esters & prevents atmospheric moisture entrance.",
      benefit: "Preserves natural fruit aroma & keeps moisture content strictly below 12%."
    },
    {
      title: "Layer 3: Aluminum Foil Micro-Membrane",
      thickness: "9 Microns",
      purpose: "Protective packaging structure and controlled handling.",
      benefit: "Guarantees zero deterioration risk during ship transit to GCC/EU ports."
    },
    {
      title: "Layer 4: Natural Pure Contact Polyethylene (PE)",
      thickness: "50 Microns",
      purpose: "FDA food-grade direct crop contact lining.",
      benefit: "Zero chemical leaching or synthetic transfer. 100% inert and organic safe."
    }
  ];

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
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-3xl bg-secondary bg-[#F5F0E1] border-2 border-[#D4AF37] overflow-hidden rounded-xl shadow-2xl max-h-[92vh] flex flex-col"
          >
            {/* Fine golden interior border line */}
            <div className="absolute inset-2 border border-brand-gold/25 pointer-events-none rounded-lg z-0" />

            {/* Header */}
            <header className="relative bg-[#1C3B2F] p-5 text-brand-cream border-b border-brand-gold/30 flex justify-between items-center z-10">
              <div className="space-y-1">
                <span className="text-[10px] font-sans text-brand-gold tracking-widest uppercase block font-bold">
                  Packaging System Showcase
                </span>
                <h3 className="font-serif text-2xl font-bold text-brand-gold leading-tight">
                  Precision Preservation System
                </h3>
                <p className="text-xs text-brand-cream/80 font-mono tracking-wide uppercase">
                  UN-Recognised Somali Export Integrity
                </p>
              </div>

              <button
                id="close-video-modal"
                onClick={onClose}
                className="p-2 rounded-full bg-brand-cream/10 text-brand-cream hover:bg-brand-cream/20 hover:text-brand-gold transition-all duration-200 focus:outline-none cursor-pointer"
                aria-label="Close video specifications showcase"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            {/* Switch Tabs Bar */}
            <div className="relative bg-[#F5F0E1]/50 border-b border-brand-gold/20 flex gap-1 p-2 z-10">
              {[
                { id: "video", label: "Video Showcase", icon: Play },
                { id: "layers", label: "3D Multi-Layering", icon: Layers },
                { id: "specs", label: "Technical Metrics", icon: ShieldCheck }
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`video-modal-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer grow justify-center ${
                      isActive
                        ? "bg-[#1C3B2F] text-brand-gold border border-brand-gold"
                        : "text-[#1C3B2F] hover:bg-[#1C3B2F]/10"
                    }`}
                  >
                    <IconComponent className={`w-3.5 h-3.5 ${isActive ? "text-brand-gold" : "text-[#1C3B2F]"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 overflow-y-auto space-y-6 select-text z-10 max-h-[calc(92vh-190px)]">

              {/* Tab: Video Showcase */}
              {activeTab === "video" && (
                <div className="space-y-4">
                  {/* YouTube Player Wrapper */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-[#D4AF37] bg-black shadow-lg">
                    <iframe
                      src="https://www.youtube.com/embed/nm7DnFiAueU?autoplay=1&rel=0"
                      title="Horn & Harvest Premium Packaging System Live Operation"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>

                  {/* Video Metadata Panel */}
                  <div className="p-4 bg-[#F5F0E1]/30 border border-brand-gold/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-[#1C3B2F]">
                      <Activity className="w-5 h-5 text-brand-gold-dark shrink-0" />
                      <h4 className="font-serif text-base font-bold">
                        Live System Processing Under Gentle Thermal Curve
                      </h4>
                    </div>
                    <p className="text-xs text-[#2C2C2C] leading-relaxed font-sans">
                      This film shows the packaging equipment and sealing process. Contact our team for material specifications and production details.
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-mono uppercase text-[#1C3B2F]">
                      <span className="px-3 py-1 bg-white border border-[#D4AF37]/30 rounded-full font-bold">
                        Batch: TRACE-2026
                      </span>
                      <span className="px-3 py-1 bg-white border border-[#D4AF37]/30 rounded-full font-bold">
                        Processing Time: Around-the-clock
                      </span>
                      <span className="px-3 py-1 bg-[#1C3B2F] text-brand-gold border border-brand-gold rounded-full font-bold">
                        Packaging production
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: 3D Multi-Layering */}
              {activeTab === "layers" && (
                <div className="space-y-5">
                  <div className="text-center max-w-xl mx-auto space-y-2">
                    <h4 className="font-serif text-lg font-bold text-[#1C3B2F]">
                      The Quad-Barrier Preservation Shield
                    </h4>
                    <p className="text-xs text-[#2C2C2C]/80 font-sans">
                      Our custom-molded pouches are fabricated from four laminated technical barriers. We ensure organic crops never come in contact with standard chemical plastics.
                    </p>
                  </div>

                  {/* Layers Stack layout */}
                  <div className="space-y-3.5">
                    {layersList.map((layer, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-white/60 border border-brand-gold/20 rounded-xl flex gap-4 transition-all hover:bg-white"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#1C3B2F] text-brand-gold border border-[#D4AF37] flex items-center justify-center shrink-0 font-serif font-bold text-sm">
                          L{idx + 1}
                        </div>
                        <div className="space-y-1 text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <h5 className="font-serif text-sm font-bold text-[#1C3B2F]">
                              {layer.title}
                            </h5>
                            <span className="text-[9px] font-mono bg-[#F5F0E1] border border-[#D4AF37]/30 text-brand-gold-dark uppercase font-bold px-2 py-0.5 rounded">
                              {layer.thickness}
                            </span>
                          </div>
                          <p className="text-xs text-[#2C2C2C] leading-normal font-sans">
                            {layer.purpose}
                          </p>
                          <div className="text-[11px] text-green-700 font-sans italic font-medium flex items-center gap-1 pt-1">
                            <Leaf className="w-3 h-3 text-[#1C3B2F]" />
                            <span>Shield Benefit: {layer.benefit}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Technical Metrics */}
              {activeTab === "specs" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Dehydration standard */}
                    <div className="p-4 bg-white border border-[#D4AF37]/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4.5 h-4.5 text-[#1C3B2F]" />
                        <h5 className="font-serif font-bold text-sm text-[#1C3B2F]">Precision Thermal Curve</h5>
                      </div>
                      <p className="text-xs text-[#2C2C2C]/80 leading-relaxed font-sans">
                        Rather than using harsh freeze dryers or open sun baking, our 3.5kW systems extract humidity using custom curves. This leaves fruit cell fibers unbroken.
                      </p>
                      <ul className="text-[11px] font-mono text-emerald-800 space-y-1 pt-1.5 border-t border-brand-gold/10">
                        <li>• Standard heat range: 38°C to 44°C</li>
                        <li>• Residual moisture index: &lt;11.8%</li>
                        <li>• Preserves native digestive enzymes</li>
                      </ul>
                    </div>

                    {/* Oxygen / Nitrogen flushed */}
                    <div className="p-4 bg-white border border-[#D4AF37]/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4.5 h-4.5 text-[#1C3B2F]" />
                        <h5 className="font-serif font-bold text-sm text-[#1C3B2F]">Nitrogen Fresh FLUSH</h5>
                      </div>
                      <p className="text-xs text-[#2C2C2C]/80 leading-relaxed font-sans">
                        As packets are loaded, ambient air is extracted and replaced with inert Nitrogen gas. This prevents fatty acid rancidity of equatorial seeds.
                      </p>
                      <ul className="text-[11px] font-mono text-emerald-800 space-y-1 pt-1.5 border-t border-brand-gold/10">
                        <li>• Ambient Oxygen level inside: &lt;0.5%</li>
                        <li>• Active mold spores chance: 0.00%</li>
                        <li>• Stable storage life: 18 Months</li>
                      </ul>
                    </div>

                  </div>

                  {/* Accreditations confirmation block */}
                  <div className="p-4 bg-[#1C3B2F] text-white rounded-xl border border-brand-gold/40 text-center relative overflow-hidden">
                    <div className="absolute inset-1.5 border border-brand-gold/10 pointer-events-none rounded-lg" />
                    <span className="text-[9px] font-mono text-brand-gold tracking-widest uppercase block mb-1">
                      Packaging Material
                    </span>
                    <h5 className="font-serif text-sm font-bold text-brand-gold uppercase tracking-wide">
                      Material specifications available on request
                    </h5>
                    <p className="text-[11px] text-brand-cream/80 leading-relaxed max-w-xl mx-auto mt-2 font-mono">
                      Please contact our team for the records available for a particular production batch.
                    </p>
                  </div>
                </div>
              )}

            </div>

             {/* Footer summary */}
             <footer className="bg-white/90 border-t border-brand-gold/20 p-4 font-mono text-[10px] text-[#2C2C2C]/50 flex flex-col sm:flex-row justify-between items-center gap-2 z-10">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                <span>Video Showcase Live</span>
              </span>
              <span className="uppercase tracking-widest text-[#1C3B2F]/80 font-bold">
                Horn & Harvest Quality Shield
              </span>
             </footer>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
