import { useMemo, useState, useEffect } from "react";
import { ArrowRight, LogIn, Minus, Plus } from "lucide-react";

const products = [
  "Mango",
  "Papaya",
  "Banana - Lady Soft",
  "Banana - Lady Spicy",
  "Isbaandheys",
];

export default function RetailTradeOrder({
  language,
  onSignIn,
}: {
  language: "so" | "en";
  onSignIn: () => void;
}) {
  const so = language === "so";
  const [sending, setSending] = useState(false),
    [result, setResult] = useState("");
  const submit = async (kind: string) => {
    setSending(true);
    setResult("");
    try {
      const response = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "Retail enquiry"
            ? {
                kind,
                name: retailDetails.name,
                phone: retailDetails.phone,
                address: retailDetails.address,
                items: quantities
                  .map((pouches, index) => ({
                    productId: [
                      "mango",
                      "papaya",
                      "banana-lady-soft",
                      "banana-lady-spicy",
                      "isbaandheys",
                    ][index],
                    pouches,
                  }))
                  .filter((i) => i.pouches > 0),
              }
            : {
                kind,
                name: tradeDetails.name,
                company: tradeDetails.business,
                phone: tradeDetails.phone,
                address: tradeDetails.location,
              },
        ),
      });
      const value = await response.json();
      if (!response.ok) throw Error(value.error);
      setResult(
        (so
          ? "Codsigaaga waa la helay. Kooxda iibka ayaa kula soo xiriiri doonta. Tixraac: "
          : "Request received. Our sales team will contact you. Reference: ") +
          value.requestId,
      );
    } catch (e) {
      setResult((e as Error).message);
    } finally {
      setSending(false);
    }
  };
  const [pricing, setPricing] = useState<any>({ approved: false });
  useEffect(() => {
    let mounted = true;
    fetch("/api/public/prices")
      .then((r) => (r.ok ? r.json() : { approved: false }))
      .then((v) => {
        if (mounted) setPricing(v);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  const PRICE = (pricing.pouchPriceCents || 0) / 100,
    DELIVERY = (pricing.deliveryCents || 0) / 100;
  const [quantities, setQuantities] = useState<number[]>([0, 0, 0, 0, 0]);
  const [retailDetails, setRetailDetails] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [tradeDetails, setTradeDetails] = useState({
    name: "",
    business: "",
    type: "Hotel",
    phone: "",
    location: "",
  });
  const pouchCount = quantities.reduce((sum, quantity) => sum + quantity, 0);
  const subtotal = pouchCount * PRICE;
  const total = pouchCount ? subtotal + DELIVERY : 0;
  const money = (value: number) =>
    pricing.approved
      ? `$${value.toFixed(2)}`
      : so
        ? "Waa la xaqiijinayaa"
        : "To be confirmed";
  const retailBody = useMemo(
    () =>
      [
        "Horn & Harvest retail order request",
        `Customer: ${retailDetails.name}`,
        `Telephone: ${retailDetails.phone}`,
        `Delivery address: ${retailDetails.address}`,
        ...products
          .map((product, index) => `${product}: ${quantities[index]} pouch(es)`)
          .filter((_, index) => quantities[index] > 0),
        `Subtotal: ${money(subtotal)}`,
        `Delivery: ${money(pouchCount ? DELIVERY : 0)}`,
        `Total: ${money(total)}`,
      ].join("\n"),
    [quantities, retailDetails, pouchCount, subtotal, total],
  );
  const tradeBody = useMemo(
    () =>
      [
        "Horn & Harvest trade account application",
        `Contact name: ${tradeDetails.name}`,
        `Business: ${tradeDetails.business}`,
        `Business type: ${tradeDetails.type}`,
        `Telephone: ${tradeDetails.phone}`,
        `Location: ${tradeDetails.location}`,
      ].join("\n"),
    [tradeDetails],
  );
  const changeQuantity = (index: number, amount: number) =>
    setQuantities((current) =>
      current.map((value, i) =>
        i === index ? Math.max(0, value + amount) : value,
      ),
    );

  return (
    <section className="customer-ordering section-wide" id="order">
      <div className="customer-ordering-heading">
        <p className="eyebrow">
          {so
            ? "Dalbo ama noqo macmiil ganacsi"
            : "Order or open a trade account"}
        </p>
        <h2>
          {so ? "Laba waddo oo cad." : "Choose the service that suits you."}
        </h2>
        <p>
          {so
            ? "Qofka gaarka ahi isla boggan ayuu ka dalban karaa. Hoteellada, maqaayadaha, dukaamada iyo qaybiyeyaashu waxay codsan karaan koonto ganacsi."
            : "Individual customers can order directly below. Hotels, restaurants, retailers and distributors can apply for an approved trade account."}
        </p>
      </div>
      {result && <p role="status">{result}</p>}
      <div className="customer-ordering-grid">
        <article className="retail-order-panel">
          <p className="eyebrow">{so ? "Dalab tafaariiq" : "Retail order"}</p>
          <h3>{so ? "Dooro mirahaaga." : "Build your order."}</h3>
          <p>
            {so
              ? pricing.approved
                ? `Xirmo kasta waa ${money(PRICE)}. Gaarsiintu waa ${money(DELIVERY)} dalabkiiba.`
                : "Kooxda iibka ayaa xaqiijinaysa qiimaha iyo gaarsiinta."
              : pricing.approved
                ? `Each 100 g pouch is ${money(PRICE)}. Delivery is ${money(DELIVERY)} per order.`
                : "Pricing and delivery will be confirmed by our sales team."}
          </p>
          <div className="retail-products">
            {products.map((product, index) => (
              <div className="retail-product" key={product}>
                <div>
                  <strong>{product}</strong>
                  <span>{money(PRICE)} · 100 g</span>
                </div>
                <div className="quantity-control">
                  <button
                    type="button"
                    onClick={() => changeQuantity(index, -1)}
                    aria-label={`Remove one ${product}`}
                  >
                    <Minus />
                  </button>
                  <output>{quantities[index]}</output>
                  <button
                    type="button"
                    onClick={() => changeQuantity(index, 1)}
                    aria-label={`Add one ${product}`}
                  >
                    <Plus />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="retail-totals">
            <p>
              <span>{so ? "Xirmooyin" : "Pouches"}</span>
              <strong>{pouchCount}</strong>
            </p>
            <p>
              <span>{so ? "Wadarta alaabta" : "Subtotal"}</span>
              <strong>{money(subtotal)}</strong>
            </p>
            <p>
              <span>{so ? "Gaarsiin" : "Delivery"}</span>
              <strong>{money(pouchCount ? DELIVERY : 0)}</strong>
            </p>
            <p className="retail-grand-total">
              <span>{so ? "Wadarta" : "Total"}</span>
              <strong>{money(total)}</strong>
            </p>
          </div>
          <form
            className="compact-order-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!pouchCount) return;
              void submit("Retail enquiry");
            }}
          >
            <label>
              {so ? "Magaca" : "Name"}
              <input
                required
                value={retailDetails.name}
                onChange={(event) =>
                  setRetailDetails({
                    ...retailDetails,
                    name: event.target.value,
                  })
                }
              />
            </label>
            <label>
              {so ? "Telefoonka" : "Telephone"}
              <input
                required
                type="tel"
                value={retailDetails.phone}
                onChange={(event) =>
                  setRetailDetails({
                    ...retailDetails,
                    phone: event.target.value,
                  })
                }
              />
            </label>
            <label>
              {so ? "Cinwaanka gaarsiinta" : "Delivery address"}
              <input
                required
                value={retailDetails.address}
                onChange={(event) =>
                  setRetailDetails({
                    ...retailDetails,
                    address: event.target.value,
                  })
                }
              />
            </label>
            <button
              type="submit"
              className="payment-button"
              disabled={!pouchCount || sending}
            >
              {so ? "Gudbi dalabka" : "Submit retail order"}
              <ArrowRight />
            </button>
            <small>
              {so
                ? "Codsigu wuxuu gaarayaa kooxda iibka. Lacag lagama qaadayo ilaa qiimaha, dalabka iyo alaabta la xaqiijiyo."
                : "Your request is saved for our sales team. No payment is taken until pricing, availability and the order are confirmed."}
            </small>
          </form>
        </article>
        <article className="trade-application-panel">
          <p className="eyebrow">{so ? "Koonto ganacsi" : "Trade account"}</p>
          <h3>
            {so ? "Codso gelitaan ganacsi." : "Apply for approved access."}
          </h3>
          <p>
            {so
              ? "Waxaa loogu talagalay hoteellada, maqaayadaha, dukaamada iyo qaybiyeyaasha. Koontada waxaa la furaa marka kooxda iibku hubiso codsiga."
              : "For hotels, restaurants, retailers and distributors. Access is issued after our sales team reviews the application."}
          </p>
          <button
            type="button"
            className="trade-signin-button"
            onClick={onSignIn}
          >
            <LogIn />
            {so ? "Macmiil hore — gal" : "Existing customer — sign in"}
          </button>
          <form
            className="compact-order-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit("Trade application");
            }}
          >
            <label>
              {so ? "Magaca qofka" : "Contact name"}
              <input
                required
                value={tradeDetails.name}
                onChange={(event) =>
                  setTradeDetails({ ...tradeDetails, name: event.target.value })
                }
              />
            </label>
            <label>
              {so ? "Magaca ganacsiga" : "Business name"}
              <input
                required
                value={tradeDetails.business}
                onChange={(event) =>
                  setTradeDetails({
                    ...tradeDetails,
                    business: event.target.value,
                  })
                }
              />
            </label>
            <label>
              {so ? "Nooca ganacsiga" : "Business type"}
              <select
                value={tradeDetails.type}
                onChange={(event) =>
                  setTradeDetails({ ...tradeDetails, type: event.target.value })
                }
              >
                <option>Hotel</option>
                <option>Restaurant</option>
                <option>Retailer</option>
                <option>Distributor</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              {so ? "Telefoonka" : "Telephone"}
              <input
                required
                type="tel"
                value={tradeDetails.phone}
                onChange={(event) =>
                  setTradeDetails({
                    ...tradeDetails,
                    phone: event.target.value,
                  })
                }
              />
            </label>
            <label>
              {so ? "Goobta" : "Location"}
              <input
                required
                value={tradeDetails.location}
                onChange={(event) =>
                  setTradeDetails({
                    ...tradeDetails,
                    location: event.target.value,
                  })
                }
              />
            </label>
            <button type="submit" className="payment-button">
              {so ? "Gudbi codsiga" : "Submit trade application"}
              <ArrowRight />
            </button>
            <small>
              {so
                ? "Kooxda iibku waxay hubinaysaa codsiga ka hor inta aan la bixin magaca isticmaalaha, erayga sirta ah iyo qiimaha ganacsiga."
                : "Our sales team reviews the application before issuing login details and approved trade pricing."}
            </small>
          </form>
        </article>
      </div>
    </section>
  );
}
