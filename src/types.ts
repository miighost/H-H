/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CropTraceability {
  batchNumber: string;
  sourceValley: string;
  farmCoordinate: string;
  altitude: string;
  harvestDate: string;
  moistureLevel: string;
  dryingTimeHours: number;
  unFaoZone: string;
  labCertificateNo: string;
  testDate: string;
  heavyMetalsStatus: string;
  pesticideStatus: string;
  yeastMoldCount: string;
  microbialStatus: string;
  phLevel: string;
  bxSweetnessRating: string;
}

export interface Product {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  extendedDescription: string;
  badges: string[];
  imageUrl: string;
  fallbackImageColor: string;
  traceability: CropTraceability;
  sugarContentDetails: string;
  price?: number;
}

export interface StorySection {
  title: string;
  subtitle: string;
  content: string;
  imageUrl: string;
  imageAlt: string;
}

export interface LabCertificationDetail {
  parameter: string;
  somaliAverage: string;
  globalAverage: string;
  scientificSignificance: string;
}

export interface User {
  mobile: string;
  email: string;
  password?: string;
  contactName: string;
  company: string;
  state: string;
  role?: string;
  outstandingBalance?: number;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  qty: number;
  totalWeightKg: number;
  totalUnits: number;
  userMobile: string;
  userName: string;
  userCompany: string;
  userState: string;
  date: string;
  status: "Approved" | "Allocated" | "Partially allocated" | "Back-ordered" | "Preparing" | "On the Way" | "Delivered" | "Canceled";
  totalCost?: number;
  allocatedBoxes?: number;
  backOrderedBoxes?: number;
  estimatedAvailableAt?: string | null;
}

export interface TradeInventory {
  productId: string;
  onHandBoxes: number;
  reservedBoxes?: number;
  nextRestockAt?: string | null;
  tradePricePerBox?: number;
}

export interface TradeOrderLine {
  productId: string;
  boxes: number;
  allocatedBoxes: number;
  backOrderedBoxes: number;
  estimatedAvailableAt?: string | null;
  tradePricePerBox?: number;
}
