import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut 
} from "firebase/auth";
import { auth, db } from "./firebase";
import { User, Order, Product, TradeInventory, TradeOrderLine } from "./types";
import { normalizeForCompare } from "./components/AuthModal";
import { BRAND_PRODUCTS } from "./data";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const isPermissionError = errInfo.error.toLowerCase().includes("permission") || errInfo.error.toLowerCase().includes("denied");
  if (isPermissionError) {
    console.warn('Firestore Warning (graceful fallback):', JSON.stringify(errInfo));
    if (typeof window !== "undefined") {
      (window as any).__firestorePermissionError = errInfo;
      window.dispatchEvent(new CustomEvent("firestore-permission-error", { detail: errInfo }));
    }
  } else {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  }
  throw new Error(JSON.stringify(errInfo));
}

// Fetch active user profile from Firestore by UID or email (used to restore sessions from Firebase directly)
export async function getCurrentUserProfile(uid: string, email: string): Promise<User | null> {
  try {
    const usersCol = collection(db, "users");
    const q = query(usersCol, where("uid", "==", uid));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const data = snapshot.docs[0].data();
      return {
        mobile: data.mobile,
        email: data.email,
        contactName: data.contactName,
        company: data.company,
        state: data.state,
        role: data.role || "user",
        outstandingBalance: data.outstandingBalance || 0
      };
    }
    
    const q2 = query(usersCol, where("email", "==", email));
    const snapshot2 = await getDocs(q2);
    if (!snapshot2.empty) {
      const data = snapshot2.docs[0].data();
      return {
        mobile: data.mobile,
        email: data.email,
        contactName: data.contactName,
        company: data.company,
        state: data.state,
        role: data.role || "user",
        outstandingBalance: data.outstandingBalance || 0
      };
    }
    return null;
  } catch (error) {
    console.warn("Could not retrieve user profile from Firestore (possibly permissions):", error);
    return null;
  }
}

// Convert mobile to a standard format for document IDs (e.g. +252615551234 -> 252615551234)
const getDocId = (mobile: string): string => {
  return normalizeForCompare(mobile, "252");
}

// ----------------------------------------------------
// USER SERVICES
// ----------------------------------------------------

export async function registerUser(user: User): Promise<User> {
  const docId = getDocId(user.mobile);
  const email = user.email || `${docId}@gg.com`;
  const password = user.password || "password";

  const userProfile: User = {
    mobile: user.mobile,
    email: email,
    contactName: user.contactName,
    company: user.company,
    state: user.state,
    role: user.role || "user",
    outstandingBalance: user.outstandingBalance || 0
  };

  try {
    // 1. Create the user in Firebase Auth
    const authResult = await createUserWithEmailAndPassword(auth, email, password);
    const uid = authResult.user.uid;

    // 2. Save user profile in Firestore
    try {
      await setDoc(doc(db, "users", docId), {
        ...userProfile,
        password: password, // For sync fallback
        uid: uid
      });
    } catch (fsErr) {
      handleFirestoreError(fsErr, OperationType.WRITE, `users/${docId}`);
    }

    return userProfile;
  } catch (error: any) {
    console.error("Firebase registration error, falling back to writing to Firestore directly:", error);
    
    if (error instanceof Error && error.message.includes("operationType")) {
      throw error;
    }

    try {
      await setDoc(doc(db, "users", docId), {
        ...userProfile,
        password: password
      });
    } catch (fsErr) {
      handleFirestoreError(fsErr, OperationType.WRITE, `users/${docId}`);
    }

    return userProfile;
  }
}

export async function loginUser(mobile: string, countryCode: string, password: string): Promise<User> {
  if (mobile.includes('@')) {
    const result = await signInWithEmailAndPassword(auth, mobile.trim(), password);
    return {email:result.user.email || mobile, mobile:'', contactName:result.user.displayName || 'Horn & Harvest', company:'Horn & Harvest', state:'', role:'user'};
  }
  const normalized = normalizeForCompare(mobile, countryCode);
  const docId = normalized;

  let userDoc;
  const userDocRef = doc(db, "users", docId);
  try {
    userDoc = await getDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${docId}`);
  }

  if (userDoc.exists()) {
    const userData = userDoc.data() as any;
    if (userData.password === password) {
      // Authenticate with Firebase Auth
      try {
        await signInWithEmailAndPassword(auth, userData.email, password);
      } catch (authError: any) {
        // If auth fails but credentials match firestore, register them in auth dynamically
        if (authError.code === "auth/user-not-found") {
          try {
            const result = await createUserWithEmailAndPassword(auth, userData.email, password);
            try {
              await updateDoc(userDocRef, { uid: result.user.uid });
            } catch (fsErr) {
              handleFirestoreError(fsErr, OperationType.WRITE, `users/${docId}`);
            }
          } catch (e: any) {
            if (e instanceof Error && e.message.includes("operationType")) {
              throw e;
            }
            console.warn("Could not dynamically seed user to Firebase Auth:", e);
          }
        } else {
          console.warn("Firebase Auth sign-in failed but local password matched:", authError);
        }
      }

      return {
        mobile: userData.mobile,
        email: userData.email,
        contactName: userData.contactName,
        company: userData.company,
        state: userData.state,
        role: userData.role || "user",
        outstandingBalance: userData.outstandingBalance || 0
      };
    } else {
      throw new Error("Invalid password");
    }
  } else {
    throw new Error("User does not exist in sovereign registry");
  }
}

export async function updateUserProfile(mobile: string, profile: Partial<User>): Promise<void> {
  const docId = getDocId(mobile);
  try {
    const userDocRef = doc(db, "users", docId);
    await updateDoc(userDocRef, profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${docId}`);
  }
}

export async function deleteUser(mobile: string): Promise<void> {
  const docId = getDocId(mobile);
  try {
    const userDocRef = doc(db, "users", docId);
    await deleteDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${docId}`);
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const usersCol = collection(db, "users");
    const snapshot = await getDocs(usersCol);
    const users: User[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as any;
      users.push({
        mobile: data.mobile,
        email: data.email,
        contactName: data.contactName,
        company: data.company,
        state: data.state,
        role: data.role || "user",
        outstandingBalance: data.outstandingBalance || 0
      });
    });
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "users");
  }
}

// ----------------------------------------------------
// PRODUCT SERVICES
// ----------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  try {
    const productsCol = collection(db, "products");
    const snapshot = await getDocs(productsCol);
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push(doc.data() as Product);
    });
    return products;
  } catch (error: any) {
    const errorStr = error instanceof Error ? error.message : String(error);
    const isPermissionError = errorStr.toLowerCase().includes("permission") || errorStr.toLowerCase().includes("denied");
    if (isPermissionError) {
      console.warn("Firestore permissions check (Products read requires auth on remote):", errorStr);
      if (typeof window !== "undefined") {
        const errInfo = { error: errorStr, operationType: OperationType.GET, path: 'products' };
        (window as any).__firestorePermissionError = errInfo;
        window.dispatchEvent(new CustomEvent("firestore-permission-error", { detail: errInfo }));
      }
      return BRAND_PRODUCTS;
    }
    handleFirestoreError(error, OperationType.GET, "products");
  }
}

export async function saveProduct(product: Product): Promise<void> {
  try {
    await setDoc(doc(db, "products", product.id), product);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "products", id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
  }
}

// ----------------------------------------------------
// ORDER SERVICES
// ----------------------------------------------------

export async function getOrders(userMobile?: string): Promise<Order[]> {
  try {
    const ordersCol = collection(db, "orders");
    let snapshot;
    if (userMobile) {
      const q = query(ordersCol, where("userMobile", "==", userMobile));
      snapshot = await getDocs(q);
    } else {
      snapshot = await getDocs(ordersCol);
    }
    
    const orders: Order[] = [];
    snapshot.forEach((doc) => {
      orders.push(doc.data() as Order);
    });
    
    // Sort by date descending
    return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, "orders");
  }
}

export async function saveOrder(order: Order): Promise<void> {
  try {
    await setDoc(doc(db, "orders", order.id), order);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${order.id}`);
  }
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
  try {
    const orderDocRef = doc(db, "orders", orderId);
    await updateDoc(orderDocRef, { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `orders/${orderId}`);
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out from Firebase Auth:", error);
  }
}

async function authenticatedTradeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const signedInUser = auth.currentUser;
  if (!signedInUser) throw new Error("Sign in to continue.");
  const token = await signedInUser.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Trade service is temporarily unavailable.");
  return result as T;
}

export async function getTradeDashboard(): Promise<{ profile: Partial<User>; inventory: TradeInventory[]; orders: Order[] }> {
  return authenticatedTradeRequest("/api/trade/dashboard");
}

export async function placeAllocatedTradeOrder(items: Array<{ productId: string; boxes: number }>): Promise<{ order: Order & { lines: TradeOrderLine[] } }> {
  return authenticatedTradeRequest("/api/trade/orders", { method: "POST", body: JSON.stringify({ items }) });
}

// Seed default products and users to Firestore if collections are empty
export async function initializeFirebaseData(): Promise<void> {
  try {
    const productsCol = collection(db, "products");
    let snapshot;
    try {
      snapshot = await getDocs(productsCol);
    } catch (error: any) {
      const errorStr = error instanceof Error ? error.message : String(error);
      const isPermissionError = errorStr.toLowerCase().includes("permission") || errorStr.toLowerCase().includes("denied");
      if (isPermissionError) {
        console.warn("Firestore permissions check (Skip auto-seed when unauthorized):", errorStr);
        if (typeof window !== "undefined") {
          const errInfo = { error: errorStr, operationType: OperationType.GET, path: 'products' };
          (window as any).__firestorePermissionError = errInfo;
          window.dispatchEvent(new CustomEvent("firestore-permission-error", { detail: errInfo }));
        }
        return; // Exit early without throwing
      }
      handleFirestoreError(error, OperationType.GET, "products");
    }

    if (snapshot && snapshot.empty) {
      console.log("Seeding products collection in Firestore...");
      for (const p of BRAND_PRODUCTS) {
        try {
          await setDoc(doc(db, "products", p.id), p);
        } catch (error: any) {
          const errorStr = error instanceof Error ? error.message : String(error);
          const isPermissionError = errorStr.toLowerCase().includes("permission") || errorStr.toLowerCase().includes("denied");
          if (isPermissionError) {
            console.warn("Firestore permissions check (Skip products write):", errorStr);
            if (typeof window !== "undefined") {
              const errInfo = { error: errorStr, operationType: OperationType.WRITE, path: `products/${p.id}` };
              (window as any).__firestorePermissionError = errInfo;
              window.dispatchEvent(new CustomEvent("firestore-permission-error", { detail: errInfo }));
            }
            return;
          }
          handleFirestoreError(error, OperationType.WRITE, `products/${p.id}`);
        }
      }
    }

    const usersCol = collection(db, "users");
    let usersSnapshot;
    try {
      usersSnapshot = await getDocs(usersCol);
    } catch (error: any) {
      const errorStr = error instanceof Error ? error.message : String(error);
      const isPermissionError = errorStr.toLowerCase().includes("permission") || errorStr.toLowerCase().includes("denied");
      if (isPermissionError) {
        console.warn("Firestore permissions check (Skip users read):", errorStr);
        if (typeof window !== "undefined") {
          const errInfo = { error: errorStr, operationType: OperationType.GET, path: 'users' };
          (window as any).__firestorePermissionError = errInfo;
          window.dispatchEvent(new CustomEvent("firestore-permission-error", { detail: errInfo }));
        }
        return;
      }
      handleFirestoreError(error, OperationType.GET, "users");
    }

    if (usersSnapshot && usersSnapshot.empty) {
      console.log("Seeding initial users in Firestore...");
      
      const DEMO_USER = {
        mobile: "+252615551234",
        email: "0615551234@gg.com",
        contactName: "Ahmed Ali",
        company: "Horn Exports Ltd",
        state: "Lower Shabelle",
        role: "user",
        outstandingBalance: 0,
        password: "password"
      };

      const ADMIN_USER = {
        mobile: "+252619999999",
        email: "admin@hh.com",
        contactName: "Sovereign Administrator",
        company: "Sovereign Agricultural Office",
        state: "Banaadir",
        role: "admin",
        outstandingBalance: 0,
        password: "adminpassword"
      };

      try {
        await setDoc(doc(db, "users", "252615551234"), DEMO_USER);
        await setDoc(doc(db, "users", "252619999999"), ADMIN_USER);
      } catch (error: any) {
        const errorStr = error instanceof Error ? error.message : String(error);
        const isPermissionError = errorStr.toLowerCase().includes("permission") || errorStr.toLowerCase().includes("denied");
        if (isPermissionError) {
          console.warn("Firestore permissions check (Skip users write):", errorStr);
          return;
        }
        handleFirestoreError(error, OperationType.WRITE, "users");
      }
    }
  } catch (error) {
    console.warn("Could not auto-seed Firebase collections (probably permissions or empty project rules):", error);
    if (error instanceof Error && error.message.includes("operationType")) {
      throw error;
    }
  }
}
