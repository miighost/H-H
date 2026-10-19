import ConnectedPortal from "./components/ConnectedPortal";
import ProductionFilms from "./components/ProductionFilms";
import InteractiveJourney from "./components/InteractiveJourney";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ChevronRight,
  Globe2,
  Mail,
  MapPin,
  Menu,
  Phone,
  X,
} from "lucide-react";
import logo from "./assets/images/official-logo-transparent.png";
import heroImage from "./assets/images/somali-mango-orchard-hero.png";
import mangoImage from "./assets/images/fruit-mango-premium.png";
import farmerSelectionImage from "./assets/images/farmer-hands-selection.png";
import papayaImage from "./assets/images/fruit-papaya-premium.png";
import isbaandheysImage from "./assets/images/fruit-isbaandheys-approved.jpeg";
import ladySoftImage from "./assets/images/fruit-lady-soft-premium.png";
import ladySpicyImage from "./assets/images/fruit-lady-spicy-premium.png";
import hygienicProcessImage from "./assets/images/process-hygiene-premium.png";
import BuyerServices from "./components/BuyerServices";
import TradeAccessPage from "./components/TradeAccessPage";
import InvoicePreviewPage from "./components/InvoicePreviewPage";
import RetailTradeOrder from "./components/RetailTradeOrder";

type Language = "so" | "en";
const copy = {
  en: {
    nav: ["Our story", "Collection", "Quality", "Partnership"],
    eyebrow: "HORN & HARVEST",
    hero: "From Somalia’s finest fruits to the world.",
    heroSub:
      "Premium naturally dried Somali fruits, rooted in heritage and presented with modern standards of quality.",
    discover: "Discover our collection",
    trade: "Trade enquiries",
    portal: "Trade & Hospitality",
    portalIntro: "For retailers and hospitality buyers",
    storyLabel: "From Somalia, with distinction",
    storyTitle: "Dhadhanka Awoowayaasheen",
    storyBody:
      "From Somalia’s Shabelle and Juba valleys, Horn & Harvest selects ripe fruit with care, dries it naturally, and presents it with respect for the land and heritage behind it.",
    quote: "The Taste of Our Ancestors.",
    collectionLabel: "The Collection",
    collectionTitle: "Five expressions of our harvest.",
    collectionBody:
      "Five naturally dried fruit expressions, presented in their official Horn & Harvest packaging.",
    fruits: [
      ["Mango", ""],
      ["Papaya", ""],
      ["Banana - Lady Soft", ""],
      ["Banana - Lady Spicy", ""],
      ["Isbaandheys", ""],
    ],
    qualityLabel: "Our Standard",
    qualityTitle: "Nothing unnecessary.",
    qualityBody: "",
    qualities: [
      [
        "Somali fruit",
        "Carefully selected from Somalia’s fruit-growing regions.",
      ],
      [
        "Naturally dried",
        "Patiently prepared to preserve the fruit’s natural character.",
      ],
      [
        "Nothing unnecessary",
        "No added sugar. No artificial colours. No preservatives.",
      ],
    ],
    processLabel: "Our craft",
    processTitle: "Care, made visible.",
    process: ["Select", "Prepare", "Naturally dry", "Pack", "Deliver"],
    partnershipLabel: "Business",
    partnershipTitle: "Explore Horn & Harvest.",
    partnershipBody: "",
    businessProfileTitle: "Company Profile",
    businessProfileBody:
      "Read the Horn & Harvest company overview, brand story and business introduction.",
    businessProfileAction: "View Company Profile",
    businessWholesaleTitle: "Partnership / Wholesale",
    businessWholesaleBody:
      "Speak with Horn & Harvest about retail, hospitality and distribution opportunities.",
    businessWholesaleAction: "Discuss Wholesale",
    catalogue: "Request product catalogue",
    profile: "View company profile",
    commitmentLabel: "Our commitment",
    commitmentTitle: "Quality, without compromise.",
    commitmentBody:
      "We take care at every stage: selecting fruit, preparing it hygienically and checking each batch before packing.",
    orderLabel: "Product enquiries",
    orderTitle: "Ask about our collection.",
    orderBody:
      "Retail prices, delivery charges and availability will be confirmed before an order is accepted.",
    orderFruit: "Enquire about this fruit",
    paymentError:
      "Secure payment is being connected. Please contact Horn & Harvest to complete this order.",
    paymentSuccess:
      "You have returned from payment. Your order will be confirmed once the payment has been verified.",
    paymentFailure:
      "Payment was not completed. No charge has been confirmed; please try again.",
    contactLabel: "Contact",
    contactTitle: "Begin a conversation.",
    contactBody: "",
    locations: "Mogadishu, Somalia",
    footerLine: "Dhadhanka Awoowayaasheen",
    footerTranslation: "The Taste of Our Ancestors",
    rights: "Horn & Harvest. All rights reserved.",
  },
  so: {
    nav: ["Sheekadeenna", "Miraheenna", "Tayada", "Wada-shaqayn"],
    eyebrow: "HORN & HARVEST",
    hero: "Miraha ugu wanaagsan Soomaaliya, dunidana waan u soo bandhigaynaa.",
    heroSub:
      "Miraha Soomaaliyeed oo tayo sare leh, si dabiici ah loo qalajiyey, kuna dhisan dhaxal iyo hab casri ah.",
    discover: "Eeg miraheenna",
    trade: "Nagala hadal ganacsiga",
    portal: "Adeegga ganacsiga",
    portalIntro: "Dukaamada, hoteellada iyo maqaayadaha",
    storyLabel: "Soomaaliya, si sharaf leh",
    storyTitle: "Dhadhanka Awoowayaasheen",
    storyBody:
      "Dooxooyinka Shabeelle iyo Jubba ee Soomaaliya, Horn & Harvest waxay si taxaddar leh uga xulataa miraha bisil, si dabiici ah ayay u qalajisaa, iyadoo ixtiraamaysa dhulka iyo dhaxalka ay ka yimaadeen.",
    quote: "The Taste of Our Ancestors.",
    collectionLabel: "Miraheenna",
    collectionTitle: "Shan nooc oo ka mid ah dalaggeenna.",
    collectionBody:
      "Shan nooc oo miro si dabiici ah loo qalajiyey, kuna jira baakadaha rasmiga ah ee Horn & Harvest.",
    fruits: [
      ["Mango", ""],
      ["Papaya", ""],
      ["Banana - Lady Soft", ""],
      ["Banana - Lady Spicy", ""],
      ["Isbaandheys", ""],
    ],
    qualityLabel: "Heerkeenna",
    qualityTitle: "Wax aan loo baahnayn kuma darno.",
    qualityBody: "",
    qualities: [
      [
        "Miro Soomaaliyeed",
        "Si taxaddar leh looga soo xulay deegaannada Soomaaliya ee miraha laga beero.",
      ],
      [
        "Si dabiici ah loo qalajiyey",
        "Si dulqaad leh loo diyaariyey si loo ilaaliyo dabeecadda miraha.",
      ],
      [
        "Wax aan loo baahnayn",
        "Sonkor laguma darin. Midab macmal ah laguma darin. Wax ilaaliya laguma darin.",
      ],
    ],
    processLabel: "Farsamadeenna",
    processTitle: "Daryeel muuqda.",
    process: [
      "Dooro",
      "Diyaari",
      "Si dabiici ah u qalaji",
      "Baakadee",
      "Gaarsii",
    ],
    partnershipLabel: "Ganacsi",
    partnershipTitle: "Baro Horn & Harvest.",
    partnershipBody: "",
    businessProfileTitle: "Xogta shirkadda",
    businessProfileBody:
      "Akhri dulmarka shirkadda Horn & Harvest, sheekada summadda iyo hordhaca ganacsiga.",
    businessProfileAction: "Akhri xogta shirkadda",
    businessWholesaleTitle: "Wada-shaqayn / Jumlo",
    businessWholesaleBody:
      "Kala hadal Horn & Harvest fursadaha dukaamada, hoteellada iyo qaybinta.",
    businessWholesaleAction: "Ka hadal ganacsiga jumlada",
    catalogue: "Dalbo buugga alaabta",
    profile: "Akhri xogta shirkadda",
    commitmentLabel: "Ballanqaadkeenna",
    commitmentTitle: "Tayo aan laga tanaasulin.",
    commitmentBody:
      "Marxalad kasta taxaddar ayaan ku shaqaynaa: xulashada miraha, diyaarinta nadaafadda leh iyo hubinta dufcad kasta ka hor baakadaynta.",
    orderLabel: "Weydii alaabta",
    orderTitle: "Wax badan ka ogow miraheenna.",
    orderBody:
      "Qiimaha tafaariiqda, kharashka gaarsiinta iyo alaabta la heli karo waan kuu xaqiijinaynaa ka hor inta aan dalabka la aqbalin.",
    orderFruit: "Wax ka weydii mirahan",
    paymentError:
      "Lacag-bixinta tooska ahi weli ma shaqaynayso. Horn & Harvest kala xiriir dhammaystirka dalabkaaga.",
    paymentSuccess:
      "Waxaad ka soo noqotay bogga bixinta. Dalabka waxaa la xaqiijinayaa marka lacagta la hubiyo.",
    paymentFailure:
      "Bixintu ma dhammaan. Wax lacag ah lama xaqiijin; fadlan mar kale isku day.",
    contactLabel: "Nala soo xiriir",
    contactTitle: "Wadahadal nala bilow.",
    contactBody: "",
    locations: "Mogadishu, Somalia",
    footerLine: "Dhadhanka Awoowayaasheen",
    footerTranslation: "The Taste of Our Ancestors",
    rights: "Horn & Harvest. Xuquuqda oo dhan way dhowran tahay.",
  },
} as const;

export default function App() {
  const oldPath = window.location.pathname;
  const aliases: Record<string, string> = {
    "/master-blueprint": "/operations/overview",
    "/workflow": "/operations/overview",
    "/warehouse-demo": "/warehouse/overview",
    "/operation-demo": "/operations/overview",
    "/operations-demo": "/operations/overview",
    "/ceo-demo": "/ceo/overview",
    "/ceo-desktop": "/ceo/overview",
    "/staff-attendance": "/operations/attendance",
    "/attendance": "/operations/attendance",
    "/order": "/customer/new-order",
    "/orders": "/customer/orders",
    "/invoice": "/customer/orders",
    "/login": "/customer",
    "/consignee": "/customer/overview",
    "/dashboard": "/customer/overview",
    "/admin-panel": "/admin/overview",
    "/field-sales": "/sales/prospects",
  };
  const hashRoutes: Record<string, string> = {
    "#top": "/operations/overview",
    "#today": "/ceo/overview",
    "#work": "/ceo/notes",
    "#business": "/ceo/account",
    "#mogintel": "/ceo/market",
    "#reference": "/ceo/reference",
    "#pricing": "/ceo/pricing",
    "#brand": "/ceo/reference",
    "#pitchlib": "/ceo/notes",
    "#strategy": "/ceo/notes",
    "#intelligence": "/ceo/market",
    "#growth": "/ceo/prospects",
    "#prospects": "/ceo/prospects",
    "#coach": "/ceo/notes",
    "#planner": "/ceo/notes",
    "#decisions": "/ceo/notes",
    "#meetings": "/ceo/notes",
    "#finance": "/ceo/account",
    "#journal": "/ceo/notes",
    "#tools": "/ceo/reference",
    "#warehouse-home": "/warehouse/overview",
    "#wh-today-production": "/warehouse/batches",
    "#wh-intake": "/warehouse/intakes",
    "#wh-process": "/warehouse/batches",
    "#wh-stock": "/warehouse/stock",
    "#wh-orders": "/warehouse/orders",
    "#wh-attendance": "/warehouse/attendance",
    "#attendance-in": "/warehouse/attendance",
    "#attendance-out": "/warehouse/attendance",
    "#wh-season": "/warehouse/forecasts",
    "#wh-dispatch": "/warehouse/orders",
    "#driver-home": "/driver/overview",
    "#driver-route": "/driver/routes",
    "#driver-stop": "/driver/orders",
    "#delivery-proof": "/driver/orders",
    "#sales-home": "/sales/prospects",
    "#sales-visit": "/sales/visits",
    "#sales-outcome": "/sales/visits",
    "#sales-activate": "/sales/prospects",
    "#sales-trial": "/sales/trials",
    "#customer-home": "/customer/overview",
    "#customer-order": "/customer/new-order",
    "#customer-track": "/customer/orders",
    "#customer-invoices": "/customer/orders",
    "#customer-notifications": "/customer/overview",
    "#growth-home": "/sales/prospects",
    "#ceo-home": "/ceo/overview",
    "#permissions": "/operations/reference",
  };
  if (aliases[oldPath]) {
    history.replaceState(
      null,
      "",
      hashRoutes[location.hash] || aliases[oldPath],
    );
  }
  if (oldPath.startsWith("/track/"))
    history.replaceState(
      null,
      "",
      "/customer/orders/" +
        encodeURIComponent(oldPath.split("/")[2]) +
        "/tracking",
    );

  if (
    /^\/(customer|warehouse|driver|sales|ceo|admin|operations)(\/|$)/.test(
      window.location.pathname,
    )
  )
    return <ConnectedPortal />;
  if (window.location.pathname === "/trade")
    return (
      <TradeAccessPage
        language="so"
        onBack={() => location.assign("/")}
        onSignIn={() => location.assign("/customer")}
      />
    );
  if (
    !["/", "/invoice-preview", "/payment/success", "/payment/failure"].includes(
      window.location.pathname,
    )
  )
    return (
      <main className="connected-portal">
        <h1>Page not found</h1>
        <a href="/">Return to Horn & Harvest</a>
      </main>
    );
  return <PublicWebsite />;
}

function PublicWebsite() {
  if (window.location.pathname === "/invoice-preview")
    return <InvoicePreviewPage />;
  const [language, setLanguage] = useState<Language>("so");
  const [menuOpen, setMenuOpen] = useState(false);
  const text = copy[language];
  const fruitImages = [
    mangoImage,
    papayaImage,
    ladySoftImage,
    ladySpicyImage,
    isbaandheysImage,
  ];
  const paymentState =
    typeof window !== "undefined" &&
    window.location.pathname.includes("/payment/success")
      ? "success"
      : typeof window !== "undefined" &&
          window.location.pathname.includes("/payment/failure")
        ? "failure"
        : null;
  const targets = ["story", "collection", "quality", "partnership"];
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = "Horn & Harvest | Premium Naturally Dried Somali Fruits";
  }, [language]);
  const chooseFruit = () =>
    window.setTimeout(
      () =>
        document
          .getElementById("buyer-services")
          ?.scrollIntoView({ behavior: "smooth" }),
      40,
    );

  const openTradePortal = () => {
    location.assign("/trade");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#home">
          <img src={logo} alt="Horn & Harvest" />
        </a>
        <nav className="desktop-nav">
          {text.nav.map((item, i) => (
            <a key={item} href={`#${targets[i]}`}>
              {item}
            </a>
          ))}
          <button
            className="portal-nav"
            type="button"
            onClick={openTradePortal}
          >
            {text.portal}
          </button>
        </nav>
        <div className="header-actions">
          <div className="language-switch">
            <button
              className={language === "so" ? "active" : ""}
              onClick={() => setLanguage("so")}
            >
              SO
            </button>
            <span />
            <button
              className={language === "en" ? "active" : ""}
              onClick={() => setLanguage("en")}
            >
              EN
            </button>
          </div>
          <button
            className="menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={language === "so" ? "Liiska bogagga" : "Menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav className="mobile-nav">
            {text.nav.map((item, i) => (
              <a
                key={item}
                href={`#${targets[i]}`}
                onClick={() => setMenuOpen(false)}
              >
                {item}
              </a>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                openTradePortal();
              }}
            >
              {text.portal}
            </button>
          </nav>
        )}
      </header>

      <main>
        {paymentState && (
          <div className={`payment-status ${paymentState}`} role="status">
            {paymentState === "success"
              ? text.paymentSuccess
              : text.paymentFailure}
          </div>
        )}
        <section className="hero" id="home">
          <img
            className="hero-media"
            src={heroImage}
            alt="A Somali mango orchard beside the river in golden morning light"
          />
          <div className="hero-wash" />
          <div className="hero-frame" />
          <div className="hero-content">
            <p className="eyebrow light">{text.eyebrow}</p>
            <h1>{text.hero}</h1>
            <p className="hero-subtitle">{text.heroSub}</p>
            <div className="hero-actions">
              <a className="button gold" href="#collection">
                {text.discover}
                <ArrowRight />
              </a>
              <a className="button ghost" href="#contact">
                {text.trade}
              </a>
            </div>
          </div>
          <a className="scroll-cue" href="#story" aria-label="Continue">
            <ArrowDown />
          </a>
        </section>

        <section className="story section" id="story">
          <div className="story-copy">
            <p className="eyebrow">{text.storyLabel}</p>
            <h2>{text.storyTitle}</h2>
            <p className="story-translation">{text.quote}</p>
            <p className="lead">{text.storyBody}</p>
          </div>
          <figure className="story-selection">
            <img
              src={farmerSelectionImage}
              alt={
                language === "so"
                  ? "Gacmaha beeraleyda oo haya cambe bisil"
                  : "A farmer’s hands holding a ripe mango"
              }
              loading="lazy"
            />
          </figure>
        </section>

        <section className="collection section-wide" id="collection">
          <div className="section-heading centered">
            <p className="eyebrow">{text.collectionLabel}</p>
            <h2>{text.collectionTitle}</h2>
            <p>{text.collectionBody}</p>
          </div>
          <div className="product-gallery">
            {text.fruits.map(([name, description], i) => (
              <article
                className={`fruit-card${i === 4 ? " fruit-card-isbaandheys" : ""}`}
                key={name}
              >
                <div className="fruit-visual">
                  <img src={fruitImages[i]} alt={name} loading="lazy" />
                  <div className="fruit-card-wash" />
                  <div className="fruit-card-copy">
                    <span>0{i + 1}</span>
                    <h3>{name}</h3>
                    {description && <p>{description}</p>}
                    <button type="button" onClick={chooseFruit}>
                      {text.orderFruit}
                      <ChevronRight />
                    </button>
                  </div>
                </div>
                <details className="fruit-origin">
                  <summary>
                    {language === "so"
                      ? "Asalka iyo xogta dufcadda"
                      : "Origin & batch information"}
                  </summary>
                  <p>
                    {language === "so"
                      ? "Miro laga helo Soomaaliya. Markaad xogta miraha, beeraha ama diyaarinta codsanayso, noo sheeg lambarka dufcadda ku qoran baakadka."
                      : "Sourced from Somalia. Quote the batch code on your pouch when requesting origin, packing or available quality records."}
                  </p>
                  <a href="#buyer-services">
                    {language === "so"
                      ? "Codso xogta dufcadda"
                      : "Request batch information"}
                  </a>
                </details>
              </article>
            ))}
          </div>
        </section>

        <section className="quality" id="quality">
          <div className="quality-inner section-wide">
            <div className="quality-intro">
              <p className="eyebrow light">{text.qualityLabel}</p>
              <h2>{text.qualityTitle}</h2>
              {text.qualityBody && <p>{text.qualityBody}</p>}
            </div>
            <div className="standard-cards">
              {text.qualities.map(([title, body], index) => (
                <article key={title}>
                  <span>0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="process section">
          <figure className="process-image image-frame">
            <img
              src={hygienicProcessImage}
              alt="Horn & Harvest team hygienically packing naturally dried fruit while wearing gloves, hairnets and protective clothing"
              loading="lazy"
            />
          </figure>
          <div className="process-copy">
            <p className="eyebrow">{text.processLabel}</p>
            <h2>{text.processTitle}</h2>
            <InteractiveJourney language={language} />
          </div>
        </section>

        <ProductionFilms language={language} />
        <section className="partnership" id="partnership">
          <div className="partnership-rule" />
          <div className="partnership-inner">
            <p className="eyebrow">{text.partnershipLabel}</p>
            <h2>{text.partnershipTitle}</h2>
            {text.partnershipBody && <p>{text.partnershipBody}</p>}
            <div className="business-cards">
              <a
                href="/documents/horn-and-harvest-company-profile.pdf"
                target="_blank"
                rel="noreferrer"
              >
                <span>01</span>
                <h3>{text.businessProfileTitle}</h3>
                <p>{text.businessProfileBody}</p>
                <strong>
                  {text.businessProfileAction}
                  <ArrowRight />
                </strong>
              </a>
              <button type="button" onClick={openTradePortal}>
                <span>02</span>
                <h3>{text.businessWholesaleTitle}</h3>
                <p>{text.businessWholesaleBody}</p>
                <strong>
                  {text.businessWholesaleAction}
                  <ArrowRight />
                </strong>
              </button>
            </div>
          </div>
        </section>

        <RetailTradeOrder
          language={language}
          onSignIn={() => location.assign("/customer")}
        />

        <BuyerServices language={language} />
        <section
          className="commitment section"
          aria-labelledby="commitment-title"
        >
          <div className="commitment-rule" />
          <p className="eyebrow">{text.commitmentLabel}</p>
          <h2 id="commitment-title">{text.commitmentTitle}</h2>
          <p>{text.commitmentBody}</p>
        </section>

        <section className="contact section-wide" id="contact">
          <div className="contact-heading">
            <p className="eyebrow light">{text.contactLabel}</p>
            <h2>{text.contactTitle}</h2>
          </div>
          <div className="contact-links">
            <a href="tel:+252612443333">
              <Phone />
              <span>+252 612 443333</span>
            </a>
            <a href="mailto:info@hornandharvest.com">
              <Mail />
              <span>info@hornandharvest.com</span>
            </a>
            <a
              href="https://hornandharvest.com"
              target="_blank"
              rel="noreferrer"
            >
              <Globe2 />
              <span>hornandharvest.com</span>
            </a>
            <div>
              <MapPin />
              <span>{text.locations}</span>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <img src={logo} alt="Horn & Harvest" />
        <div className="footer-slogan">
          <strong>{text.footerLine}</strong>
          <span>{text.footerTranslation}</span>
        </div>
        <p>
          © {new Date().getFullYear()} {text.rights}
        </p>
      </footer>
    </div>
  );
}
