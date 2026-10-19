/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Product, User, Order } from "../types";
import { saveOrder, registerUser } from "../firebaseService";
import { 
  X, 
  ShoppingBag, 
  Plus, 
  Minus, 
  User as UserIcon, 
  Building, 
  MapPin, 
  Phone, 
  Lock,
  CheckCircle2, 
  Sparkles,
  Info,
  ChevronRight,
  ClipboardCheck,
  Award,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { COUNTRIES, normalizeForCompare } from "./AuthModal";

interface OrderModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLoginRequest: () => void;
  onOrderSuccess: (order: Order) => void;
}

export default function OrderModal({ 
  product, 
  isOpen, 
  onClose, 
  currentUser, 
  onLoginRequest,
  onOrderSuccess 
}: OrderModalProps) {
  const [qty, setQty] = useState(1);
  
  // Checkout details (if not logged in)
  const [contactName, setContactName] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState("");
  const [mobile, setMobile] = useState("");
  const [orderCountryCode, setOrderCountryCode] = useState("+252");
  const [setPassword, setSetPassword] = useState("");
  const [createAccountChecked, setCreateAccountChecked] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill if logged in
  useEffect(() => {
    if (currentUser) {
      setContactName(currentUser.contactName);
      setCompany(currentUser.company);
      setState(currentUser.state);
      setMobile(currentUser.mobile);
    } else {
      setContactName("");
      setCompany("");
      setState("");
      setMobile("");
    }
  }, [currentUser, isOpen]);

  // Reset order state when product or openness shifts
  useEffect(() => {
    if (isOpen) {
      setPlacedOrder(null);
      setQty(1);
      setError(null);
    }
  }, [isOpen, product]);

  if (!product) return null;

  const handleIncrement = () => setQty(prev => prev + 1);
  const handleDecrement = () => setQty(prev => (prev > 1 ? prev - 1 : 1));

  const totalUnits = qty * 24;
  const totalWeightKg = parseFloat((qty * 2.4).toFixed(1));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const finalContact = contactName.trim();
    const finalCompany = company.trim();
    const finalState = state.trim();
    const rawMobile = mobile.trim();

    if (!finalContact || !finalCompany || !finalState || !rawMobile) {
      setError("All shipping and contact fields are required.");
      setIsLoading(false);
      return;
    }

    // If logged in, use rawMobile as is. Otherwise normalize with orderCountryCode
    const searchNormalized = currentUser 
      ? rawMobile.replace("+", "")
      : normalizeForCompare(rawMobile, orderCountryCode);
    const finalMobile = currentUser ? rawMobile : `+${searchNormalized}`;

    // Generate order ID
    const orderId = `HH-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const order: Order = {
      id: orderId,
      productId: product.id,
      productName: product.name,
      productImageUrl: product.imageUrl,
      qty: qty,
      totalWeightKg: totalWeightKg,
      totalUnits: totalUnits,
      userMobile: finalMobile,
      userName: finalContact,
      userCompany: finalCompany,
      userState: finalState,
      date: orderDate,
      status: "Approved"
    };

    try {
      // 1. Save order to Firestore
      await saveOrder(order);

      // 2. Save order locally for offline compatibility
      const existingOrdersData = localStorage.getItem("hh_orders");
      const existingOrders = existingOrdersData ? JSON.parse(existingOrdersData) : [];
      localStorage.setItem("hh_orders", JSON.stringify([order, ...existingOrders]));

      // 3. Register user if requested
      if (createAccountChecked && !currentUser && setPassword) {
        const newUser: User = {
          mobile: finalMobile,
          email: `${searchNormalized}@gg.com`,
          password: setPassword,
          contactName: finalContact,
          company: finalCompany,
          state: finalState
        };

        try {
          await registerUser(newUser);
          
          // Local sync
          const usersData = localStorage.getItem("hh_registered_users");
          const usersList: User[] = usersData ? JSON.parse(usersData) : [];
          if (!usersList.some(u => normalizeForCompare(u.mobile, "252") === searchNormalized)) {
            usersList.push(newUser);
            localStorage.setItem("hh_registered_users", JSON.stringify(usersList));
          }
          localStorage.setItem("hh_user", JSON.stringify(newUser));
        } catch (regError) {
          console.warn("Could not register user via Firebase, falling back to local:", regError);
          const usersData = localStorage.getItem("hh_registered_users");
          const usersList: User[] = usersData ? JSON.parse(usersData) : [];
          if (!usersList.some(u => normalizeForCompare(u.mobile, "252") === searchNormalized)) {
            usersList.push(newUser);
            localStorage.setItem("hh_registered_users", JSON.stringify(usersList));
            localStorage.setItem("hh_user", JSON.stringify(newUser));
          }
        }
      }

      setPlacedOrder(order);
      onOrderSuccess(order);
      setIsLoading(false);
    } catch (fbError) {
      console.warn("Firebase order save failed, falling back to local only:", fbError);
      
      // Local fallback only
      const existingOrdersData = localStorage.getItem("hh_orders");
      const existingOrders = existingOrdersData ? JSON.parse(existingOrdersData) : [];
      localStorage.setItem("hh_orders", JSON.stringify([order, ...existingOrders]));

      if (createAccountChecked && !currentUser && setPassword) {
        const usersData = localStorage.getItem("hh_registered_users");
        const usersList: User[] = usersData ? JSON.parse(usersData) : [];

        if (!usersList.some(u => normalizeForCompare(u.mobile, "252") === searchNormalized)) {
          const newUser: User = {
            mobile: finalMobile,
            email: `${searchNormalized}@gg.com`,
            password: setPassword,
            contactName: finalContact,
            company: finalCompany,
            state: finalState
          };
          usersList.push(newUser);
          localStorage.setItem("hh_registered_users", JSON.stringify(usersList));
          localStorage.setItem("hh_user", JSON.stringify(newUser));
        }
      }

      setPlacedOrder(order);
      onOrderSuccess(order);
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-lg bg-[#F5F0E1] border-2 border-[#D4AF37] overflow-hidden rounded-2xl shadow-2xl flex flex-col z-10 max-h-[92vh]"
        >
          {/* Decorative grain and border */}
          <div className="absolute inset-0 bg-grain opacity-10 pointer-events-none" />
          <div className="absolute inset-2 border border-[#D4AF37]/20 pointer-events-none rounded-xl" />

          {/* Close button */}
          <button
            onClick={onClose}
            className={`absolute top-4 right-4 z-50 p-1.5 rounded-full transition-all cursor-pointer shadow-sm ${
              placedOrder
                ? "bg-[#1C3B2F]/10 text-[#1C3B2F] border border-[#1C3B2F]/20 hover:bg-[#1C3B2F]/20 hover:text-[#D4AF37]"
                : "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:text-[#D4AF37]"
            }`}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {!placedOrder ? (
            <>
              {/* Header */}
              <div className="bg-[#1C3B2F] p-5 sm:p-6 border-b border-[#D4AF37]/30 text-white text-center relative shrink-0">
                <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold block mb-1">
                  Secure Trade Order Desk
                </span>
                <h3 className="font-serif text-2xl font-bold tracking-wide text-white">
                  Order {product.name}
                </h3>
                <p className="text-xs text-[#D4AF37] font-mono italic mt-1">
                  Batch: {product.traceability.batchNumber} • {product.traceability.sourceValley}
                </p>
              </div>

              {/* Form Body */}
              <form onSubmit={handlePlaceOrder} className="overflow-y-auto p-5 sm:p-6 space-y-5 relative">
                
                {/* 1. Box Info and Quantity Selector */}
                <div className="bg-white/70 border border-[#D4AF37]/30 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-16 h-16 object-cover rounded-lg border border-[#D4AF37]/30 bg-primary-green/5 shadow-xs"
                    />
                    <div className="text-left">
                      <span className="text-[10px] font-mono text-[#D4AF37] font-bold block uppercase">Wholesale Package</span>
                      <h4 className="font-serif text-base font-bold text-[#1C3B2F]">{product.name}</h4>
                      <p className="text-xs text-[#1C3B2F]/75 font-sans">
                        Sold as Boxes • 24 units of 100g each (2.4kg net weight)
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#D4AF37]/10 pt-3 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-left">
                      <span className="text-xs font-mono font-bold text-[#1C3B2F]/80 block">QUANTITY (BOXES)</span>
                      <span className="text-[11px] text-[#1C3B2F]/60">Minimum Order: 1 box</span>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center gap-1.5 bg-white border-2 border-[#D4AF37]/40 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={handleDecrement}
                        className="p-1 rounded bg-gray-50 hover:bg-gray-100 text-[#1C3B2F] transition-all cursor-pointer"
                        title="Decrease"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center text-sm font-bold font-mono text-[#1C3B2F] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleIncrement}
                        className="p-1 rounded bg-[#D4AF37] text-[#1C3B2F] hover:bg-[#D4AF37]/90 transition-all cursor-pointer"
                        title="Increase"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Weight Calculations Banner */}
                  <div className="bg-[#1C3B2F]/5 border-t border-[#D4AF37]/20 p-2.5 rounded-lg flex justify-around text-center text-xs font-mono">
                    <div>
                      <span className="text-[#1C3B2F]/60 block text-[9px] uppercase">Boxes</span>
                      <strong className="text-[#1C3B2F] text-sm">{qty}</strong>
                    </div>
                    <div className="border-l border-[#D4AF37]/20 h-8" />
                    <div>
                      <span className="text-[#1C3B2F]/60 block text-[9px] uppercase">Units (100g)</span>
                      <strong className="text-[#1C3B2F] text-sm">{totalUnits}</strong>
                    </div>
                    <div className="border-l border-[#D4AF37]/20 h-8" />
                    <div>
                      <span className="text-[#1C3B2F]/60 block text-[9px] uppercase">Total Weight</span>
                      <strong className="text-[#D4AF37] text-sm font-bold">{totalWeightKg} kg</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Client Info Section */}
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C3B2F]/80">
                      Shipping & Client Information
                    </h5>
                    
                    {!currentUser && (
                      <button
                        type="button"
                        onClick={onLoginRequest}
                        className="text-xs text-[#D4AF37] font-mono hover:underline focus:outline-none cursor-pointer flex items-center gap-1 font-bold"
                      >
                        Sign In <ChevronRight className="w-3" />
                      </button>
                    )}
                  </div>

                  {currentUser ? (
                    <div className="bg-emerald-50/50 border-2 border-emerald-500/20 rounded-xl p-3 text-xs text-[#1C3B2F] flex justify-between items-center relative">
                      <div className="space-y-1 text-left">
                        <span className="bg-emerald-600 text-white text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full inline-block mb-1.5">
                          ✓ Authenticated Trade Account
                        </span>
                        <p><strong>Contact:</strong> {currentUser.contactName}</p>
                        <p><strong>Company:</strong> {currentUser.company}</p>
                        <p><strong>Destination State:</strong> {currentUser.state}</p>
                        <p><strong>Mobile:</strong> {currentUser.mobile}</p>
                      </div>
                      <div className="text-right">
                        <UserIcon className="w-8 h-8 text-emerald-600/30 mx-auto" />
                        <span className="text-[10px] text-emerald-600 font-mono block mt-1">Pre-filled</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Hint */}
                      <div 
                        onClick={onLoginRequest}
                        className="p-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg text-[11px] text-[#1C3B2F] cursor-pointer hover:bg-[#D4AF37]/15 transition-all flex items-center gap-2 text-left"
                      >
                        <Info className="w-4 h-4 text-[#D4AF37] shrink-0" />
                        <span>
                          Already registered? <strong>Click to Sign In with mobile</strong> for instant pre-filled verification.
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-[#1C3B2F]/75 mb-1">
                            Contact Full Name
                          </label>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-2 w-4 h-4 text-[#D4AF37]" />
                            <input
                              type="text"
                              required
                              placeholder="Ahmed Ali"
                              value={contactName}
                              onChange={(e) => setContactName(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-[#1C3B2F]/75 mb-1">
                            Company / Farm Name
                          </label>
                          <div className="relative">
                            <Building className="absolute left-3 top-2 w-4 h-4 text-[#D4AF37]" />
                            <input
                              type="text"
                              required
                              placeholder="Horn Agro Ltd"
                              value={company}
                              onChange={(e) => setCompany(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-[#1C3B2F]/75 mb-1">
                            Mobile Number
                          </label>
                          <div className="flex gap-2">
                            <div className="relative shrink-0 w-[84px]">
                              <select
                                value={orderCountryCode}
                                onChange={(e) => setOrderCountryCode(e.target.value)}
                                className="w-full pl-2 pr-6 bg-white border border-[#D4AF37]/30 rounded-lg text-xs text-[#1C3B2F] focus:outline-none focus:border-[#D4AF37] appearance-none font-mono cursor-pointer h-9"
                              >
                                {COUNTRIES.map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.flag} {c.code}
                                  </option>
                                ))}
                              </select>
                              <div className="absolute right-2 top-2.5 pointer-events-none text-[#D4AF37]">
                                <ChevronDown className="w-3 h-3" />
                              </div>
                            </div>
                            <div className="relative flex-1">
                              <Phone className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#D4AF37]" />
                              <input
                                type="text"
                                required
                                placeholder="e.g. 615551234"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                className="w-full pl-8 pr-3 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] focus:outline-none focus:border-[#D4AF37] h-9 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono font-bold uppercase text-[#1C3B2F]/75 mb-1">
                            State / Region
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-2.5 top-2 w-4 h-4 text-[#D4AF37]" />
                            <input
                              type="text"
                              required
                              placeholder="Lower Shabelle, Banadir..."
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Optional Account Creation */}
                      <div className="bg-white/40 border border-[#D4AF37]/20 p-3 rounded-lg space-y-2 text-left">
                        <label className="flex items-center gap-2 text-xs text-[#1C3B2F] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createAccountChecked}
                            onChange={(e) => setCreateAccountChecked(e.target.checked)}
                            className="rounded text-[#1C3B2F] focus:ring-[#D4AF37] border-gray-300"
                          />
                          <span>Save these details to create account for future quick tracking</span>
                        </label>

                        {createAccountChecked && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="pt-1.5"
                          >
                            <label className="block text-[10px] font-mono font-bold uppercase text-[#1C3B2F]/75 mb-1">
                              Set Account Password
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2 w-4 h-4 text-[#D4AF37]" />
                              <input
                                type="password"
                                required={createAccountChecked}
                                placeholder="Choose a safe password"
                                value={setPassword}
                                onChange={(e) => setSetPassword(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D4AF37]/30 rounded-lg text-sm text-[#1C3B2F] focus:outline-none"
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 text-left">
                    ⚠️ {error}
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#1C3B2F] text-[#D4AF37] border-2 border-[#D4AF37] font-mono uppercase tracking-wider text-xs font-bold rounded-lg hover:bg-white hover:text-[#1C3B2F] disabled:bg-[#1C3B2F]/50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isLoading ? (
                      "Transmitting Order Request..."
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Place Sovereign Order ({totalWeightKg} kg)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* Thank You Success Screen */
            <div className="p-6 text-center space-y-6 overflow-y-auto max-h-[85vh]">
              <div className="py-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-[#1C3B2F] text-[#D4AF37] rounded-full flex items-center justify-center border-2 border-[#D4AF37] animate-bounce shadow-xl">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="font-serif text-3xl font-bold text-[#1C3B2F] tracking-wide mt-5">
                  Order Successfully Placed
                </h3>
                <span className="text-xs font-mono bg-[#1C3B2F] text-[#D4AF37] px-3.5 py-1 rounded-full border border-[#D4AF37]/30 mt-2 font-bold tracking-wider">
                  ORDER ID: {placedOrder.id}
                </span>
              </div>

              {/* Order Receipt info */}
              <div className="bg-white border-2 border-[#D4AF37]/30 rounded-xl p-5 text-left space-y-4 shadow-sm text-xs relative text-[#1C3B2F]">
                <div className="absolute inset-1 border border-[#D4AF37]/10 pointer-events-none rounded-lg" />
                
                <h4 className="font-serif text-sm font-bold text-[#1C3B2F] border-b border-[#D4AF37]/20 pb-2 flex items-center gap-1.5 uppercase">
                  <ClipboardCheck className="w-4.5 h-4.5 text-[#D4AF37]" />
                  Official Cargo Manifest
                </h4>

                <div className="grid grid-cols-2 gap-y-3 font-sans">
                  <div>
                    <span className="text-[#1C3B2F]/60 block uppercase text-[10px]">Product Selection</span>
                    <strong className="text-sm font-serif">{placedOrder.productName}</strong>
                  </div>
                  <div>
                    <span className="text-[#1C3B2F]/60 block uppercase text-[10px]">Volume Ordered</span>
                    <strong className="text-sm font-mono">{placedOrder.qty} Boxes ({placedOrder.totalUnits} units)</strong>
                  </div>
                  <div>
                    <span className="text-[#1C3B2F]/60 block uppercase text-[10px]">Total Cargo Weight</span>
                    <strong className="text-sm text-emerald-700 font-bold font-mono">{placedOrder.totalWeightKg} KG</strong>
                  </div>
                  <div>
                    <span className="text-[#1C3B2F]/60 block uppercase text-[10px]">Order Date</span>
                    <strong className="text-sm font-mono">{placedOrder.date}</strong>
                  </div>
                </div>

                <div className="border-t border-[#D4AF37]/20 pt-3">
                  <span className="text-[#1C3B2F]/60 block uppercase text-[10px]">Shipment Consignee</span>
                  <p className="font-sans leading-relaxed text-[#1C3B2F]">
                    <strong>{placedOrder.userName}</strong> • {placedOrder.userCompany}<br />
                    Destination State: <strong className="text-[#D4AF37]">{placedOrder.userState}</strong><br />
                    Mobile Tracking: <strong>{placedOrder.userMobile}</strong>
                  </p>
                </div>

                <div className="border-t border-[#D4AF37]/20 pt-3 bg-primary-green/5 p-3 rounded-lg text-[11px] leading-relaxed flex items-start gap-2 text-[#1C3B2F]/80">
                  <Award className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>
                    Our logistics coordinators will contact you on <strong>{placedOrder.userMobile}</strong> to authorize customs clearance and dispatch your fresh golden fruits.
                  </span>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-[#1C3B2F] text-white font-mono uppercase tracking-wider text-xs font-bold rounded-lg hover:bg-[#1C3B2F]/90 transition-all cursor-pointer"
                >
                  Return to Showroom
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
