import logo from "./assets/images/official-logo-transparent.png";
type InvoiceOrder = {
  id: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  company: string;
  customerName: string;
  address: string;
  lines: {
    productName: string;
    boxes: number;
    unitPriceCents: number;
    amountCents: number;
  }[];
  totalCents: number;
  paidCents: number;
};
export async function exportOrderInvoice(
  o: InvoiceOrder,
  references: string[],
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF(),
    green = "#1C3B2F",
    gold = "#D4AF37";
  const money = (n: number) => "$" + (n / 100).toFixed(2);
  const blob = await fetch(logo).then((r) => r.blob());
  const image = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  let y = 15;
  const footer = () => {
    doc.setDrawColor(gold);
    doc.line(15, 271, 195, 271);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(green);
    doc.text("Dhadhanka Awoowayaasheen", 105, 279, { align: "center" });
    doc.text("The Taste of Our Ancestors", 105, 285, { align: "center" });
  };
  const page = () => {
    footer();
    doc.addPage();
    y = 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(green);
  };
  const line = (text: string, x: number, width: number) => {
    const rows = doc.splitTextToSize(text, width);
    for (const row of rows) {
      if (y > 255) page();
      doc.text(row, x, y);
      y += 5;
    }
    return rows.length;
  };
  doc.addImage(image, "PNG", 15, 12, 55, 18);
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(green);
  doc.text("Invoice", 195, 26, { align: "right" });
  doc.setDrawColor(gold);
  doc.line(15, 35, 195, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y = 46;
  line(o.invoiceNumber || "", 15, 175);
  line("Date: " + (o.invoiceDate?.slice(0, 10) || ""), 15, 175);
  line("Order: " + o.id, 15, 175);
  y += 8;
  const start = y;
  line("Horn & Harvest", 15, 80);
  line("Mogadishu, Somalia", 15, 80);
  line("info@hornandharvest.com", 15, 80);
  const leftEnd = y;
  y = start;
  line(o.company, 110, 80);
  line(o.customerName, 110, 80);
  line(o.address, 110, 80);
  y = Math.max(y, leftEnd) + 12;
  const header = () => {
    if (y > 240) page();
    doc.setFillColor(green);
    doc.rect(15, y, 180, 11, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Product", 18, y + 7);
    doc.text("Boxes", 132, y + 7, { align: "right" });
    doc.text("Unit price", 164, y + 7, { align: "right" });
    doc.text("Amount", 192, y + 7, { align: "right" });
    y += 20;
    doc.setTextColor(green);
    doc.setFont("helvetica", "normal");
  };
  header();
  for (const l of o.lines) {
    const names = doc.splitTextToSize(l.productName, 100),
      height = Math.max(13, names.length * 5 + 6);
    if (y + height > 255) {
      page();
      header();
    }
    doc.text(names, 18, y);
    doc.text(String(l.boxes), 132, y, { align: "right" });
    doc.text(money(l.unitPriceCents), 164, y, { align: "right" });
    doc.text(money(l.amountCents), 192, y, { align: "right" });
    doc.setDrawColor(gold);
    doc.line(15, y + height - 6, 195, y + height - 6);
    y += height;
  }
  y += 8;
  for (const [label, amount] of [
    ["Total", o.totalCents],
    ["Paid", o.paidCents],
    ["Outstanding", Math.max(0, o.totalCents - o.paidCents)],
  ] as [string, number][]) {
    if (y > 255) page();
    doc.text(label, 135, y);
    doc.text(money(amount), 192, y, { align: "right" });
    y += 7;
  }
  y += 10;
  line("Payment references", 15, 175);
  line(references.join("; ") || "No allocated receipt reference", 15, 175);
  footer();
  doc.save((o.invoiceNumber || "invoice") + ".pdf");
}
