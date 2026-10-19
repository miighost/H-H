import { useState } from "react";
import box from "../assets/images/presentation-box.jpeg";
export default function BuyerServices({ language }: { language: "so" | "en" }) {
  const so = language === "so";
  const [draft, setDraft] = useState("");
  const submit = async (form: HTMLFormElement) => {
    const f = new FormData(form);
    try {
      const r = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "Client enquiry",
          name: f.get("Name"),
          company: f.get("Company") || f.get("Name"),
          phone: f.get("Contact"),
          address: f.get("Details"),
          notes: String(f.get("Request")) + ": " + String(f.get("Details")),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setDraft(
        (so
          ? "Codsiga waa la helay. Tixraac: "
          : "Enquiry received. Reference: ") + d.requestId,
      );
    } catch (e) {
      setDraft((e as Error).message);
    }
  };
  const faqs = so
    ? [
        [
          "Sideen alaabta u heli karaa?",
          "Noo soo dir weydiintaada. Waxaan kuu xaqiijinaynaa alaabta la heli karo, qiimaha iyo kharashka gaarsiinta ka hor inta aan dalabka la aqbalin.",
        ],
        [
          "Sideen u codsadaa koonto ganacsi?",
          "Buuxi codsiga ganacsiga. Koontada iyo shuruudaha ganacsiga waxaan xaqiijinaynaa marka codsiga la eego.",
        ],
        [
          "Goorma ayaan helayaa dalabkayga?",
          "Waxaan kuu xaqiijinaynaa waqtiga diyaarinta iyo gaarsiinta marka aan hubinno kaydka iyo goobtaada. Waqtiga la qiyaasay ee wax-soo-saarku ma aha ballan gaarsiin.",
        ],
        [
          "Ma codsan karaa muunad ama alaab dibadda la iigu soo diro?",
          "Foomka hoose noogu sheeg waxa aad u baahan tahay. Waxaan kuu hubinaynaa alaabta la heli karo, habka gaarsiinta iyo shuruudaha ganacsiga.",
        ],
        [
          "Sideen u hubiyaa alaabta ama u soo sheegaa dhibaato?",
          "Noo soo dir lambarka dalabka iyo lambarka dufcadda ku qoran baakadka. Ku dar sawir haddii alaabtu waxyeello leedahay.",
        ],
      ]
    : [
        [
          "How do I enquire about a product?",
          "Send us your requirements. We will confirm availability, price and delivery charges before accepting an order.",
        ],
        [
          "How do I request a trade account?",
          "Complete the trade application. Account access and commercial terms are confirmed after review.",
        ],
        [
          "When will my order arrive?",
          "Preparation and delivery are confirmed against availability and destination. A production forecast is an estimate, not a delivery guarantee.",
        ],
        [
          "Can I request samples or international supply?",
          "Tell us your requirements below. Our team will confirm availability, shipping arrangements and commercial terms.",
        ],
        [
          "How do I check a batch or report an issue?",
          "Send your order reference and the batch code printed on the pouch. Include a photograph if the product is damaged.",
        ],
      ];
  return (
    <section className="buyer-services section-wide" id="buyer-services">
      <p className="eyebrow">
        {so ? "Adeegga macaamiisha" : "Client services"}
      </p>
      <h2>
        {so
          ? "Jawaabo cad oo ku saabsan dalabkaaga."
          : "Every detail, considered."}
      </h2>
      <div className="services-grid">
        <div>
          <h3>{so ? "Su’aalaha dalabka" : "Ordering questions"}</h3>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
          <details>
            <summary>
              {so ? "Baakadka & sanduuqa" : "Packaging & presentation"}
            </summary>
            <img
              src={box}
              alt={
                so
                  ? "Sanduuqa Horn & Harvest"
                  : "Horn & Harvest presentation box"
              }
              loading="lazy"
            />
            <p>
              {so
                ? "Xirmo 100 g ah. Sanduuq ganacsi oo leh 24 xirmo."
                : "100 g pouches. Trade cartons contain 24 pouches."}
            </p>
          </details>
        </div>
        <div>
          <h3>
            {so ? "Muunad, sahay ama taageero" : "Samples, supply & support"}
          </h3>
          <p>
            {so
              ? "Buuxi foomka oo u dir kooxda iibka."
              : "Complete the form to send your enquiry to our sales team."}
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(e.currentTarget);
            }}
          >
            <label>
              {so ? "Magaca" : "Name"}
              <input name="Name" required maxLength={100} />
            </label>
            <label>
              {so ? "Telefoon ama iimayl" : "Telephone or email"}
              <input name="Contact" required maxLength={150} />
            </label>
            <label>
              {so ? "Shirkadda" : "Company"}
              <input name="Company" maxLength={120} />
            </label>
            <label>
              {so ? "Nooca codsiga" : "Enquiry type"}
              <select name="Request">
                <option>{so ? "Muunad" : "Samples"}</option>
                <option>{so ? "Sahay ganacsi" : "Trade supply"}</option>
                <option>{so ? "Dhoofin" : "International supply"}</option>
                <option>{so ? "Xogta dufcadda" : "Batch information"}</option>
                <option>{so ? "Taageerada dalabka" : "Order support"}</option>
              </select>
            </label>
            <label>
              {so
                ? "Faahfaahinta & goobta gaarsiinta"
                : "Requirements & delivery destination"}
              <textarea name="Details" required maxLength={2000} rows={4} />
            </label>
            <button type="submit" className="button gold">
              {so ? "Dir codsiga" : "Send enquiry"}
            </button>
          </form>
          {draft && (
            <div role="status">
              <p>{draft}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
