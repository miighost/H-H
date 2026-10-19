import { ArrowLeft, ArrowRight, Building2, Check, ClipboardCheck, FileText, LogIn, PackageCheck, ShieldCheck, Truck, WalletCards } from "lucide-react";
import logo from "../assets/images/official-logo-transparent.png";

type Language = "so" | "en";

const content = {
  en: {
    label: "Trade & Hospitality", title: "A private service, shaped around your business.",
    intro: "For selected hotels, restaurants, retailers, clubs and distribution partners seeking distinctive Somali provenance and dependable supply.",
    back: "Return to website", signIn: "Client sign-in", apply: "Request a trade account", categories: "Created for",
    categoryItems: ["Hotels & hospitality", "Restaurants & cafés", "Retailers & supermarkets", "Gyms & clubs", "Distributors & wholesalers"],
    journey: "From account to delivery",
    steps: [
      ["Request access", "Tell us about your business, delivery location and expected order volume."],
      ["Account review", "We review your requirements and confirm the appropriate commercial terms."],
      ["Private access", "Approved buyers receive secure access to products, documents and order history."],
      ["Select your collection", "Choose from our five products and build quantities by 24-pouch carton."],
      ["Stock confirmation", "We verify availability, reserve confirmed stock and provide a clear fulfilment date."],
      ["Confirm & pay", "Review the final order, agreed price and delivery details before secure payment."],
      ["Delivery & aftercare", "Follow preparation and dispatch, with direct support through delivery and beyond."],
    ],
    standards: "Service principles",
    standardItems: [
      ["Confirmed availability", "Stock is verified before an order is accepted."],
      ["Protected pricing", "The agreed price remains fixed once an order is confirmed."],
      ["Clear fulfilment", "Availability and delivery expectations are communicated before payment."],
      ["Direct aftercare", "Quality concerns receive a prompt, documented response."],
    ],
    readiness: "Trade service", ready: "Account-to-delivery demonstration", pending: "Live warehouse connection follows commissioning",
    note: "Until live stock synchronisation is commissioned, every trade order is verified personally by Horn & Harvest. Availability must be confirmed before payment.",
    support: "Built for lasting relationships.", supportBody: "One considered service for orders, documents, delivery updates and direct support—clear at every stage.",
    documents: "Buyer documents", documentsTitle: "Everything you need to evaluate Horn & Harvest.", profile: "Company profile", catalogue: "Request product catalogue",
    terms: "Commercial terms are shared privately following account approval.",
  },
  so: {
    label: "Adeegga ganacsiga", title: "Adeeg ku habboon baahida ganacsigaaga.",
    intro: "Waxaa loogu talagalay hoteellada, maqaayadaha, dukaamada, naadiyada iyo qaybiyeyaasha doonaya miro Soomaaliyeed oo gaar ah iyo sahay la isku halayn karo.",
    back: "Ku noqo bogga", signIn: "Gal koontada macmiilka", apply: "Codso koonto ganacsi", categories: "Waxaa loogu talagalay",
    categoryItems: ["Hoteello iyo martigelin", "Maqaayado iyo kafateeriyo", "Dukaamo iyo suuqyo", "Xarumaha jimicsiga iyo naadiyada", "Qaybiyayaal iyo jumladley"],
    journey: "Laga bilaabo koontada ilaa gaarsiinta",
    steps: [
      ["Codso koonto", "Noo sheeg ganacsigaaga, goobta laguu keenayo alaabta iyo inta aad filayso inaad dalbato."],
      ["Dib-u-eegis", "Waxaan eegnaa baahidaada, kadibna xaqiijinnaa shuruudaha ganacsiga."],
      ["Gelitaan gaar ah", "Macaamiisha la ansixiyey waxay helaan alaabta, dukumentiyada iyo dalabyadii hore."],
      ["Dooro alaabta", "Ka dooro shanta nooc ee alaabteenna. Sanduuq kasta wuxuu ka kooban yahay 24 xirmo."],
      ["Xaqiijinta kaydka", "Waxaan hubinnaa alaabta diyaar ah, kuu qabannaa, kadibna sheegnaa waqtiga gaarsiinta."],
      ["Xaqiiji oo bixi", "Hubi dalabka, qiimaha lagu heshiiyey iyo gaarsiinta ka hor bixinta ammaansan."],
      ["Gaarsiin & daryeel", "La soco diyaarinta iyo dirista, adigoo helaya taageero toos ah ilaa gaarsiinta kadib."],
    ],
    standards: "Habka adeeggeenna",
    standardItems: [
      ["Alaab la xaqiijiyey", "Kaydka waa la hubiyaa ka hor inta dalabka la ansixin."],
      ["Qiimihii lagu heshiiyey", "Qiimaha lagu heshiiyey isma beddelo marka dalabka la xaqiijiyo."],
      ["Gaarsiin cad", "Waqtiga diyaarinta iyo gaarsiinta waa la sheegaa ka hor bixinta."],
      ["Taageero toos ah", "Wixii tayo la xiriira si degdeg ah oo nidaamsan ayaa loo xalliyaa."],
    ],
    readiness: "Adeegga ganacsiga", ready: "Tusaalaha dalabka ilaa gaarsiinta", pending: "Xiriirka bakhaarka tooska ahi wuxuu raacayaa marka nidaamka la hawlgeliyo",
    note: "Inta kaydka tooska ah la isku xirayo, Horn & Harvest ayaa dalab kasta si gaar ah u hubinaysa. Alaabta la heli karo waa in la xaqiijiyaa ka hor lacag-bixinta.",
    support: "Waxaa loo dhisay wada-shaqayn waarta.", supportBody: "Hal meel ayaad ka helaysaa dalabyadaada, dukumentiyada, xogta gaarsiinta iyo taageerada aad u baahan tahay.",
    documents: "Dukumentiyada ganacsiga", documentsTitle: "Wax kasta oo aad ugu baahan tahay qiimaynta Horn & Harvest.", profile: "Xogta shirkadda", catalogue: "Dalbo buugga alaabta",
    terms: "Shuruudaha ganacsiga si gaar ah ayaa loo wadaagaa marka koontada la ansixiyo.",
  },
} as const;

const stepIcons = [FileText, ClipboardCheck, LogIn, Building2, PackageCheck, WalletCards, Truck];

export default function TradeAccessPage({ language, onBack, onSignIn }: { language: Language; onBack: () => void; onSignIn: () => void }) {
  const text = content[language];
  return <div className="trade-access">
    <header className="trade-access-header"><button type="button" onClick={onBack}><ArrowLeft />{text.back}</button><img src={logo} alt="Horn & Harvest" /></header>
    <main>
      <section className="trade-hero"><p className="eyebrow">{text.label}</p><h1>{text.title}</h1><p>{text.intro}</p><div className="trade-hero-actions"><button type="button" onClick={onSignIn}>{text.signIn}<ArrowRight /></button><a href="mailto:info@hornandharvest.com?subject=Horn%20%26%20Harvest%20Trade%20Account">{text.apply}</a></div></section>
      <section className="trade-categories"><p className="eyebrow">{text.categories}</p><div>{text.categoryItems.map((item, index) => <span key={item}><i>0{index + 1}</i>{item}</span>)}</div></section>
      <section className="trade-journey"><div className="trade-section-title"><p className="eyebrow">{text.journey}</p><h2>01—07</h2></div><ol>{text.steps.map(([title, description], index) => { const Icon = stepIcons[index]; return <li key={title}><span className="trade-step-number">0{index + 1}</span><Icon /><div><h3>{title}</h3><p>{description}</p></div></li>; })}</ol></section>
      <section className="trade-standards"><p className="eyebrow">{text.standards}</p><div>{text.standardItems.map(([title, description], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
      <section className="trade-readiness"><div><p className="eyebrow">{text.readiness}</p><h2>{text.support}</h2><p>{text.supportBody}</p></div><div className="readiness-card"><span><Check />{text.ready}</span><span><ShieldCheck />{text.pending}</span><p>{text.note}</p></div></section>
      <section className="trade-documents"><div><p className="eyebrow">{text.documents}</p><h2>{text.documentsTitle}</h2><p>{text.terms}</p></div><div className="trade-document-actions"><a href="/documents/horn-and-harvest-company-profile.pdf" target="_blank" rel="noreferrer">{text.profile}<ArrowRight /></a><a href="mailto:info@hornandharvest.com?subject=Horn%20%26%20Harvest%20Product%20Catalogue">{text.catalogue}<ArrowRight /></a></div></section>
    </main>
    <footer className="trade-footer"><img src={logo} alt="Horn & Harvest"/><span>Dhadhanka Awoowayaasheen</span><small>The Taste of Our Ancestors</small></footer>
  </div>;
}
