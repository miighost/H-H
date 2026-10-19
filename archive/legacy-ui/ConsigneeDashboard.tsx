import {AccountDelivery} from './DeliveryTracking';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Product, User, Order } from "../types";
import { BRAND_PRODUCTS } from "../data";
import { getOrders as fbGetOrders, getProducts as fbGetProducts, updateOrderStatus as fbUpdateOrderStatus, getAllUsers as fbGetAllUsers, getTradeDashboard, placeAllocatedTradeOrder } from "../firebaseService";
import AuthModal from "./AuthModal";
import InvoiceModal from "./InvoiceModal";
// @ts-ignore
import heroBackgroundImage from "../assets/images/regenerated_image_1782744371077.jpg";
import {
  X,
  ShoppingBag,
  Calendar,
  MapPin,
  Phone,
  Truck,
  Anchor,
  CheckCircle2,
  Package,
  Compass,
  Ban,
  ChevronRight,
  TrendingUp,
  Sliders,
  Check,
  ArrowLeft,
  Search,
  RefreshCw,
  Building,
  User as UserIcon,
  PlusCircle,
  HelpCircle,
  Minus,
  Plus
} from "lucide-react";
import { motion } from "motion/react";

interface ConsigneeDashboardProps {
  currentUser: User | null;
  onLoginRequest: () => void;
  onBackToHome: () => void;
  onLogout: () => void;
  initialProductToOrder?: Product | null;
  onClearInitialProduct?: () => void;
  onAuthSuccess?: (user: User) => void;
}

const STATUS_FLOW: Order["status"][] = ["Approved", "Preparing", "On the Way", "Delivered"];

export default function ConsigneeDashboard({
  currentUser,
  onLoginRequest,
  onBackToHome,
  onLogout,
  initialProductToOrder,
  onClearInitialProduct,
  onAuthSuccess
}: ConsigneeDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [outstandingBalance, setOutstandingBalance] = useState<number>(0);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"active" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Section toggle: Ledger vs Product Catalog Page
  const [currentSection, setCurrentSection] = useState<"ledger" | "products">("ledger");

  // Local products catalog backed by localStorage (editable)
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Forecasting variables
  const [selectedForecastProduct, setSelectedForecastProduct] = useState<Product | null>(null);
  const [forecastMonthlyTarget, setForecastMonthlyTarget] = useState<number>(150);

  // Editable Form states
  const [formName, setFormName] = useState("");
  const [formSciName, setFormSciName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formExtDesc, setFormExtDesc] = useState("");
  const [formBrix, setFormBrix] = useState("20.0° Bx");
  const [formMoisture, setFormMoisture] = useState("14.0%");
  const [formValley, setFormValley] = useState<"Shabelle River Valley" | "Juba River Valley">("Shabelle River Valley");
  const [formHarvestDate, setFormHarvestDate] = useState("July 2026");
  const [formAltitude, setFormAltitude] = useState("80m above sea level");
  const [formDryingTime, setFormDryingTime] = useState(16);
  const [formLabCertificate, setFormLabCertificate] = useState("");
  const [formImage, setFormImage] = useState("/src/assets/images/regenerated_image_1782223583418.png");
  const [formBadges, setFormBadges] = useState("Naturally dried, Carefully packed");

  const loadProducts = () => {
    const stored = localStorage.getItem("hh_products");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProducts(parsed);
        if (parsed.length > 0 && !selectedForecastProduct) {
          setSelectedForecastProduct(parsed[0]);
        }
      } catch (e) {
        setProducts(BRAND_PRODUCTS);
        setSelectedForecastProduct(BRAND_PRODUCTS[0]);
      }
    } else {
      localStorage.setItem("hh_products", JSON.stringify(BRAND_PRODUCTS));
      setProducts(BRAND_PRODUCTS);
      setSelectedForecastProduct(BRAND_PRODUCTS[0]);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleEditClick = (p: Product) => {
    setEditingProduct(p);
    setIsAddingProduct(false);
    setFormName(p.name);
    setFormSciName(p.scientificName);
    setFormDescription(p.description);
    setFormExtDesc(p.extendedDescription);
    setFormBrix(p.traceability.bxSweetnessRating);
    setFormMoisture(p.traceability.moistureLevel);
    setFormValley(p.traceability.sourceValley);
    setFormHarvestDate(p.traceability.harvestDate);
    setFormAltitude(p.traceability.altitude);
    setFormDryingTime(p.traceability.dryingTimeHours);
    setFormLabCertificate(p.traceability.labCertificateNo);
    setFormImage(p.imageUrl);
    setFormBadges(p.badges.join(", "));
  };

  const handleAddClick = () => {
    setIsAddingProduct(true);
    setEditingProduct(null);
    setFormName("");
    setFormSciName("");
    setFormDescription("");
    setFormExtDesc("");
    setFormBrix("21.5° Bx");
    setFormMoisture("14.5%");
    setFormValley("Shabelle River Valley");
    setFormHarvestDate("July 2026");
    setFormAltitude("75m above sea level");
    setFormDryingTime(18);
    setFormLabCertificate("");
    setFormImage("/src/assets/images/regenerated_image_1782223583418.png");
    setFormBadges("Naturally dried, Carefully packed");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = editingProduct ? editingProduct.id : `custom-variety-${Date.now()}`;

    const updatedProduct: Product = {
      id,
      name: formName || "New Cultivar",
      scientificName: formSciName || "Mangifera indica L.",
      description: formDescription || "Naturally sweet dried fruit",
      extendedDescription: formExtDesc || "Nourished in mineral-rich river basins.",
      badges: formBadges.split(",").map(b => b.trim()).filter(Boolean),
      imageUrl: formImage,
      fallbackImageColor: "from-[#1C3B2F] to-[#D4AF37]",
      sugarContentDetails: `Brix Rating: ${formBrix}. Dehydrated without added processing agents.`,
      traceability: {
        batchNumber: editingProduct?.traceability.batchNumber || `HH-CV-${Math.floor(1000 + Math.random() * 9000)}`,
        sourceValley: formValley,
        farmCoordinate: editingProduct?.traceability.farmCoordinate || "Afgooye Region (2.1388° N, 44.8239° E)",
        altitude: formAltitude,
        harvestDate: formHarvestDate,
        moistureLevel: formMoisture,
        dryingTimeHours: Number(formDryingTime) || 16,
        unFaoZone: editingProduct?.traceability.unFaoZone || "Lower Riparian Belt (FAO Zone 12)",
        labCertificateNo: formLabCertificate,
        testDate: editingProduct?.traceability.testDate || "June 2026",
        heavyMetalsStatus: "None Detected",
        pesticideStatus: "0.00% Chemical Residue",
        yeastMoldCount: "< 10 CFU/g (Excellent)",
        microbialStatus: "Compliant",
        phLevel: editingProduct?.traceability.phLevel || "4.2",
        bxSweetnessRating: formBrix
      }
    };

    const stored = localStorage.getItem("hh_products");
    const currentList = stored ? JSON.parse(stored) : BRAND_PRODUCTS;

    let newList;
    if (editingProduct) {
      newList = currentList.map((p: Product) => p.id === id ? updatedProduct : p);
    } else {
      newList = [...currentList, updatedProduct];
    }

    localStorage.setItem("hh_products", JSON.stringify(newList));
    setProducts(newList);

    // Close forms
    setEditingProduct(null);
    setIsAddingProduct(false);

    // Auto set forecast selected
    setSelectedForecastProduct(updatedProduct);
  };

  const handleDeleteProduct = (productId: string) => {
    if (!window.confirm("Are you sure you want to decommission this cultivar from active rosters?")) return;
    const stored = localStorage.getItem("hh_products");
    const currentList = stored ? JSON.parse(stored) : BRAND_PRODUCTS;
    const newList = currentList.filter((p: Product) => p.id !== productId);
    localStorage.setItem("hh_products", JSON.stringify(newList));
    setProducts(newList);
    if (selectedForecastProduct?.id === productId) {
      setSelectedForecastProduct(newList[0] || null);
    }
    if (selectedProductToOrder?.id === productId) {
      setSelectedProductToOrder(newList[0] || null);
    }
  };

  // Local ordering states
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedProductToOrder, setSelectedProductToOrder] = useState<Product | null>(null);
  const [dashboardOrderQty, setDashboardOrderQty] = useState(1);
  const [availability, setAvailability] = useState<Record<string, { onHandBoxes: number; nextRestockAt?: string | null }>>({});
  const [orderMessage, setOrderMessage] = useState("");

  // Monitor initialProductToOrder from landing page
  useEffect(() => {
    if (initialProductToOrder) {
      setIsPlacingOrder(true);
      // Ensure we find the product from our local editable list if possible
      const currentList = products.length > 0 ? products : BRAND_PRODUCTS;
      const found = currentList.find(p => p.id === initialProductToOrder.id) || initialProductToOrder;
      setSelectedProductToOrder(found);
      setDashboardOrderQty(1);
      setCurrentSection("ledger");
      if (onClearInitialProduct) {
        onClearInitialProduct();
      }
    }
  }, [initialProductToOrder, onClearInitialProduct, products]);

  // Load orders from Firestore matching current user exclusively
  const loadOrders = () => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    getTradeDashboard()
      .then((dashboard) => {
        setOrders(dashboard.orders || []);
        setOutstandingBalance(Number(dashboard.profile?.outstandingBalance || 0));
        setCreditLimit(Number((dashboard.profile as any)?.creditLimit || 0));
        setAvailability(Object.fromEntries((dashboard.inventory || []).map(item => [item.productId, { onHandBoxes: Number(item.onHandBoxes || 0), nextRestockAt: item.nextRestockAt }])));
      })
      .catch((err) => {
        console.warn("Secure trade dashboard unavailable; checking legacy ledger:", err);
        fbGetOrders(currentUser.mobile).then(setOrders).catch(() => setOrders([]));
      });
  };

  const fetchOutstandingBalance = () => {
    if (!currentUser) return;

    fbGetAllUsers()
      .then((users) => {
        if (users && users.length > 0) {
          const matched = users.find(u => u.mobile.replace(/\D/g, "") === currentUser.mobile.replace(/\D/g, ""));
          if (matched) {
            setOutstandingBalance(matched.outstandingBalance || 0);
            return;
          }
        }
        loadLocalOutstanding();
      })
      .catch((err) => {
        console.warn("Could not load outstanding balance from Firestore, using local fallback:", err);
        loadLocalOutstanding();
      });

    function loadLocalOutstanding() {
      const usersData = localStorage.getItem("hh_registered_users");
      if (usersData) {
        try {
          const users: User[] = JSON.parse(usersData);
          const matched = users.find(u => u.mobile.replace(/\D/g, "") === currentUser.mobile.replace(/\D/g, ""));
          if (matched) {
            setOutstandingBalance(matched.outstandingBalance || 0);
          } else {
            setOutstandingBalance(0);
          }
        } catch (e) {
          setOutstandingBalance(0);
        }
      }
    }
  };

  useEffect(() => {
    loadOrders();
    fetchOutstandingBalance();
    // Setup simple interval to check for changes
    const interval = setInterval(() => {
      loadOrders();
      fetchOutstandingBalance();
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Update order status in Firebase
  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      await fbUpdateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.warn("Could not update order status in Firestore:", err);
    }
  };

  const handlePlaceDashboardOrder = async (productId: string, qty: number) => {
    if (!currentUser) return;

    // Check outstanding debt block
    if (creditLimit > 0 && outstandingBalance > creditLimit) {
      alert("Please contact accounts before placing another order.");
      return;
    }

    const currentList = products.length > 0 ? products : BRAND_PRODUCTS;
    const prod = currentList.find(p => p.id === productId) || currentList[0];

    // Check order value limit constraint
    const price = prod.price || 15;
    const totalCost = qty * price;
    if (creditLimit > 0 && outstandingBalance + totalCost > creditLimit) {
      alert(`This order exceeds the available account facility. Please contact accounts.`);
      return;
    }

    const totalUnits = qty * 24;
    const totalWeightKg = parseFloat((qty * 2.4).toFixed(1));
    const orderId = `HH-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderDate = new Date().toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    const order: Order = {
      id: orderId,
      productId: prod.id,
      productName: prod.name,
      productImageUrl: prod.imageUrl,
      qty: qty,
      totalWeightKg: totalWeightKg,
      totalUnits: totalUnits,
      userMobile: currentUser.mobile,
      userName: currentUser.contactName,
      userCompany: currentUser.company,
      userState: currentUser.state,
      date: orderDate,
      status: "Approved",
      totalCost: totalCost
    };

    try {
      const result = await placeAllocatedTradeOrder([{ productId: prod.id, boxes: qty }]);
      const placed = { ...order, ...result.order, productImageUrl: prod.imageUrl } as Order;
      setOrders(prev => [placed, ...prev]);
      if (placed.backOrderedBoxes) {
        setOrderMessage(`${placed.allocatedBoxes || 0} boxes reserved now; ${placed.backOrderedBoxes} placed on priority back order.`);
      } else {
        setOrderMessage(`${qty} boxes reserved from available warehouse stock.`);
      }
      await loadOrders();
    } catch (err) {
      setOrderMessage(err instanceof Error ? err.message : "The order could not be reserved.");
      return;
    }

    setIsPlacingOrder(false);
  };

  // Filter orders based on tabs, search and status filters
  const filteredOrders = orders.filter(ord => {
    // 1. Tab Filter
    if (activeTab === "active" && (ord.status === "Delivered" || ord.status === "Canceled")) {
      return false;
    }

    // 2. Status Select Filter
    if (filterStatus !== "All" && ord.status !== filterStatus) {
      return false;
    }

    // 3. Search Query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchId = ord.id.toLowerCase().includes(query);
      const matchProduct = ord.productName.toLowerCase().includes(query);
      const matchDest = ord.userState.toLowerCase().includes(query);
      const matchInvoice = ord.status === "Delivered" && "invoice".includes(query);
      return matchId || matchProduct || matchDest || matchInvoice;
    }

    return true;
  });

  // Calculate high quality stats
  const totalBoxes = orders.reduce((sum, o) => sum + o.qty, 0);
  const totalWeight = parseFloat(orders.reduce((sum, o) => sum + o.totalWeightKg, 0).toFixed(1));
  const activeCount = orders.filter(o => o.status !== "Delivered" && o.status !== "Canceled").length;
  const deliveredCount = orders.filter(o => o.status === "Delivered").length;

  // Style and descriptor configuration for statuses
  const getStatusConfig = (status: Order["status"]) => {
    switch (status) {
      case "Approved":
      case "Allocated":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          indicatorBg: "bg-emerald-500",
          icon: CheckCircle2,
          label: "Approved & Verified",
          desc: "Available export documentation recorded for this order."
        };
      case "Partially allocated":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          indicatorBg: "bg-amber-500",
          icon: Package,
          label: "Partially allocated",
          desc: "Available stock is reserved. The remaining quantity is on priority back order."
        };
      case "Back-ordered":
        return {
          bg: "bg-[#F5F0E1] text-[#1C3B2F] border-[#D4AF37]/40",
          indicatorBg: "bg-[#D4AF37]",
          icon: Calendar,
          label: "Priority back order",
          desc: "Your position is secured against the next available production batch."
        };
      case "Preparing":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          indicatorBg: "bg-amber-500",
          icon: Package,
          label: "Preparing Cargo",
          desc: "Aseptic vacuum packing. Temperature cold-chain logging initialized."
        };
      case "On the Way":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          indicatorBg: "bg-blue-500",
          icon: Truck,
          label: "On the Way",
          desc: "Transferred to climate-controlled freight. In transit to destination hub."
        };
      case "Delivered":
        return {
          bg: "bg-teal-50 text-teal-800 border-teal-200",
          indicatorBg: "bg-teal-500",
          icon: Check,
          label: "Delivered",
          desc: "Successfully arrived at consignee's warehouse. Seals verified intact."
        };
      case "Canceled":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          indicatorBg: "bg-rose-500",
          icon: Ban,
          label: "Canceled",
          desc: "Allocation cancelled. Cargo return checklist initiated."
        };
      default:
        return {
          bg: "bg-gray-50 text-gray-800 border-gray-200",
          indicatorBg: "bg-gray-500",
          icon: HelpCircle,
          label: "Unspecified",
          desc: "Pending initial sovereign clearance audit."
        };
    }
  };

  return (
    <div className="w-full bg-[#F5F0E1] min-h-screen relative pb-20 select-text overflow-hidden">
      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      {/* Modern Background Image with subtle overlays for the entire Dashboard */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src={heroBackgroundImage}
          alt="Lush agricultural background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover opacity-[0.05] mix-blend-multiply filter blur-[3px] scale-110"
        />
        <div className="absolute inset-0 bg-[#F5F0E1]/30" />
      </div>

      {/* Background patterns */}
      <div className="absolute inset-0 bg-grain opacity-10 pointer-events-none z-0" />

      {/* Hero Banner Header */}
      <div className="bg-[#1C3B2F] py-14 px-4 sm:px-6 lg:px-8 border-b-2 border-[#D4AF37] relative text-center text-white overflow-hidden">
        {/* Modern Background Image with subtle overlays */}
        <img
          src={heroBackgroundImage}
          alt="Lush Agricultural Plains background"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-35 mix-blend-luminosity scale-105 pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1C3B2F]/75 via-[#1C3B2F]/55 to-[#1C3B2F]/85 pointer-events-none" />
        <div className="absolute inset-0 bg-grain-dark opacity-10 pointer-events-none" />
        <div className="absolute inset-4 border border-[#D4AF37]/20 pointer-events-none rounded-xl" />

        {/* Elegant top-right exit button */}
        <button
          onClick={onBackToHome}
          className="hidden absolute top-4 right-4 sm:top-6 sm:right-6 z-30 p-2.5 bg-white/10 hover:bg-rose-600 text-[#D4AF37] hover:text-white border border-[#D4AF37]/30 hover:border-rose-500 rounded-full transition-all cursor-pointer shadow-lg group flex items-center justify-center"
          title="Exit Dashboard"
          aria-label="Exit Dashboard"
          id="consignee-exit-btn"
        >
          <X className="w-5 h-5 transition-transform group-hover:rotate-90" />
        </button>

        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 px-3 py-1 rounded-full border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-mono font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Sovereign Ledger & Trade Desk</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide">
            Consignee Order Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-brand-cream/80 max-w-2xl mx-auto font-mono">
            Direct real-time tracking, customs clearance audit logs, and digital dispatch logs for premium Horn & Harvest wholesale cargo shipments.
          </p>

          <div className="hidden justify-center pt-2">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white text-white hover:text-[#1C3B2F] border border-white/20 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Storefront</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 relative z-10">
        {!currentUser ? (
          /* Inline authentication form directly on page */
          <div className="max-w-md mx-auto my-6 animate-fadeIn">
            <AuthModal inline={true} onAuthSuccess={onAuthSuccess || (() => {})} />
          </div>
        ) : (
          /* Active Logged-In Portal Page */
          <div className="space-y-8">

            {/* Top Welcome / Header info */}
            <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
              <div className="absolute inset-1.5 border border-[#D4AF37]/10 pointer-events-none rounded-xl" />

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#1C3B2F] rounded-xl flex items-center justify-center text-[#D4AF37] shrink-0 border border-[#D4AF37]/30">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#1C3B2F]/60 tracking-wider">Registered Import Firm</span>
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1C3B2F]">
                    {currentUser.company}
                  </h2>
                  <p className="text-xs text-[#1C3B2F]/70 font-mono mt-0.5">
                    Authorized Representative: {currentUser.contactName} ({currentUser.mobile})
                  </p>
                </div>
              </div>

              {/* Real-time Consignment Credit Ledger & Limits Indicator */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border-l-0 md:border-l border-dashed border-[#D4AF37]/40 md:pl-6 w-full md:w-auto">
                <div className="bg-[#F5F0E1] p-3 rounded-xl border border-[#D4AF37]/35 text-center flex-1 sm:flex-none min-w-[140px]">
                  <span className="text-[9px] font-mono uppercase text-[#1C3B2F]/70 block">Outstanding Debt</span>
                  <span className={`text-base font-mono font-bold ${
                    outstandingBalance > 0 ? "text-rose-600 animate-pulse" : "text-emerald-700"
                  }`}>
                    ${outstandingBalance.toFixed(2)}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 block mt-0.5">
                    {outstandingBalance > 0 ? "⚠️ Locked" : "✓ Paid Clear"}
                  </span>
                </div>

                <div className="bg-[#F5F0E1] p-3 rounded-xl border border-[#D4AF37]/35 text-center flex-1 sm:flex-none min-w-[140px]">
                  <span className="text-[9px] font-mono uppercase text-[#1C3B2F]/70 block">Reorder Capacity</span>
                  <span className="text-base font-mono font-bold text-[#1C3B2F]">
                    {outstandingBalance > 0 ? "$0.00" : "$100.00 Max"}
                  </span>
                  <span className="text-[9px] font-mono text-gray-500 block mt-0.5">
                    Per Order Limit
                  </span>
                </div>
              </div>

              <div className="flex gap-2 shrink-0 w-full md:w-auto">
                {!isPlacingOrder && (
                  <button
                    onClick={() => {
                      setIsPlacingOrder(true);
                      setSelectedProductToOrder(products[0] || BRAND_PRODUCTS[0]);
                      setDashboardOrderQty(1);
                    }}
                    className="flex-1 md:flex-none px-4 py-2 bg-[#1C3B2F] text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1C3B2F] rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>New Allocation</span>
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="hidden flex-1 md:flex-none px-4 py-2 border border-rose-200 hover:border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  Disconnect Session
                </button>
              </div>
            </div>

            {isPlacingOrder ? (
              /* Embedded Order Booking Flow */
              <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 shadow-sm relative text-left space-y-8">
                <div className="absolute inset-1.5 border border-[#D4AF37]/10 pointer-events-none rounded-xl" />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D4AF37]/25 pb-4">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-[#1C3B2F] flex items-center gap-2">
                      <ShoppingBag className="w-6 h-6 text-[#D4AF37]" />
                      Direct Consignment Booking Desk
                    </h3>
                    <p className="text-xs text-[#1C3B2F]/70 font-mono mt-0.5">
                      Select a premium product allocation and specify bulk dispatch volume.
                    </p>
                  </div>

                  <button
                    onClick={() => setIsPlacingOrder(false)}
                    className="self-start sm:self-center px-4 py-2 bg-[#F5F0E1]/45 hover:bg-[#F5F0E1] border border-[#D4AF37]/30 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-[#1C3B2F] transition-all cursor-pointer"
                  >
                    Cancel & Back to Ledger
                  </button>
                </div>

                {/* Step 1: Select Cargo Product */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C3B2F]/80 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-[#1C3B2F] text-white rounded-full flex items-center justify-center text-[10px] font-mono">1</span>
                    Select Cargo Item
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {(products.length > 0 ? products : BRAND_PRODUCTS).map((prod) => {
                      const isSelected = selectedProductToOrder?.id === prod.id;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setSelectedProductToOrder(prod);
                            setDashboardOrderQty(1);
                          }}
                          className={`p-3 rounded-xl border text-left flex flex-col justify-between space-y-3.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#1C3B2F] border-[#D4AF37] text-white shadow-md scale-[1.02]"
                              : "bg-[#F5F0E1]/20 hover:bg-[#F5F0E1]/50 border-[#D4AF37]/20 text-[#1C3B2F]"
                          }`}
                        >
                          <div className="space-y-2">
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className={`w-full h-20 object-cover rounded-lg border shrink-0 ${
                                isSelected ? "border-[#D4AF37]" : "border-gray-100"
                              }`}
                            />
                            <div>
                              <h5 className={`font-serif font-bold text-xs line-clamp-1 ${isSelected ? "text-white" : "text-[#1C3B2F]"}`}>
                                {prod.name}
                              </h5>
                              <p className={`text-[10px] font-sans line-clamp-1 mt-0.5 ${isSelected ? "text-brand-cream/60" : "text-[#1C3B2F]/60"}`}>
                                {prod.scientificName}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-[9px] font-mono border-t border-[#D4AF37]/10 pt-2 w-full">
                            <span className={isSelected ? "text-brand-gold" : "text-[#1C3B2F]/70"}>
                              Brix: {prod.traceability.bxSweetnessRating}
                            </span>
                            <span className={isSelected ? "text-[#D4AF37] font-bold" : "text-[#D4AF37] font-semibold"}>
                              {isSelected ? "Selected" : "Choose"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedProductToOrder && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-dashed border-[#D4AF37]/20">

                    {/* Left sub-column: Volume configuration */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C3B2F]/80 flex items-center gap-1.5">
                          <span className="w-5 h-5 bg-[#1C3B2F] text-white rounded-full flex items-center justify-center text-[10px] font-mono">2</span>
                          Configure Allocation Volume
                        </h4>

                        <div className="bg-[#F5F0E1]/40 border border-[#D4AF37]/20 rounded-xl p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D4AF37]/20 pb-4">
                            <div>
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1C3B2F]/55 block">Warehouse availability</span>
                              <strong className="font-serif text-xl text-[#1C3B2F]">{availability[selectedProductToOrder.id]?.onHandBoxes ?? "—"} boxes ready</strong>
                            </div>
                            {availability[selectedProductToOrder.id]?.nextRestockAt && <div className="text-right">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#1C3B2F]/55 block">Next confirmed batch</span>
                              <strong className="text-sm text-[#1C3B2F]">{new Date(availability[selectedProductToOrder.id].nextRestockAt as string).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>
                            </div>}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-mono font-bold text-[#1C3B2F] block">
                                NUMBER OF BOXES
                              </span>
                              <span className="text-[11px] text-[#1C3B2F]/60 font-sans block mt-0.5">
                                Standard 2.4kg boxes (24 nitrogen packs of 100g)
                              </span>
                            </div>

                            {/* Stepper */}
                            <div className="flex items-center gap-2 bg-white border-2 border-[#D4AF37]/45 rounded-xl p-1.5 shadow-xs shrink-0 self-start sm:self-center">
                              <button
                                type="button"
                                onClick={() => setDashboardOrderQty(prev => Math.max(1, prev - 1))}
                                className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-[#1C3B2F] transition-all cursor-pointer"
                              >
                                <Minus className="w-4 h-4 stroke-[2.5]" />
                              </button>

                              <input
                                type="number"
                                min="1"
                                value={dashboardOrderQty}
                                onChange={(e) => setDashboardOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 text-center text-base font-bold font-mono text-[#1C3B2F] focus:outline-none"
                              />

                              <button
                                type="button"
                                onClick={() => setDashboardOrderQty(prev => prev + 1)}
                                className="p-1.5 rounded-lg bg-[#D4AF37] text-[#1C3B2F] hover:bg-[#D4AF37]/90 transition-all cursor-pointer"
                              >
                                <Plus className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            </div>
                          </div>

                          {/* Cargo Weight Computations banner */}
                          <div className="grid grid-cols-3 gap-2 text-center font-mono py-3 border-t border-[#D4AF37]/15">
                            <div>
                              <span className="text-[#1C3B2F]/50 text-[9px] uppercase block">Total Boxes</span>
                              <strong className="text-[#1C3B2F] text-base">{dashboardOrderQty}</strong>
                            </div>
                            <div>
                              <span className="text-[#1C3B2F]/50 text-[9px] uppercase block">Total Units</span>
                              <strong className="text-[#1C3B2F] text-base">{dashboardOrderQty * 24}</strong>
                            </div>
                            <div>
                              <span className="text-[#1C3B2F]/50 text-[9px] uppercase block">Total Weight</span>
                              <strong className="text-emerald-700 text-base">{parseFloat((dashboardOrderQty * 2.4).toFixed(1))} kg</strong>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pre-filled Consignee details summary */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C3B2F]/80">
                          Consignee Dispatch Profile
                        </h4>
                        <div className="bg-emerald-50/50 border-2 border-emerald-500/15 rounded-xl p-4 text-xs text-[#1C3B2F]/90 space-y-1.5 font-sans">
                          <p><strong>Corporate Firm Name:</strong> {currentUser.company}</p>
                          <p><strong>Importer Contact Name:</strong> {currentUser.contactName}</p>
                          <p><strong>Destination State/Region:</strong> {currentUser.state}</p>
                          <p><strong>Mobile Tracking Number:</strong> {currentUser.mobile}</p>
                          <span className="bg-emerald-600/10 text-emerald-800 text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-1">
                            ✓ Authenticated Importer Account Pre-authorized
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right sub-column: Traceability Preview */}
                    <div className="lg:col-span-5 bg-[#F5F0E1]/25 border border-[#D4AF37]/20 rounded-xl p-5 space-y-4">
                      <h4 className="font-serif font-bold text-[#1C3B2F] text-sm flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-[#D4AF37]" />
                        Sovereign Audit Record
                      </h4>

                      <div className="space-y-2.5 text-xs font-mono text-[#1C3B2F]/85">
                        <div className="bg-white p-2.5 rounded border border-[#D4AF37]/15">
                          <span className="text-[9px] text-[#1C3B2F]/50 uppercase block">Active Batch ID</span>
                          <strong className="text-sm font-bold text-[#1C3B2F]">{selectedProductToOrder.traceability.batchNumber}</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-[#D4AF37]/15">
                          <span className="text-[9px] text-[#1C3B2F]/50 uppercase block">Origin Basin</span>
                          <strong>{selectedProductToOrder.traceability.sourceValley}</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-[#D4AF37]/15">
                          <span className="text-[9px] text-[#1C3B2F]/50 uppercase block">UN FAO Zone</span>
                          <strong>{selectedProductToOrder.traceability.unFaoZone}</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded border border-[#D4AF37]/15">
                          <span className="text-[9px] text-[#1C3B2F]/50 uppercase block">Pesticide Residue</span>
                          <strong className="text-emerald-700">0.00% Chemical Residue (Passed)</strong>
                        </div>
                      </div>

                      {/* Rule-based allocation block validation alerts */}
                      {(() => {
                        const price = selectedProductToOrder.price || 15;
                        const orderCost = dashboardOrderQty * price;
                        const isBlockedByDebt = creditLimit > 0 && outstandingBalance > creditLimit;
                        const isBlockedByLimit = creditLimit > 0 && outstandingBalance + orderCost > creditLimit;

                        return (
                          <div className="space-y-4">
                            {isBlockedByDebt ? (
                              <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-left space-y-1">
                                <span className="text-[10px] font-mono text-rose-800 font-bold uppercase block">⚠️ Allocation Blocked</span>
                                <p className="text-[10px] text-rose-700 leading-normal">
                                  Your account requires attention before a new allocation can be confirmed. Please contact Horn & Harvest accounts.
                                </p>
                              </div>
                            ) : isBlockedByLimit ? (
                              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-left space-y-1">
                                <span className="text-[10px] font-mono text-amber-800 font-bold uppercase block">⚠️ Value Limit Exceeded</span>
                                <p className="text-[10px] text-amber-700 leading-normal">
                                  This order exceeds your currently available account facility. Please reduce the volume or contact accounts.
                                </p>
                              </div>
                            ) : (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-left">
                                <p className="text-[10px] text-emerald-800 font-mono">
                                  ✓ Account clear to order. Estimated value: <strong>${orderCost.toFixed(2)}</strong>{creditLimit > 0 ? ` · Facility $${creditLimit.toFixed(2)}` : ""}.
                                </p>
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={isBlockedByDebt || isBlockedByLimit}
                              onClick={() => handlePlaceDashboardOrder(selectedProductToOrder.id, dashboardOrderQty)}
                              className={`w-full py-3.5 border-2 transition-all rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md ${
                                isBlockedByDebt || isBlockedByLimit
                                  ? "bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-60"
                                  : "bg-[#1C3B2F] text-[#D4AF37] border-[#D4AF37] hover:bg-white hover:text-[#1C3B2F] cursor-pointer"
                              }`}
                            >
                              <ShoppingBag className="w-4 h-4" />
                              <span>Submit Allocation (${orderCost.toFixed(2)})</span>
                            </button>
                            {orderMessage && <p className="rounded-lg border border-[#D4AF37]/35 bg-white p-3 text-[11px] leading-relaxed text-[#1C3B2F]" role="status">{orderMessage}</p>}
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <>
                {true ? (
                  <div className="space-y-8 animate-fadeIn">
                    {/* Performance KPIs Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Active Consignments", value: `${activeCount} Units`, color: "text-[#1C3B2F]" },
                        { label: "Delivered Batches", value: `${deliveredCount} Batches`, color: "text-emerald-700" },
                        { label: "Total Cargo Volume", value: `${totalBoxes} Boxes`, color: "text-brand-gold-dark" },
                        { label: "Net Weight", value: `${totalWeight} kg`, color: "text-[#1C3B2F]" }
                      ].map((kpi, kIdx) => (
                        <div key={kIdx} className="bg-white border border-[#D4AF37]/20 rounded-xl p-4 text-center shadow-xs">
                          <span className="text-[9px] font-mono uppercase text-[#1C3B2F]/60 tracking-wider block mb-1">
                            {kpi.label}
                          </span>
                          <span className={`text-lg sm:text-xl md:text-2xl font-mono font-bold ${kpi.color}`}>
                            {kpi.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Main Ledger Filter & Display Board */}
                    <div className="space-y-6">

                      {/* Filter Toolbelt */}
                      <div className="bg-white border border-[#D4AF37]/30 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">

                        {/* Search Bar */}
                        <div className="relative w-full md:max-w-xs">
                          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#D4AF37]" />
                          <input
                            type="text"
                            placeholder="Search Order ID or Product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-[#F5F0E1]/40 border border-[#D4AF37]/30 rounded-lg text-xs font-mono text-[#1C3B2F] placeholder-[#1C3B2F]/55 focus:outline-none focus:border-[#D4AF37]"
                          />
                        </div>

                        {/* Dropdown status selection */}
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#1C3B2F]/60">Status:</span>
                            <select
                              value={filterStatus}
                              onChange={(e) => setFilterStatus(e.target.value)}
                              className="px-3 py-1.5 bg-[#F5F0E1]/40 border border-[#D4AF37]/30 rounded-lg text-xs font-mono text-[#1C3B2F] focus:outline-none focus:border-[#D4AF37]"
                            >
                              <option value="All">All Statuses</option>
                              <option value="Approved">Approved</option>
                              <option value="Preparing">Preparing</option>
                              <option value="On the Way">On the Way</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Canceled">Canceled</option>
                            </select>
                          </div>

                          {/* Active/History Tab */}
                          <div className="flex bg-[#F5F0E1]/60 p-1 border border-[#D4AF37]/30 rounded-lg">
                            <button
                              onClick={() => setActiveTab("active")}
                              className={`px-3 py-1 text-[10px] font-mono uppercase font-bold rounded-md transition-all ${
                                activeTab === "active"
                                  ? "bg-[#1C3B2F] text-white"
                                  : "text-[#1C3B2F]/60 hover:text-[#1C3B2F]"
                              }`}
                            >
                              In Transit
                            </button>
                            <button
                              onClick={() => setActiveTab("all")}
                              className={`px-3 py-1 text-[10px] font-mono uppercase font-bold rounded-md transition-all ${
                                activeTab === "all"
                                  ? "bg-[#1C3B2F] text-white"
                                  : "text-[#1C3B2F]/60 hover:text-[#1C3B2F]"
                              }`}
                            >
                              Order History ({orders.length})
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Grid of Order items */}
                      {filteredOrders.length === 0 ? (
                        <div className="text-center py-16 bg-white border border-dashed border-[#D4AF37]/40 rounded-2xl space-y-4">
                          <ShoppingBag className="w-12 h-12 text-[#D4AF37]/30 mx-auto" />
                          <h4 className="font-serif text-lg font-bold text-[#1C3B2F]">No Consignments Resolved</h4>
                          <p className="text-xs text-[#1C3B2F]/60 max-w-sm mx-auto leading-relaxed">
                            No active allocations matched your filters. Place an order or adjust your query.
                          </p>
                          <button
                            onClick={() => {
                              setIsPlacingOrder(true);
                              setSelectedProductToOrder(products[0] || BRAND_PRODUCTS[0]);
                              setDashboardOrderQty(1);
                            }}
                            className="px-4 py-2 bg-[#1C3B2F] text-[#D4AF37] font-mono text-xs font-bold uppercase rounded-lg hover:bg-white hover:text-[#1C3B2F] transition-all cursor-pointer border border-[#D4AF37] flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>Book Your First Allocation</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {filteredOrders.map((ord) => {
                            const config = getStatusConfig(ord.status);
                            const StatusIcon = config.icon;

                            return (
                              <div
                                key={ord.id}
                                className="bg-white border-2 border-[#D4AF37]/30 hover:border-[#D4AF37]/60 rounded-xl p-5 shadow-xs relative text-left flex flex-col justify-between space-y-4 transition-all"
                              >
                                {/* Upper Card Segment */}
                                <div className="space-y-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4AF37]/10 pb-3">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-mono bg-[#1C3B2F] text-[#D4AF37] px-2 py-0.5 rounded font-bold tracking-wider mr-2">
                                        {ord.id}
                                      </span>
                                      <span className="text-[10px] text-[#1C3B2F]/50 font-mono">
                                        {ord.date.split(" at ")[0]}
                                      </span>
                                    </div>

                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-full border ${config.bg}`}>
                                      <StatusIcon className="w-3.5 h-3.5" />
                                      <span>{ord.status}</span>
                                    </span>
                                  </div>

                                  <div className="customer-order-actions">
                                    <AccountDelivery order={ord}/>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const product = products.find((item) => item.id === ord.productId)
                                          || BRAND_PRODUCTS.find((item) => item.id === ord.productId);
                                        if (product) {
                                          setSelectedProductToOrder(product);
                                          setDashboardOrderQty(Math.max(1, ord.qty));
                                          setCurrentSection("products");
                                        }
                                      }}
                                    >
                                      Reorder
                                    </button>
                                    {ord.status === "Delivered" && (
                                      <button type="button" onClick={() => setInvoiceOrder(ord)}>
                                        Invoice
                                      </button>
                                    )}
                                  </div>

                                  {/* Cargo Description */}
                                  <div className="flex gap-4">
                                    <img
                                      src={ord.productImageUrl}
                                      alt={ord.productName}
                                      className="w-16 h-16 object-cover rounded-xl border border-[#D4AF37]/25 bg-[#1C3B2F]/5 shrink-0"
                                    />
                                    <div className="space-y-1.5 flex-1">
                                      <h6 className="font-serif font-bold text-[#1C3B2F] text-base leading-tight">
                                        {ord.productName}
                                      </h6>

                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-[#1C3B2F]/80">
                                        <div>📦 Volume: <strong className="text-[#1C3B2F]">{ord.qty} Boxes</strong></div>
                                        <div>⚖️ Weight: <strong className="text-emerald-700">{ord.totalWeightKg} kg</strong></div>
                                        <div>📦 Units: <strong>{ord.totalUnits} packs</strong></div>
                                        <div>📍 Region: <strong>{ord.userState}</strong></div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Dynamic Transit Visual Stepper */}
                                  <div className="bg-[#F5F0E1]/40 border border-[#D4AF37]/20 rounded-xl p-4 space-y-4">
                                    <div className="text-[10px] font-mono text-[#1C3B2F]/75 flex justify-between items-center">
                                      <span>📍 Target Port: <strong className="text-[#1C3B2F]">{ord.userState} Hub</strong></span>
                                      <span className="font-bold">Clearance Progress</span>
                                    </div>

                                    {/* Stepper bar */}
                                    <div className="relative pt-1">
                                      <div className="absolute top-[18px] left-3 right-3 h-0.5 bg-gray-200 z-0" />

                                      <div className="relative z-10 flex justify-between">
                                        {STATUS_FLOW.map((step, idx) => {
                                          const isCompleted = STATUS_FLOW.indexOf(ord.status) >= idx && ord.status !== "Canceled";
                                          const isActive = ord.status === step;

                                          return (
                                            <div key={step} className="flex flex-col items-center">
                                              <div
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-mono font-bold border transition-all ${
                                                  isCompleted
                                                    ? "bg-[#1C3B2F] text-[#D4AF37] border-[#D4AF37]"
                                                    : "bg-white text-gray-400 border-gray-200"
                                                } ${isActive ? "ring-2 ring-[#D4AF37] scale-110" : ""}`}
                                              >
                                                {idx + 1}
                                              </div>
                                              <span className={`text-[8px] font-mono mt-1 font-semibold tracking-tight ${
                                                isActive ? "text-[#1C3B2F] font-bold" : "text-gray-400"
                                              }`}>
                                                {step}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    <div className="border-t border-[#D4AF37]/10 pt-2.5 text-[10px] leading-relaxed text-[#1C3B2F]/75">
                                      <span className="font-bold text-[#1C3B2F] block mb-0.5">{config.label}</span>
                                      {config.desc}
                                    </div>
                                  </div>
                                </div>

                                {/* Interactive Testing Controller segment for testing all 5 states */}
                                <div className="bg-[#1C3B2F]/5 border border-[#D4AF37]/25 rounded-xl p-3.5 space-y-2.5">
                                  <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase font-bold text-[#1C3B2F]/70">
                                    <Sliders className="w-3.5 h-3.5 text-[#D4AF37]" />
                                    <span>Sovereign Customs Simulator (Simulate Statuses)</span>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5">
                                    {(["Approved", "Preparing", "On the Way", "Delivered", "Canceled"] as Order["status"][]).map((st) => (
                                      <button
                                        key={st}
                                        onClick={() => updateOrderStatus(ord.id, st)}
                                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                                          ord.status === st
                                            ? "bg-[#1C3B2F] text-[#D4AF37] border-[#D4AF37] shadow-xs scale-[1.02]"
                                            : "bg-white text-[#1C3B2F]/80 hover:bg-gray-100 border-gray-200"
                                        }`}
                                      >
                                        {st}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Modern Cultivar Management & Interactive Forecasting View */
                  <div className="space-y-8 animate-fadeIn text-left">

                    {/* Catalog Admin Section */}
                    <div className="bg-white border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 shadow-sm relative space-y-6">
                      <div className="absolute inset-1.5 border border-[#D4AF37]/10 pointer-events-none rounded-xl" />

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D4AF37]/20 pb-5">
                        <div>
                          <h3 className="font-serif text-2xl font-bold text-[#1C3B2F] flex items-center gap-2">
                            <Package className="w-6 h-6 text-[#D4AF37]" />
                            Registered Varieties & Cultivars
                          </h3>
                          <p className="text-xs text-[#1C3B2F]/70 font-mono mt-0.5">
                            Modify parameters of current heirlooms or register custom imported wholesale species.
                          </p>
                        </div>

                        <button
                          onClick={handleAddClick}
                          className="px-4 py-2.5 bg-[#1C3B2F] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1C3B2F] border border-[#D4AF37] rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Register Cultivar</span>
                        </button>
                      </div>

                      {/* Cultivar Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((prod) => (
                          <div
                            key={prod.id}
                            className="bg-[#F5F0E1]/25 border border-[#D4AF37]/20 rounded-xl p-5 hover:border-[#D4AF37]/40 transition-all flex flex-col justify-between gap-5 relative"
                          >
                            <div className="space-y-3">
                              <div className="relative h-32 w-full rounded-lg overflow-hidden border border-[#D4AF37]/10">
                                <img
                                  src={prod.imageUrl}
                                  alt={prod.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                                <span className="absolute top-2 right-2 bg-[#1C3B2F] text-[#D4AF37] border border-[#D4AF37]/40 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                                  Brix: {prod.traceability.bxSweetnessRating}
                                </span>
                              </div>

                              <div>
                                <h4 className="font-serif font-bold text-[#1C3B2F] text-base">{prod.name}</h4>
                                <span className="text-[10px] font-mono text-emerald-800 italic block">{prod.scientificName}</span>
                                <p className="text-xs text-[#1C3B2F]/75 mt-2 line-clamp-2">{prod.description}</p>
                              </div>

                              <div className="flex flex-wrap gap-1 mt-2">
                                {prod.badges.slice(0, 3).map(badge => (
                                  <span key={badge} className="bg-emerald-50 text-emerald-800 text-[8px] font-mono px-2 py-0.5 rounded border border-emerald-100">
                                    {badge}
                                  </span>
                                ))}
                              </div>

                              {/* Technical traceability readout */}
                              <div className="pt-3 border-t border-[#D4AF37]/15 grid grid-cols-2 gap-x-2 gap-y-1.5 text-[10px] font-mono text-[#1C3B2F]/75">
                                <div>
                                  <span className="text-gray-400 block text-[8px] uppercase">Moisture</span>
                                  <strong>{prod.traceability.moistureLevel}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 block text-[8px] uppercase">Drying Time</span>
                                  <strong>{prod.traceability.dryingTimeHours} hrs</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 block text-[8px] uppercase">Origin Valley</span>
                                  <strong className="truncate block">{prod.traceability.sourceValley}</strong>
                                </div>
                                <div>
                                  <span className="text-gray-400 block text-[8px] uppercase">Batch record</span>
                                  <strong className="truncate block text-[#D4AF37]">{prod.traceability.labCertificateNo}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Catalog action buttons */}
                            <div className="flex gap-2 pt-3 border-t border-dashed border-[#D4AF37]/15">
                              <button
                                onClick={() => handleEditClick(prod)}
                                className="flex-1 py-1.5 px-3 bg-[#F5F0E1] hover:bg-[#D4AF37]/15 border border-[#D4AF37]/35 text-[#1C3B2F] rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                              >
                                Edit Cultivar
                              </button>
                              <button
                                onClick={() => {
                                  setIsPlacingOrder(true);
                                  setSelectedProductToOrder(prod);
                                  setDashboardOrderQty(50);
                                }}
                                className="flex-1 py-1.5 px-3 bg-[#1C3B2F] hover:bg-[#D4AF37] hover:text-[#1C3B2F] border border-[#1C3B2F] text-[#D4AF37] rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                              >
                                Place Order
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="px-2 py-1.5 hover:bg-rose-50 text-rose-600 hover:text-rose-800 border border-transparent hover:border-rose-200 rounded-lg transition-all cursor-pointer"
                                title="Decommission Cultivar"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>

                    {/* Integrated Add/Edit Inline Dialog */}
                    {(isAddingProduct || editingProduct) && (
                      <div className="bg-[#1C3B2F] text-white border-2 border-[#D4AF37] rounded-2xl p-6 sm:p-8 relative space-y-6 shadow-xl animate-scaleIn">
                        <div className="absolute inset-1 border border-[#D4AF37]/20 pointer-events-none rounded-xl" />
                        <button
                          onClick={() => {
                            setIsAddingProduct(false);
                            setEditingProduct(null);
                          }}
                          className="absolute top-4 right-4 p-1 bg-white/5 hover:bg-white/10 rounded-full text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div>
                          <span className="text-[9px] font-mono uppercase text-[#D4AF37] tracking-wider block mb-1">
                            {editingProduct ? "Modification Protocol" : "Custom Registry Entrance"}
                          </span>
                          <h3 className="font-serif text-xl sm:text-2xl font-bold">
                            {editingProduct ? `Edit Cultivar Profile: ${editingProduct.name}` : "Register New Cultivar Variety"}
                          </h3>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-6">

                          {/* Core identification */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Cultivar Common Name
                              </label>
                              <input
                                type="text"
                                required
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="e.g. Shabelle Gold Sweet"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Botanical / Scientific Name
                              </label>
                              <input
                                type="text"
                                required
                                value={formSciName}
                                onChange={(e) => setFormSciName(e.target.value)}
                                placeholder="e.g. Mangifera indica L. (Hybrid)"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                          </div>

                          {/* Tagline & Badges */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Short Slogan / Tagline
                              </label>
                              <input
                                type="text"
                                required
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Naturally sun-dehydrated sweet organic fruit"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Custom Badges (comma separated)
                              </label>
                              <input
                                type="text"
                                value={formBadges}
                                onChange={(e) => setFormBadges(e.target.value)}
                                placeholder="Naturally dried, Carefully packed"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                          </div>

                          {/* Extended Description */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                              Extended Origin / Botanical History
                            </label>
                            <textarea
                              value={formExtDesc}
                              onChange={(e) => setFormExtDesc(e.target.value)}
                              placeholder="Describe the soil, riparian floods, or solar drying procedures that give this variety its distinguished taste profiles..."
                              rows={3}
                              className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#D4AF37] resize-none"
                            />
                          </div>

                          {/* Technical attributes */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Sweetness (Brix Rating)
                              </label>
                              <input
                                type="text"
                                required
                                value={formBrix}
                                onChange={(e) => setFormBrix(e.target.value)}
                                placeholder="22.5° Bx"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Moisture Stability
                              </label>
                              <input
                                type="text"
                                required
                                value={formMoisture}
                                onChange={(e) => setFormMoisture(e.target.value)}
                                placeholder="14.5%"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Dehydration Duration (hrs)
                              </label>
                              <input
                                type="number"
                                required
                                value={formDryingTime}
                                onChange={(e) => setFormDryingTime(Number(e.target.value) || 16)}
                                placeholder="18"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Batch record reference
                              </label>
                              <input
                                type="text"
                                required
                                value={formLabCertificate}
                                onChange={(e) => setFormLabCertificate(e.target.value)}
                                placeholder="Enter an approved reference"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                          </div>

                          {/* Geographic source & harvest period */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Source River Valley
                              </label>
                              <select
                                value={formValley}
                                onChange={(e) => setFormValley(e.target.value as any)}
                                className="w-full bg-[#1C3B2F] border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              >
                                <option value="Shabelle River Valley">Shabelle River Valley</option>
                                <option value="Juba River Valley">Juba River Valley</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Crop Altitude
                              </label>
                              <input
                                type="text"
                                value={formAltitude}
                                onChange={(e) => setFormAltitude(e.target.value)}
                                placeholder="80m above sea level"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                                Harvest Season Date
                              </label>
                              <input
                                type="text"
                                value={formHarvestDate}
                                onChange={(e) => setFormHarvestDate(e.target.value)}
                                placeholder="July 2026"
                                className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                              />
                            </div>
                          </div>

                          {/* Image Picker */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                              Select High-Resolution Cultivar Thumbnail
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { path: "/src/assets/images/regenerated_image_1782223583418.png", label: "Amber Slices" },
                                { path: "/src/assets/images/regenerated_image_1781794341750.png", label: "Equatorial Red Papaya" },
                                { path: "/src/assets/images/regenerated_image_1781793816992.jpg", label: "Fresh Golden Mango" },
                                { path: "/src/assets/images/regenerated_image_1781793815025.jpg", label: "Dehydration Trays" }
                              ].map(preset => {
                                const isSelected = formImage === preset.path;
                                return (
                                  <button
                                    key={preset.path}
                                    type="button"
                                    onClick={() => setFormImage(preset.path)}
                                    className={`p-1.5 rounded-lg border-2 text-left relative overflow-hidden transition-all cursor-pointer ${
                                      isSelected ? "border-[#D4AF37] bg-white/10" : "border-white/10 hover:border-white/30"
                                    }`}
                                  >
                                    <img
                                      src={preset.path}
                                      alt={preset.label}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-12 object-cover rounded"
                                    />
                                    <span className="text-[8px] font-mono block text-center mt-1 text-white/80">{preset.label}</span>
                                    {isSelected && (
                                      <div className="absolute top-1 right-1 bg-[#D4AF37] text-[#1C3B2F] rounded-full p-0.5">
                                        <Check className="w-2.5 h-2.5 font-bold" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Manual URL entry just in case */}
                            <input
                              type="text"
                              value={formImage}
                              onChange={(e) => setFormImage(e.target.value)}
                              placeholder="Or enter custom image URL"
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-mono text-white/70 focus:outline-none mt-2"
                            />
                          </div>

                          {/* Submit Actions */}
                          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingProduct(false);
                                setEditingProduct(null);
                              }}
                              className="px-4 py-2 bg-white/5 hover:bg-white/15 rounded-lg text-xs font-mono uppercase text-white transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-6 py-2 bg-[#D4AF37] text-[#1C3B2F] rounded-lg text-xs font-mono uppercase font-bold tracking-wider hover:bg-white hover:text-[#1C3B2F] transition-all cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{editingProduct ? "Save Changes" : "Register Cultivar"}</span>
                            </button>
                          </div>

                        </form>
                      </div>
                    )}

                    {/* forecasting module container */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                      {/* Left: Dynamic 6-Month Chart Model */}
                      <div className="lg:col-span-8 bg-white border border-[#D4AF37]/30 rounded-2xl p-6 sm:p-8 shadow-sm relative">
                        <div className="absolute inset-1.5 border border-[#D4AF37]/10 pointer-events-none rounded-xl" />

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4AF37]/15 pb-4 mb-6">
                          <div>
                            <h3 className="font-serif text-lg font-bold text-[#1C3B2F] flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                              Market Demand Estimations Model
                            </h3>
                            <p className="text-xs text-[#1C3B2F]/60 font-mono">
                              Simulating next 6 months of wholesale allocations (Standard Boxes) based on Gulf indices.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <span className="text-[10px] font-mono text-[#1C3B2F]/65">Target Cultivar:</span>
                            <select
                              value={selectedForecastProduct?.id || ""}
                              onChange={(e) => {
                                const found = products.find(p => p.id === e.target.value);
                                if (found) setSelectedForecastProduct(found);
                              }}
                              className="px-2.5 py-1.5 bg-[#F5F0E1]/50 border border-[#D4AF37]/30 rounded-lg text-xs font-mono text-[#1C3B2F] focus:outline-none"
                            >
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Interactive Demand Projection Calculation */}
                        {(() => {
                          const months = ["Jul '26", "Aug '26", "Sep '26", "Oct '26", "Nov '26", "Dec '26"];
                          const codeSum = (selectedForecastProduct?.id || "default").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
                          const multipliers = [1.0, 1.2, 1.5, 1.9, 1.6, 1.3];
                          const values = multipliers.map(m => Math.round(forecastMonthlyTarget * m * (1 + (codeSum % 4) / 10)));
                          const maxValue = Math.max(...values, 1);

                          return (
                            <div className="space-y-6">

                              {/* Custom Interactive SVG / CSS Chart */}
                              <div className="flex items-end justify-between h-48 pt-6 border-b border-[#D4AF37]/15 relative">
                                <div className="absolute left-0 right-0 top-0 border-t border-gray-100 border-dashed" />
                                <div className="absolute left-0 right-0 top-1/3 border-t border-gray-100 border-dashed" />
                                <div className="absolute left-0 right-0 top-2/3 border-t border-gray-100 border-dashed" />

                                {values.map((v, i) => {
                                  const heightPercent = (v / maxValue) * 85;
                                  return (
                                    <div key={i} className="flex-1 flex flex-col items-center group relative px-1">
                                      {/* Interactive Tooltip popup */}
                                      <div className="absolute bottom-full mb-2 bg-[#1C3B2F] text-[#D4AF37] text-[10px] font-mono py-1 px-2.5 rounded border border-[#D4AF37] opacity-0 group-hover:opacity-100 transition-all shadow-md pointer-events-none z-20 whitespace-nowrap">
                                        Estimated Allocation: {v} Boxes ({parseFloat((v * 2.4).toFixed(1))} kg)
                                      </div>

                                      {/* Bar */}
                                      <div
                                        style={{ height: `${Math.max(10, heightPercent)}%` }}
                                        className="w-full sm:w-12 bg-gradient-to-t from-[#1C3B2F] to-[#D4AF37]/85 hover:to-[#D4AF37] rounded-t transition-all cursor-pointer relative shadow-xs"
                                      >
                                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-all rounded-t" />
                                      </div>

                                      {/* Month Label */}
                                      <span className="text-[10px] font-mono text-[#1C3B2F]/75 font-bold mt-2">
                                        {months[i]}
                                      </span>
                                      <span className="text-[9px] font-sans text-emerald-800 font-bold block mt-0.5">
                                        {v} Bx
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanatory notes */}
                              <div className="bg-[#F5F0E1]/45 border border-[#D4AF37]/15 p-4 rounded-xl text-xs space-y-2 text-[#1C3B2F]/80">
                                <p>
                                  📊 <strong>Methodology:</strong> Predictions leverage active crop traceability attributes (Brix sweetness rating of <strong>{selectedForecastProduct?.traceability.bxSweetnessRating}</strong> and moisture rating of <strong>{selectedForecastProduct?.traceability.moistureLevel}</strong>). Forecasts require current sales and confirmed stock records.
                                </p>
                              </div>

                            </div>
                          );
                        })()}
                      </div>

                      {/* Right: Sandbox target configuration sliders & computations */}
                      <div className="lg:col-span-4 bg-white border border-[#D4AF37]/30 rounded-2xl p-6 shadow-sm relative space-y-6">
                        <div className="absolute inset-1.5 border border-[#D4AF37]/10 pointer-events-none rounded-xl" />

                        <div>
                          <h3 className="font-serif text-base font-bold text-[#1C3B2F] flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-[#D4AF37]" />
                            Forecast Configurator
                          </h3>
                          <p className="text-[11px] text-[#1C3B2F]/65 font-mono">
                            Adjust target allocation to compute required river logistics.
                          </p>
                        </div>

                        {/* Slider block */}
                        <div className="bg-[#F5F0E1]/30 border border-[#D4AF37]/15 rounded-xl p-4 space-y-3">
                          <div className="flex justify-between items-center text-xs font-mono">
                            <span className="text-gray-500 font-bold uppercase">Monthly Target</span>
                            <strong className="text-[#1C3B2F] text-sm">{forecastMonthlyTarget} Boxes</strong>
                          </div>

                          <input
                            type="range"
                            min="20"
                            max="800"
                            step="10"
                            value={forecastMonthlyTarget}
                            onChange={(e) => setForecastMonthlyTarget(Number(e.target.value))}
                            className="w-full accent-[#1C3B2F]"
                          />

                          <div className="flex justify-between text-[9px] font-mono text-gray-400">
                            <span>20 Boxes</span>
                            <span>800 Boxes (Bulk)</span>
                          </div>
                        </div>

                        {/* Real-time calculated outcomes */}
                        <div className="space-y-3 text-xs font-mono">
                          <h4 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Estimated Consignment Impact</h4>

                          <div className="space-y-2">
                            <div className="bg-[#F5F0E1]/20 p-2.5 rounded border border-[#D4AF37]/10 flex justify-between items-center">
                              <span className="text-gray-500">Net Cargo Weight</span>
                              <strong className="text-[#1C3B2F]">{(forecastMonthlyTarget * 2.4).toFixed(0)} kg</strong>
                            </div>
                            <div className="bg-[#F5F0E1]/20 p-2.5 rounded border border-[#D4AF37]/10 flex justify-between items-center">
                              <span className="text-gray-500">Retail Revenue (Est)</span>
                              <strong className="text-emerald-700">${(forecastMonthlyTarget * 92).toLocaleString()} USD</strong>
                            </div>
                            <div className="bg-[#F5F0E1]/20 p-2.5 rounded border border-[#D4AF37]/10 flex justify-between items-center">
                              <span className="text-gray-500">Vessel Cabin Volume</span>
                              <strong className="text-[#1C3B2F]">{(forecastMonthlyTarget * 0.012).toFixed(2)} m³</strong>
                            </div>
                            <div className="bg-[#F5F0E1]/20 p-2.5 rounded border border-[#D4AF37]/10 flex justify-between items-center">
                              <span className="text-gray-500">Dispatch priority</span>
                              <strong className={forecastMonthlyTarget >= 400 ? "text-emerald-700 font-bold" : "text-[#D4AF37]"}>
                                {forecastMonthlyTarget >= 400 ? "Class-A Green Channel" : "Standard Sovereign"}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Optimal Environmental Indicator Gauge */}
                        <div className="bg-[#1C3B2F] text-white p-4 rounded-xl space-y-2 text-xs">
                          <span className="text-[9px] font-mono uppercase text-[#D4AF37] tracking-wider block">Naturally dried</span>
                          <p className="text-[11px] leading-relaxed text-white/80">
                            Maintaining exactly <strong>{selectedForecastProduct?.traceability.moistureLevel || "14%"}</strong> humidity stability during Shabelle floodplain transits prevents mold, unlocking peak sugar crystallization.
                          </p>
                        </div>

                      </div>

                    </div>

                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
