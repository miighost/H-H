import { Download, X } from "lucide-react";
import logo from "../assets/images/official-logo-transparent.png";
import type { Order } from "../types";
import { invoiceTotal, lineAmount, type InvoiceLineItem } from "../invoice";

interface InvoiceModalProps { order: Order | null; onClose: () => void; lineItems?: InvoiceLineItem[]; deliveryFee?: number; }
const money = (value: number) => `$${value.toFixed(2)}`;

export default function InvoiceModal({ order, onClose, lineItems, deliveryFee = 0 }: InvoiceModalProps) {
  if (!order) return null;
  const invoiceNumber = `INV-${order.id.replace(/^HH-ORD-/, "")}`;
  const orderTotal = order.totalCost ?? 0;
  const unitPrice = order.qty > 0 ? orderTotal / order.qty : 0;
  const items = lineItems ?? [{ product: order.productName, quantity: order.qty, unitLabel: "boxes", unitPrice }];
  const subtotal = invoiceTotal(items);
  const total = subtotal + deliveryFee;
  const paymentReference = `DEMO-${order.id.replace(/[^A-Z0-9]/gi, "")}`;

  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const green = "#1C3B2F", gold = "#D4AF37", charcoal = "#2A2A2A";
    const logoBlob = await fetch(logo).then((response) => response.blob());
    const logoData = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(logoBlob);
    });
    doc.setFillColor(248, 244, 233); doc.rect(0, 0, 210, 34, "F");
    doc.addImage(logoData, "PNG", 15, 8, 55, 18.3);
    doc.setTextColor(green); doc.setFont("times", "normal"); doc.setFontSize(22); doc.text("INVOICE", 195, 18, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("DEMONSTRATION — NOT A FINANCIAL RECORD", 195, 25, { align: "right" });
    doc.setDrawColor(gold); doc.line(15, 34, 195, 34);
    doc.setTextColor(charcoal); doc.setFontSize(9);
    doc.text(`Invoice number: ${invoiceNumber}`, 15, 46); doc.text(`Invoice date: ${order.date.split(" at ")[0]}`, 15, 52); doc.text(`Order reference: ${order.id}`, 15, 58);
    doc.setDrawColor(gold); doc.line(15, 66, 195, 66);
    doc.setFont("times", "bold"); doc.setFontSize(11); doc.setTextColor(green); doc.text("FROM", 15, 76); doc.text("BILL TO", 110, 76);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(charcoal);
    doc.text(["HORN & HARVEST", "Huriwaa, Banaadir, Mogadishu, Somalia", "info@hornandharvest.com", "+252 612 443333"], 15, 84);
    doc.text([order.userCompany || "Demo customer", order.userName || "Customer name", order.userState || "Delivery location", order.userMobile || "Customer contact"], 110, 84);
    doc.setFillColor(green); doc.rect(15, 112, 180, 11, "F"); doc.setTextColor(248, 244, 233); doc.setFont("helvetica", "bold");
    doc.text("PRODUCT", 19, 119); doc.text("QTY", 122, 119, { align: "right" }); doc.text("UNIT PRICE", 158, 119, { align: "right" }); doc.text("AMOUNT", 191, 119, { align: "right" });
    doc.setTextColor(charcoal); doc.setFont("helvetica", "normal");
    let rowY = 135;
    items.forEach((item) => { doc.text(item.product, 19, rowY, { maxWidth: 80 }); doc.text(`${item.quantity} ${item.unitLabel}`, 122, rowY, { align: "right" }); doc.text(money(item.unitPrice), 158, rowY, { align: "right" }); doc.text(money(lineAmount(item)), 191, rowY, { align: "right" }); rowY += 12; });
    const summaryY = rowY + 4;
    doc.setDrawColor(gold); doc.line(15, rowY - 5, 195, rowY - 5); doc.setFont("helvetica", "bold"); doc.text("Subtotal", 158, summaryY, { align: "right" }); doc.text(money(subtotal), 191, summaryY, { align: "right" }); doc.text("Delivery", 158, summaryY + 9, { align: "right" }); doc.text(money(deliveryFee), 191, summaryY + 9, { align: "right" }); doc.text("Total", 158, summaryY + 20, { align: "right" }); doc.setTextColor(green); doc.setFontSize(13); doc.text(money(total), 191, summaryY + 20, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(charcoal); doc.text("Payment status: Paid — demonstration", 15, summaryY + 40); doc.text(`Payment reference: ${paymentReference}`, 15, summaryY + 47);
    doc.setDrawColor(gold); doc.line(15, 270, 195, 270); doc.setFont("times", "italic"); doc.setTextColor(green); doc.text("Dhadhanka Awoowayaasheen — The Taste of Our Ancestors", 105, 280, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(100); doc.text("Template preview only. Final invoice data will come from the connected order and payment system.", 105, 287, { align: "center" });
    doc.save(`${invoiceNumber}.pdf`);
  };

  return <div className="invoice-overlay" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
    <div className="invoice-modal"><div className="invoice-actions"><button type="button" onClick={downloadPdf}><Download aria-hidden="true"/>Download PDF</button><button type="button" onClick={onClose} aria-label="Close invoice"><X aria-hidden="true"/></button></div>
      <article className="invoice-sheet">
        <header className="invoice-header"><img src={logo} alt="Horn & Harvest"/><div><p>DEMONSTRATION</p><h2 id="invoice-title">Invoice</h2><small>Not a financial record</small></div></header>
        <section className="invoice-meta"><div><span>Invoice number</span><strong>{invoiceNumber}</strong></div><div><span>Invoice date</span><strong>{order.date.split(" at ")[0]}</strong></div><div><span>Order reference</span><strong>{order.id}</strong></div></section>
        <section className="invoice-parties"><div><h3>From</h3><strong>HORN & HARVEST</strong><p>Huriwaa, Banaadir, Mogadishu, Somalia<br/>info@hornandharvest.com<br/>+252 612 443333</p></div><div><h3>Bill to</h3><strong>{order.userCompany || "Demo customer"}</strong><p>{order.userName || "Customer name"}<br/>{order.userState || "Delivery location"}<br/>{order.userMobile || "Customer contact"}</p></div></section>
        <div className="invoice-table-wrap"><table className="invoice-table"><thead><tr><th>Product</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>{items.map((item) => <tr key={item.product}><td data-label="Product">{item.product}</td><td data-label="Quantity">{item.quantity} {item.unitLabel}</td><td data-label="Unit price">{money(item.unitPrice)}</td><td data-label="Amount">{money(lineAmount(item))}</td></tr>)}</tbody></table></div>
        <section className="invoice-summary"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Delivery</span><strong>{money(deliveryFee)}</strong></div><div className="invoice-total"><span>Total</span><strong>{money(total)}</strong></div></section>
        <section className="invoice-payment"><div><span>Payment status</span><strong>Paid — demonstration</strong></div><div><span>Payment reference</span><strong>{paymentReference}</strong></div></section>
        <footer className="invoice-footer"><strong>Dhadhanka Awoowayaasheen</strong><span>The Taste of Our Ancestors</span><small>Template preview only. Final invoice data will be supplied by the connected order and payment system.</small></footer>
      </article>
    </div>
  </div>;
}
