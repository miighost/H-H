import InvoiceModal from "./InvoiceModal";
import mangoImage from "../assets/images/fruit-mango-premium.png";
import type { Order } from "../types";
import type { InvoiceLineItem } from "../invoice";

const sampleOrder: Order = {
  id: "HH-ORD-10482",
  productId: "mango",
  productName: "Mango",
  productImageUrl: mangoImage,
  qty: 6,
  totalWeightKg: 14.4,
  totalUnits: 144,
  userMobile: "+252 61 555 1234",
  userName: "Ahmed Ali",
  userCompany: "Shabelle Hospitality",
  userState: "Mogadishu",
  date: "15 September 2026",
  status: "Delivered",
  totalCost: 238.96,
};

const sampleItems: InvoiceLineItem[] = [
  { product: "Dried Mango (Premium, 100 g)", quantity: 2, unitLabel: "boxes (24 packs)", unitPrice: 38.16 },
  { product: "Dried Papaya (Premium, 100 g)", quantity: 1, unitLabel: "box (24 packs)", unitPrice: 38.16 },
  { product: "Dried Banana (Lady Soft, 100 g)", quantity: 1, unitLabel: "box (24 packs)", unitPrice: 38.16 },
  { product: "Dried Banana (Lady Spicy, 100 g)", quantity: 1, unitLabel: "box (24 packs)", unitPrice: 38.16 },
  { product: "Dried Isbaandheys (Premium, 100 g)", quantity: 1, unitLabel: "box (24 packs)", unitPrice: 38.16 },
];

export default function InvoicePreviewPage() {
  return (
    <main className="invoice-preview-page">
      <InvoiceModal order={sampleOrder} lineItems={sampleItems} deliveryFee={10} onClose={() => { window.location.href = "/"; }} />
    </main>
  );
}
