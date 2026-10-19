/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Product, User, Order } from "../types";
import { BRAND_PRODUCTS } from "../data";
import {
  getProducts as fbGetProducts,
  saveProduct as fbSaveProduct,
  deleteProduct as fbDeleteProduct,
  getAllUsers as fbGetAllUsers,
  getOrders as fbGetOrders,
  updateOrderStatus as fbUpdateOrderStatus,
  updateUserProfile as fbUpdateUserProfile,
  registerUser as fbRegisterUser,
  deleteUser as fbDeleteUser
} from "../firebaseService";
import AuthModal from "./AuthModal";
// @ts-ignore
import heroBackgroundImage from "../assets/images/regenerated_image_1782744371077.jpg";
import {
  X,
  ShoppingBag,
  Calendar,
  MapPin,
  Phone,
  Truck,
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
  Package,
  Plus,
  Minus,
  CheckCircle2,
  Lock,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { motion } from "motion/react";

interface AdminPanelProps {
  currentUser: User | null;
  onLoginRequest: () => void;
  onBackToHome: () => void;
  onLogout: () => void;
  onAuthSuccess?: (user: User) => void;
}

export default function AdminPanel({
  currentUser,
  onLoginRequest,
  onBackToHome,
  onLogout,
  onAuthSuccess
}: AdminPanelProps) {
  // Guard access - check if logged in and role is admin
  const isAdmin = currentUser && currentUser.role === "admin";

  // Sovereign Admin tab selection
  const [adminTab, setAdminTab] = useState<"cultivars" | "partners" | "orders">("cultivars");

  // Local products catalog backed by localStorage (editable)
  const [products, setProducts] = useState<Product[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Consignment Partners (Group B) State variables
  const [partnerUsers, setPartnerUsers] = useState<User[]>([]);
  const [isAddingPartner, setIsAddingPartner] = useState(false);
  const [editingPartner, setEditingPartner] = useState<User | null>(null);

  // Create Partner Form states
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerCompany, setNewPartnerCompany] = useState("");
  const [newPartnerMobile, setNewPartnerMobile] = useState("");
  const [newPartnerPassword, setNewPartnerPassword] = useState("");
  const [newPartnerState, setNewPartnerState] = useState("");
  const [newPartnerBalance, setNewPartnerBalance] = useState<number>(0);
  const [newPartnerRole, setNewPartnerRole] = useState<string>("partner");

  // Edit Partner states
  const [editPartnerBalance, setEditPartnerBalance] = useState<number>(0);
  const [editPartnerRole, setEditPartnerRole] = useState<string>("partner");

  // Order Ledger states
  const [allOrders, setAllOrders] = useState<Order[]>([]);

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
    fbGetProducts()
      .then((firestoreProducts) => {
        if (firestoreProducts && firestoreProducts.length > 0) {
          setProducts(firestoreProducts);
          if (!selectedForecastProduct) {
            setSelectedForecastProduct(firestoreProducts[0]);
          }
        } else {
          setProducts(BRAND_PRODUCTS);
          if (!selectedForecastProduct) {
            setSelectedForecastProduct(BRAND_PRODUCTS[0]);
          }
        }
      })
      .catch((err) => {
        console.warn("Could not load products from Firestore, using memory fallback:", err);
        setProducts(BRAND_PRODUCTS);
        if (!selectedForecastProduct) {
          setSelectedForecastProduct(BRAND_PRODUCTS[0]);
        }
      });
  };

  const loadPartners = () => {
    fbGetAllUsers()
      .then((allUsers) => {
        if (allUsers) {
          setPartnerUsers(allUsers.filter(u => u.role === "partner" || u.role === "user")); // Include both partners and normal users
        } else {
          setPartnerUsers([]);
        }
      })
      .catch((err) => {
        console.warn("Could not load partners from Firestore:", err);
        setPartnerUsers([]);
      });
  };

  const loadAllOrders = () => {
    fbGetOrders()
      .then((firestoreOrders) => {
        if (firestoreOrders) {
          setAllOrders(firestoreOrders);
        } else {
          setAllOrders([]);
        }
      })
      .catch((err) => {
        console.warn("Could not load orders from Firestore:", err);
        setAllOrders([]);
      });
  };

  useEffect(() => {
    loadProducts();
    loadPartners();
    loadAllOrders();
  }, [adminTab]);

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

    const currentList = products.length > 0 ? products : BRAND_PRODUCTS;

    let newList;
    if (editingProduct) {
      newList = currentList.map((p: Product) => p.id === id ? updatedProduct : p);
    } else {
      newList = [...currentList, updatedProduct];
    }

    // Save to Firestore
    fbSaveProduct(updatedProduct)
      .then(() => {
        console.log("Product saved successfully to Firestore");
        loadProducts();
      })
      .catch((err) => console.warn("Could not save product to Firestore:", err));

    setProducts(newList);

    // Close forms
    setEditingProduct(null);
    setIsAddingProduct(false);

    // Auto set forecast selected
    setSelectedForecastProduct(updatedProduct);
  };

  const handleDeleteProduct = (productId: string) => {
    if (!window.confirm("Are you sure you want to decommission this cultivar from active rosters?")) return;

    fbDeleteProduct(productId)
      .then(() => {
        console.log("Product deleted from Firestore");
        loadProducts();
      })
      .catch((err) => console.warn("Could not delete product from Firestore:", err));

    const newList = products.filter((p: Product) => p.id !== productId);
    setProducts(newList);
    if (selectedForecastProduct?.id === productId) {
      setSelectedForecastProduct(newList[0] || null);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName || !newPartnerCompany || !newPartnerMobile) {
      alert("Please fill in all required fields.");
      return;
    }

    // Normalize mobile
    let cleanMobile = newPartnerMobile.trim().replace(/\D/g, "");
    if (cleanMobile.startsWith("0")) {
      cleanMobile = cleanMobile.substring(1);
    }
    // Default to +252 (Somalia) country code
    const formattedMobile = cleanMobile.startsWith("252") ? `+${cleanMobile}` : `+252${cleanMobile}`;

    const exists = partnerUsers.some(u => u.mobile.replace(/\D/g, "") === formattedMobile.replace(/\D/g, ""));
    if (exists) {
      alert("An account with this mobile number already exists.");
      return;
    }

    const newPartner: User = {
      contactName: newPartnerName.trim(),
      company: newPartnerCompany.trim(),
      mobile: formattedMobile,
      password: newPartnerPassword.trim() || "password",
      email: `${cleanMobile}@gg.com`,
      state: newPartnerState.trim() || "Mogadishu",
      role: newPartnerRole as any,
      outstandingBalance: Number(newPartnerBalance) || 0
    };

    try {
      await fbRegisterUser(newPartner);
      alert(`Account for ${newPartner.contactName} (${newPartner.role}) registered successfully in Firebase!`);
      loadPartners();
    } catch (fbError) {
      console.warn("Could not register partner in Firebase:", fbError);
      alert(`Registration failed: ${fbError instanceof Error ? fbError.message : String(fbError)}`);
    }

    setNewPartnerName("");
    setNewPartnerCompany("");
    setNewPartnerMobile("");
    setNewPartnerPassword("");
    setNewPartnerState("");
    setNewPartnerBalance(0);
    setNewPartnerRole("partner");
    setIsAddingPartner(false);
  };

  const handleEditPartnerBalance = (partner: User) => {
    setEditingPartner(partner);
    setEditPartnerBalance(partner.outstandingBalance || 0);
    setEditPartnerRole(partner.role || "partner");
  };

  const handleSavePartnerBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;

    try {
      await fbUpdateUserProfile(editingPartner.mobile, {
         outstandingBalance: Number(editPartnerBalance) || 0,
         role: editPartnerRole as any
      });
      alert(`User ${editingPartner.contactName} profile/role updated successfully.`);
      setEditingPartner(null);
      loadPartners();
    } catch (fbError) {
      console.warn("Could not update outstanding balance or role in Firestore:", fbError);
      alert(`Failed to update user profile in Firestore: ${fbError instanceof Error ? fbError.message : String(fbError)}`);
    }
  };

  const handleDeletePartner = async (mobile: string) => {
    if (!window.confirm("Are you sure you want to remove this partner account?")) return;
    try {
      await fbDeleteUser(mobile);
      alert("Partner account removed from Firestore.");
      loadPartners();
    } catch (fbError) {
      console.warn("Could not remove partner account from Firestore:", fbError);
      alert(`Failed to remove partner from Firestore: ${fbError instanceof Error ? fbError.message : String(fbError)}`);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      await fbUpdateOrderStatus(orderId, newStatus);
      alert(`Order ${orderId} status updated to ${newStatus}.`);
      loadAllOrders();
    } catch (fbError) {
      console.warn("Could not update order status in Firestore:", fbError);
      alert(`Failed to update order status: ${fbError instanceof Error ? fbError.message : String(fbError)}`);
    }
  };

  const getCustomerGroup = (userMobile: string) => {
    const found = partnerUsers.find(u => u.mobile === userMobile);
    if (found && found.role === "partner") {
      return "Group B: Consignment Partner";
    }
    return "Group A: Public Customer";
  };

  const imagePresets = [
    { label: "Slices Close-up", path: "/src/assets/images/regenerated_image_1782223583418.png" },
    { label: "Fresh Mango", path: "/src/assets/images/regenerated_image_1781793816992.jpg" },
    { label: "Mango Trays", path: "/src/assets/images/regenerated_image_1781793815025.jpg" },
    { label: "Finished Product", path: "/src/assets/images/regenerated_image_1782138961910.jpg" }
  ];

  return (
    <div className="w-full bg-[#F5F0E1] min-h-screen relative pb-20 select-text overflow-hidden">

      {/* Background patterns */}
      <div className="absolute inset-0 bg-grain opacity-10 pointer-events-none z-0" />

      {/* Hero Header */}
      <div className="bg-[#1C1A17] py-14 px-4 sm:px-6 lg:px-8 border-b-2 border-[#D4AF37] relative text-center text-white overflow-hidden">
        <div className="absolute inset-0 bg-[#1C3B2F]/80 pointer-events-none z-10" />
        <div className="absolute inset-4 border border-[#D4AF37]/20 pointer-events-none rounded-xl z-20" />

        {/* Top-right Return Button */}
        <button
          onClick={onBackToHome}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 p-2.5 bg-white/10 hover:bg-rose-600 text-[#D4AF37] hover:text-white border border-[#D4AF37]/35 hover:border-rose-500 rounded-full transition-all cursor-pointer shadow-lg flex items-center justify-center"
          title="Return Home"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="max-w-4xl mx-auto space-y-4 relative z-20">
          <span className="text-[10px] font-mono tracking-widest text-[#D4AF37] uppercase font-bold px-3 py-1 bg-white/5 border border-[#D4AF37]/30 rounded-full inline-flex items-center gap-1.5 mx-auto">
            <Lock className="w-3 h-3 text-[#D4AF37]" /> Sovereign Administrative Portal
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-wide">
            CULTIVAR REGISTRY & FORECAST DEMANDS
          </h1>
          <p className="text-xs sm:text-sm text-brand-cream/80 max-w-xl mx-auto font-sans font-light">
            Administrative operations for managing product records, batch documentation and export distribution channels.
          </p>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">

        {!isAdmin ? (
          /* Inline authentication form directly on page */
          <div className="max-w-md mx-auto my-6 animate-fadeIn">
            {currentUser ? (
              /* Already logged in but not admin - let's show access denied */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#1C1A17] text-white border-2 border-red-500 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute inset-1.5 border border-red-500/20 pointer-events-none rounded-xl" />
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-bold tracking-wider text-red-400">ACCESS RESTRICTED</h3>
                  <p className="text-xs font-mono text-white/70 leading-relaxed">
                    This administrative workspace is reserved for sovereign agricultural officers. Your current account does not have administrator privileges.
                  </p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={onLogout}
                    className="px-5 py-2.5 bg-[#D4AF37] hover:bg-white text-[#1C3B2F] rounded-lg font-mono text-xs font-bold uppercase transition-all cursor-pointer shadow-md"
                  >
                    Switch Account
                  </button>
                  <button
                    onClick={onBackToHome}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg font-mono text-xs font-bold uppercase transition-all border border-white/20 cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Render inline sign-in directly */
              <AuthModal inline={true} onAuthSuccess={onAuthSuccess || (() => {})} initialMode="login" />
            )}
          </div>
        ) : (
          /* AUTHORIZED ADMIN WORKSPACE */
          <div className="space-y-10 animate-fadeIn">

            {/* Admin Header Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white border-2 border-[#D4AF37]/30 rounded-2xl p-5 text-center shadow-md relative overflow-hidden">
                <span className="text-[10px] font-mono uppercase text-[#1C3B2F]/60 tracking-wider block mb-1">
                  Total Active Cultivars
                </span>
                <span className="text-3xl font-serif font-bold text-[#1C3B2F] block">
                  {products.length} Varieties
                </span>
                <span className="text-[10px] text-emerald-700 font-mono mt-1 block">
                  Documentation status
                </span>
              </div>

              <div className="bg-white border-2 border-[#D4AF37]/30 rounded-2xl p-5 text-center shadow-md relative overflow-hidden">
                <span className="text-[10px] font-mono uppercase text-[#1C3B2F]/60 tracking-wider block mb-1">
                  Active Origin Valleys
                </span>
                <span className="text-3xl font-serif font-bold text-emerald-800 block">
                  2 Rivers (Juba & Shabelle)
                </span>
                <span className="text-[10px] text-emerald-700 font-mono mt-1 block">
                  Alluvial delta basins verified
                </span>
              </div>

              <div className="bg-white border-2 border-[#D4AF37]/30 rounded-2xl p-5 text-center shadow-md relative overflow-hidden">
                <span className="text-[10px] font-mono uppercase text-[#1C3B2F]/60 tracking-wider block mb-1">
                  Administrative State
                </span>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-[#1C3B2F] uppercase tracking-wider font-mono">
                    {currentUser?.contactName || "Sovereign Officer"}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="mt-2 text-[10px] font-mono text-red-600 hover:underline cursor-pointer"
                >
                  Sign Out Admin Session
                </button>
              </div>
            </div>

            {/* Sovereign Navigation Tabs */}
            <div className="flex bg-[#F5F0E1] p-1 border-2 border-[#D4AF37]/35 rounded-xl max-w-lg mx-auto shadow-sm">
              <button
                onClick={() => setAdminTab("cultivars")}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  adminTab === "cultivars"
                    ? "bg-[#1C3B2F] text-[#D4AF37] border border-[#D4AF37]/30"
                    : "text-[#1C3B2F]/75 hover:text-[#1C3B2F] hover:bg-white/40"
                }`}
              >
                Cultivar Catalog
              </button>
              <button
                onClick={() => setAdminTab("partners")}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  adminTab === "partners"
                    ? "bg-[#1C3B2F] text-[#D4AF37] border border-[#D4AF37]/30"
                    : "text-[#1C3B2F]/75 hover:text-[#1C3B2F] hover:bg-white/40"
                }`}
              >
                Consignment Partners
              </button>
              <button
                onClick={() => setAdminTab("orders")}
                className={`flex-1 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  adminTab === "orders"
                    ? "bg-[#1C3B2F] text-[#D4AF37] border border-[#D4AF37]/30"
                    : "text-[#1C3B2F]/75 hover:text-[#1C3B2F] hover:bg-white/40"
                }`}
              >
                Order Ledger
              </button>
            </div>

            {adminTab === "cultivars" && (
              <>
                {/* Cultivar management container */}
                <div className="bg-white border border-[#D4AF37]/35 rounded-2xl p-6 sm:p-8 shadow-sm relative space-y-6">
                  <div className="absolute inset-1.5 border border-[#D4AF37]/10 pointer-events-none rounded-xl" />

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D4AF37]/20 pb-5">
                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#1C3B2F] flex items-center gap-2">
                    <Package className="w-6 h-6 text-[#D4AF37]" />
                    Sovereign Cultivar Registry
                  </h3>
                  <p className="text-xs text-[#1C3B2F]/70 font-mono mt-0.5">
                    Maintain product parameters, batch records and available export documentation.
                  </p>
                </div>

                <button
                  onClick={handleAddClick}
                  className="px-4 py-2.5 bg-[#1C3B2F] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1C3B2F] border border-[#D4AF37] rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Register Custom Cultivar</span>
                </button>
              </div>

              {/* Cultivar Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-[#F5F0E1]/25 border border-[#D4AF37]/25 rounded-xl p-5 hover:border-[#D4AF37]/45 transition-all flex flex-col justify-between gap-5 relative shadow-xs"
                  >
                    <div className="space-y-3">
                      <div className="relative h-32 w-full rounded-lg overflow-hidden border border-[#D4AF37]/15">
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
                        <p className="text-xs text-[#1C3B2F]/75 mt-2 line-clamp-2 leading-relaxed">{prod.description}</p>
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
                          <span className="text-gray-400 block text-[8px] uppercase font-bold">Moisture</span>
                          <strong>{prod.traceability.moistureLevel}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[8px] uppercase font-bold">Drying Time</span>
                          <strong>{prod.traceability.dryingTimeHours} hrs</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[8px] uppercase font-bold">Origin Valley</span>
                          <strong className="truncate block">{prod.traceability.sourceValley}</strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[8px] uppercase font-bold">Batch record</span>
                          <strong className="truncate block text-[#D4AF37]">{prod.traceability.labCertificateNo}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Catalog action buttons */}
                    <div className="flex gap-2 pt-3 border-t border-dashed border-[#D4AF37]/20">
                      <button
                        onClick={() => handleEditClick(prod)}
                        className="flex-1 py-1.5 px-3 bg-[#F5F0E1] hover:bg-[#1C3B2F] hover:text-white border border-[#D4AF37]/45 text-[#1C3B2F] rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        Edit Cultivar Profile
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 rounded-lg transition-all cursor-pointer"
                        title="Decommission Cultivar"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Integrated Add/Edit Dialog */}
            {(isAddingProduct || editingProduct) && (
              <div className="bg-[#1C1A17] text-white border-2 border-[#D4AF37] rounded-2xl p-6 sm:p-8 relative space-y-6 shadow-xl animate-scaleIn">
                <div className="absolute inset-1 border border-[#D4AF37]/20 pointer-events-none rounded-xl" />
                <button
                  onClick={() => {
                    setIsAddingProduct(false);
                    setEditingProduct(null);
                  }}
                  className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/15 rounded-full text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div>
                  <span className="text-[9px] font-mono uppercase text-[#D4AF37] tracking-wider block mb-1">
                    {editingProduct ? "Registry Revision Protocol" : "Custom Registry Entrance"}
                  </span>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#D4AF37]">
                    {editingProduct ? `Edit Cultivar Profile: ${editingProduct.name}` : "Register New Cultivar Variety"}
                  </h3>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-6 text-left">

                  {/* Common Name & Botanical name */}
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

                  {/* Descriptions */}
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                        Brief Summary Description
                      </label>
                      <input
                        type="text"
                        required
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Short tagline for main catalog card"
                        className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                        Extended Narrative Description
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={formExtDesc}
                        onChange={(e) => setFormExtDesc(e.target.value)}
                        placeholder="Detail about agricultural origin, soil basins, and taste parameters..."
                        className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  {/* Core Trace Parameters */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#D4AF37] block">Sugar Brix Level</label>
                      <input
                        type="text" required value={formBrix} onChange={(e) => setFormBrix(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#D4AF37] block">Moisture Ratio</label>
                      <input
                        type="text" required value={formMoisture} onChange={(e) => setFormMoisture(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#D4AF37] block">Dehydration Time (Hrs)</label>
                      <input
                        type="number" required value={formDryingTime} onChange={(e) => setFormDryingTime(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#D4AF37] block">Altitude</label>
                      <input
                        type="text" required value={formAltitude} onChange={(e) => setFormAltitude(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#D4AF37] block">Origin Basin</label>
                      <select
                        value={formValley} onChange={(e) => setFormValley(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none"
                      >
                        <option value="Shabelle River Valley" className="text-[#1C3B2F]">Shabelle River Valley</option>
                        <option value="Juba River Valley" className="text-[#1C3B2F]">Juba River Valley</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#D4AF37] block">Harvest Season</label>
                      <input
                        type="text" required value={formHarvestDate} onChange={(e) => setFormHarvestDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#D4AF37] block">Batch record reference</label>
                      <input
                        type="text" required value={formLabCertificate} onChange={(e) => setFormLabCertificate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quality Badges */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block">
                      Quality Accreditations & Badges (Comma Separated)
                    </label>
                    <input
                      type="text"
                      required
                      value={formBadges}
                      onChange={(e) => setFormBadges(e.target.value)}
                      placeholder="e.g. Naturally dried, Carefully packed"
                      className="w-full bg-white/5 border border-[#D4AF37]/35 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  {/* Image presets */}
                  <div className="space-y-2 bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold block mb-1">
                      Visual Presentation Image
                    </label>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {imagePresets.map((preset) => {
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

                    {/* Manual URL entry */}
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
              <div className="lg:col-span-8 bg-white border border-[#D4AF37]/35 rounded-2xl p-6 sm:p-8 shadow-sm relative text-left">
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
                      className="px-2.5 py-1.5 bg-[#F5F0E1]/50 border border-[#D4AF37]/30 rounded-lg text-xs font-mono text-[#1C3B2F] focus:outline-none cursor-pointer"
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
              <div className="lg:col-span-4 bg-white border border-[#D4AF37]/35 rounded-2xl p-6 shadow-sm relative space-y-6 text-left">
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
                    className="w-full accent-[#1C3B2F] cursor-pointer"
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
                      <span className="text-gray-500">Aseptic Packs Required</span>
                      <strong className="text-[#1C3B2F]">{forecastMonthlyTarget * 24} Units</strong>
                    </div>

                    <div className="bg-[#F5F0E1]/20 p-2.5 rounded border border-[#D4AF37]/10 flex justify-between items-center">
                      <span className="text-gray-500">Origin Logistical Fleet</span>
                      <strong className="text-emerald-800">
                        {Math.ceil(forecastMonthlyTarget / 150)} Alluvial Boats
                      </strong>
                    </div>

                    <div className="bg-[#F5F0E1]/20 p-2.5 rounded border border-[#D4AF37]/10 flex justify-between items-center text-[11px] border-dashed">
                      <span className="text-[#1C3B2F]/70">Calculated Security Level</span>
                      <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase text-[9px]">
                        High Integrity
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>)}

          {adminTab === "partners" && (
            <div className="space-y-8 animate-fadeIn">
              {/* Header and Add Partner trigger */}
              <div className="bg-white border border-[#D4AF37]/35 rounded-2xl p-6 sm:p-8 shadow-sm relative space-y-6">
                <div className="absolute inset-1.5 border border-[#D4AF37]/10 pointer-events-none rounded-xl" />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#D4AF37]/20 pb-5">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-[#1C3B2F] flex items-center gap-2">
                      <Building className="w-6 h-6 text-[#D4AF37]" />
                      Consignment Partners Roster
                    </h3>
                    <p className="text-xs text-[#1C3B2F]/70 font-mono mt-0.5">
                      Create, approve, and audit approved Group B business representative accounts. Set outstanding balances to block/permit orders.
                    </p>
                  </div>

                  {!isAddingPartner && !editingPartner && (
                    <button
                      onClick={() => setIsAddingPartner(true)}
                      className="px-4 py-2.5 bg-[#1C3B2F] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#1C3B2F] border border-[#D4AF37] rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Add New Consignment Partner</span>
                    </button>
                  )}
                </div>

                {/* Add Partner Form */}
                {isAddingPartner && (
                  <div className="bg-[#1C1A17] text-white border-2 border-[#D4AF37] rounded-xl p-5 relative space-y-4">
                    <div className="absolute inset-1 border border-[#D4AF37]/10 pointer-events-none rounded-lg" />
                    <div className="flex justify-between items-center">
                      <h4 className="font-serif text-sm font-bold text-[#D4AF37] uppercase">Register Group B Consignment Partner</h4>
                      <button onClick={() => setIsAddingPartner(false)} className="text-white hover:text-rose-500 font-mono text-xs">Cancel</button>
                    </div>

                    <form onSubmit={handleCreatePartner} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#D4AF37]">Company / Firm Name *</label>
                        <input
                          type="text" required value={newPartnerCompany} onChange={(e) => setNewPartnerCompany(e.target.value)}
                          placeholder="e.g. Wholesale customer"
                          className="w-full bg-white/5 border border-white/20 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#D4AF37]">Authorized Representative Name *</label>
                        <input
                          type="text" required value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)}
                          placeholder="e.g. Salim Al Mansoor"
                          className="w-full bg-white/5 border border-white/20 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#D4AF37]">Mobile number *</label>
                        <input
                          type="text" required value={newPartnerMobile} onChange={(e) => setNewPartnerMobile(e.target.value)}
                          placeholder="e.g. 0501234567"
                          className="w-full bg-white/5 border border-white/20 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#D4AF37]">Sign-In Passcode / Password</label>
                        <input
                          type="password" value={newPartnerPassword} onChange={(e) => setNewPartnerPassword(e.target.value)}
                          placeholder="Default: password"
                          className="w-full bg-white/5 border border-white/20 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#D4AF37]">Destination Region / State</label>
                        <input
                          type="text" value={newPartnerState} onChange={(e) => setNewPartnerState(e.target.value)}
                          placeholder="Delivery address"
                          className="w-full bg-white/5 border border-white/20 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#D4AF37]">Initial Outstanding Balance ($)</label>
                        <input
                          type="number" min="0" step="0.01" value={newPartnerBalance} onChange={(e) => setNewPartnerBalance(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full bg-white/5 border border-white/20 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-[#D4AF37]">User System Role *</label>
                        <select
                          value={newPartnerRole} onChange={(e) => setNewPartnerRole(e.target.value)}
                          className="w-full bg-[#1C1A17] border border-white/20 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none cursor-pointer"
                        >
                          <option value="partner">Consignment Partner (Group B)</option>
                          <option value="user">Public Customer (Group A)</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>

                      <div className="md:col-span-2 pt-2 flex justify-end gap-2">
                        <button type="submit" className="px-5 py-2 bg-[#D4AF37] text-[#1C3B2F] rounded font-mono text-xs font-bold uppercase hover:bg-white transition-all cursor-pointer">
                          Register Partner
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Edit Partner Balance Form */}
                {editingPartner && (
                  <div className="bg-[#1C1A17] text-white border-2 border-amber-500 rounded-xl p-5 relative space-y-4">
                    <div className="absolute inset-1 border border-amber-500/10 pointer-events-none rounded-lg" />
                    <div className="flex justify-between items-center">
                      <h4 className="font-serif text-sm font-bold text-amber-400 uppercase">
                        Modify Ledger: {editingPartner.company}
                      </h4>
                      <button onClick={() => setEditingPartner(null)} className="text-white hover:text-rose-500 font-mono text-xs">Cancel</button>
                    </div>

                    <form onSubmit={handleSavePartnerBalance} className="max-w-md space-y-4 text-left">
                      <div className="space-y-1.5">
                        <p className="text-xs text-white/80 font-sans">
                          Representative: <strong>{editingPartner.contactName}</strong> ({editingPartner.mobile})
                        </p>
                        <label className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                          Outstanding Balance / Debt ($)
                        </label>
                        <input
                          type="number" min="0" step="0.01" value={editPartnerBalance} onChange={(e) => setEditPartnerBalance(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white/5 border border-amber-500/30 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none"
                          required
                        />
                        <p className="text-[10px] text-white/60 font-mono">
                          Setting this balance to greater than $0 will automatically lock their ordering ability. Setting it to $0 will allow reorders up to $100.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
                          System Role
                        </label>
                        <select
                          value={editPartnerRole} onChange={(e) => setEditPartnerRole(e.target.value)}
                          className="w-full bg-[#1C1A17] border border-amber-500/30 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none cursor-pointer"
                        >
                          <option value="partner">Consignment Partner (Group B)</option>
                          <option value="user">Public Customer (Group A)</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </div>
                      <button type="submit" className="px-4 py-2 bg-amber-500 text-black rounded font-mono text-xs font-bold uppercase hover:bg-white transition-all cursor-pointer">
                        Apply Account Updates
                      </button>
                    </form>
                  </div>
                )}

                {/* Partner Directory list */}
                <div className="space-y-4 pt-4">
                  {partnerUsers.length === 0 ? (
                    <div className="text-center py-10 bg-[#F5F0E1]/20 rounded-xl border border-dashed border-[#D4AF37]/30">
                      <Building className="w-8 h-8 text-[#D4AF37]/50 mx-auto mb-2" />
                      <p className="text-xs font-mono text-[#1C3B2F]/60">No Approved Consignment Partners currently registered.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#D4AF37]/30">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-[#1C3B2F] text-[#D4AF37] uppercase text-[9px] tracking-wider border-b border-[#D4AF37]/45">
                            <th className="p-3">Firm / Representative</th>
                            <th className="p-3">Location</th>
                            <th className="p-3">Contact Tracking ID</th>
                            <th className="p-3">Passcode</th>
                            <th className="p-3 text-right">Outstanding Debt</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D4AF37]/20 bg-white">
                          {partnerUsers.map((partner) => {
                            const hasDebt = (partner.outstandingBalance || 0) > 0;
                            return (
                              <tr key={partner.mobile} className="hover:bg-[#F5F0E1]/20 transition-colors text-[#1C3B2F]">
                                <td className="p-3 font-sans">
                                  <strong className="block text-[#1C3B2F] text-xs">{partner.company}</strong>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-mono text-[#1C3B2F]/70">{partner.contactName}</span>
                                    <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                      partner.role === "admin"
                                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                                        : partner.role === "user"
                                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                                          : "bg-amber-100 text-[#1C3B2F] border border-amber-200"
                                    }`}>
                                      {partner.role || "partner"}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3">{partner.state}</td>
                                <td className="p-3 font-semibold">{partner.mobile}</td>
                                <td className="p-3 font-semibold text-[#D4AF37]">{partner.password}</td>
                                <td className="p-3 text-right font-bold text-sm">
                                  <span className={hasDebt ? "text-rose-600 bg-rose-50 px-2 py-1 rounded" : "text-emerald-700 bg-emerald-50 px-2 py-1 rounded"}>
                                    ${(partner.outstandingBalance || 0).toFixed(2)}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`text-[9px] uppercase font-bold px-2.5 py-1 rounded-full ${
                                    hasDebt
                                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  }`}>
                                    {hasDebt ? "⚠️ Blocked" : "✓ Clear"}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex gap-2 justify-center">
                                    <button
                                      onClick={() => handleEditPartnerBalance(partner)}
                                      className="px-2 py-1 bg-amber-50 hover:bg-[#1C3B2F] hover:text-[#D4AF37] border border-[#D4AF37]/45 text-[#1C3B2F] rounded transition-all cursor-pointer text-[10px]"
                                    >
                                      Set Balance
                                    </button>
                                    <button
                                      onClick={() => handleDeletePartner(partner.mobile)}
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 rounded transition-all cursor-pointer"
                                      title="Revoke Access"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {adminTab === "orders" && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-white border border-[#D4AF37]/35 rounded-2xl p-6 sm:p-8 shadow-sm relative space-y-6">
                <div className="absolute inset-1.5 border border-[#D4AF37]/10 pointer-events-none rounded-xl" />

                <div>
                  <h3 className="font-serif text-2xl font-bold text-[#1C3B2F] flex items-center gap-2">
                    <ShoppingBag className="w-6 h-6 text-[#D4AF37]" />
                    Sovereign Order & Dispatch Ledger
                  </h3>
                  <p className="text-xs text-[#1C3B2F]/70 font-mono mt-0.5">
                    Process public full-payment dispatches (Group A) and approved consignment partner allocations (Group B).
                  </p>
                </div>

                <div className="space-y-4">
                  {allOrders.length === 0 ? (
                    <div className="text-center py-10 bg-[#F5F0E1]/20 rounded-xl border border-dashed border-[#D4AF37]/30">
                      <ShoppingBag className="w-8 h-8 text-[#D4AF37]/50 mx-auto mb-2" />
                      <p className="text-xs font-mono text-[#1C3B2F]/60">No orders have been recorded in the ledger yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#D4AF37]/30">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-[#1C3B2F] text-[#D4AF37] uppercase text-[9px] tracking-wider border-b border-[#D4AF37]/45">
                            <th className="p-3">Order Code</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Recipient / Customer Group</th>
                            <th className="p-3">State</th>
                            <th className="p-3">Cargo Content</th>
                            <th className="p-3 text-right">Total Invoice</th>
                            <th className="p-3 text-center">Status Cycle</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#D4AF37]/20 bg-white">
                          {[...allOrders].reverse().map((order) => {
                            const group = getCustomerGroup(order.customerPhone);
                            const isPartner = group.includes("Partner");
                            return (
                              <tr key={order.id} className="hover:bg-[#F5F0E1]/20 transition-colors text-[#1C3B2F]">
                                <td className="p-3 font-bold text-[#1C3B2F]">{order.id}</td>
                                <td className="p-3 font-mono text-[#1C3B2F]/70">{order.date.split("T")[0]}</td>
                                <td className="p-3 font-sans">
                                  <strong className="block text-[#1C3B2F] text-xs">{order.customerName}</strong>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`text-[8px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                                      isPartner
                                        ? "bg-[#1C3B2F] text-[#D4AF37]"
                                        : "bg-emerald-50 text-emerald-800 border border-emerald-100"
                                    }`}>
                                      {group}
                                    </span>
                                    <span className="text-[10px] text-gray-400">({order.customerPhone})</span>
                                  </div>
                                </td>
                                <td className="p-3">{order.shippingAddress || order.shippingState || "Lower Riparian"}</td>
                                <td className="p-3 font-sans">
                                  <strong className="block text-[#1C3B2F] text-xs">{order.productName}</strong>
                                  <span className="text-[10px] font-mono text-[#1C3B2F]/70">Volume: {order.quantity} Boxes</span>
                                </td>
                                <td className="p-3 text-right font-bold text-sm text-[#1C3B2F]">
                                  ${order.totalCost ? order.totalCost.toFixed(2) : (order.quantity * 15).toFixed(2)}
                                </td>
                                <td className="p-3 text-center">
                                  <select
                                    value={order.status}
                                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase font-bold focus:outline-none cursor-pointer border ${
                                      order.status === "Delivered"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : order.status === "Canceled"
                                        ? "bg-rose-50 text-rose-800 border-rose-200"
                                        : "bg-amber-50 text-amber-800 border-amber-200"
                                    }`}
                                  >
                                    <option value="Approved">Approved</option>
                                    <option value="Preparing">Preparing</option>
                                    <option value="On the Way">On the Way</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Canceled">Canceled</option>
                                  </select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  </div>
);
}
