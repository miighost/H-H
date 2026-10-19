export interface InvoiceLineItem {
  product: string;
  quantity: number;
  unitLabel: string;
  unitPrice: number;
}

export const lineAmount = (item: InvoiceLineItem) => item.quantity * item.unitPrice;
export const invoiceTotal = (items: InvoiceLineItem[]) => items.reduce((sum, item) => sum + lineAmount(item), 0);
