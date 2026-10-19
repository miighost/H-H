/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, StorySection, LabCertificationDetail } from "./types";

export const BRAND_PRODUCTS: Product[] = [
  {
    id: "mango",
    name: "Mango",
    scientificName: "Mangifera indica L. (Somali Heirloom)",
    description: "Naturally dried mango.",
    extendedDescription: "Naturally dried mango.",
    badges: ["Naturally dried", "Carefully packed", "Somali origin"],
    sugarContentDetails: "See the pouch for product ingredients and nutritional information.",
    imageUrl: "/src/assets/images/regenerated_image_1782223583418.png",
    fallbackImageColor: "from-amber-500 to-orange-600",
    price: 15,
    traceability: {
      batchNumber: "HH-MAN-2026-04",
      sourceValley: "Shabelle River Valley",
      farmCoordinate: "Afgooye, Shabelle Hoose (2.1388° N, 44.8239° E)",
      altitude: "82m above sea level",
      harvestDate: "May 12, 2026",
      moistureLevel: "14.2% (Perfect shelf stability)",
      dryingTimeHours: 18,
      unFaoZone: "Lower Shabelle Riparian Belt (FAO Zone 12)",
      labCertificateNo: "",
      testDate: "May 28, 2026",
      heavyMetalsStatus: "Batch information on request",
      pesticideStatus: "Batch information on request",
      yeastMoldCount: "Batch information on request",
      microbialStatus: "Batch information on request",
      phLevel: "4.12",
      bxSweetnessRating: "Batch information on request"
    }
  },
  {
    id: "papaya",
    name: "Papaya",
    scientificName: "Carica papaya L. (Equatorial Red)",
    description: "Naturally dried papaya.",
    extendedDescription: "Naturally dried papaya.",
    badges: ["Naturally dried", "Carefully packed", "Somali origin"],
    sugarContentDetails: "See the pouch for product ingredients and nutritional information.",
    imageUrl: "/src/assets/images/regenerated_image_1781794341750.png",
    fallbackImageColor: "from-red-500 to-orange-500",
    price: 12,
    traceability: {
      batchNumber: "HH-PAP-2026-03",
      sourceValley: "Juba River Valley",
      farmCoordinate: "Jamaame, Jubbada Hoose (0.1250° S, 42.7167° E)",
      altitude: "12m above sea level",
      harvestDate: "May 15, 2026",
      moistureLevel: "15.0% (Tender bite)",
      dryingTimeHours: 16,
      unFaoZone: "Lower Juba Agricultural Delta (FAO Zone 15)",
      labCertificateNo: "",
      testDate: "June 02, 2026",
      heavyMetalsStatus: "Batch information on request",
      pesticideStatus: "Batch information on request",
      yeastMoldCount: "Batch information on request",
      microbialStatus: "Batch information on request",
      phLevel: "5.15",
      bxSweetnessRating: "Batch information on request"
    }
  },
  {
    id: "isbaandheys-national-treasure",
    name: "Isbaandheys",
    scientificName: "Cucumis melo L. var. (Somali Heirloom Cantaloupe-Rose)",
    description: "Naturally dried Isbaandheys.",
    extendedDescription: "Naturally dried Isbaandheys.",
    badges: ["Naturally dried", "Carefully packed", "Somali origin"],
    sugarContentDetails: "See the pouch for product ingredients and nutritional information.",
    imageUrl: "/src/assets/images/regenerated_image_1781793823186.jpg",
    fallbackImageColor: "from-amber-400 to-yellow-600",
    price: 18,
    traceability: {
      batchNumber: "HH-ISB-2026-01",
      sourceValley: "Shabelle River Valley",
      farmCoordinate: "Sablaale, Shabelle Hoose (1.1416° N, 44.0227° E)",
      altitude: "68m above sea level",
      harvestDate: "May 19, 2026",
      moistureLevel: "13.8% (Intense chew)",
      dryingTimeHours: 20,
      unFaoZone: "Middle-Lower Shabelle Basin (FAO Zone 13)",
      labCertificateNo: "",
      testDate: "June 05, 2026",
      heavyMetalsStatus: "Batch information on request",
      pesticideStatus: "Batch information on request",
      yeastMoldCount: "Batch information on request",
      microbialStatus: "Batch information on request",
      phLevel: "4.70",
      bxSweetnessRating: "Batch information on request"
    }
  },
  {
    id: "banana-lady-soft",
    name: "Banana - Lady Soft",
    scientificName: "Musa acuminata (Dwarf Somali Sugar-Banana)",
    description: "Naturally dried Banana - Lady Soft.",
    extendedDescription: "Naturally dried Banana - Lady Soft.",
    badges: ["Naturally dried", "Carefully packed", "Somali origin"],
    sugarContentDetails: "See the pouch for product ingredients and nutritional information.",
    imageUrl: "/src/assets/images/regenerated_image_1781793824797.jpg",
    fallbackImageColor: "from-yellow-300 to-amber-500",
    price: 10,
    traceability: {
      batchNumber: "HH-BAN-2026-05",
      sourceValley: "Juba River Valley",
      farmCoordinate: "Kismayo Forest belt, Jubbada Hoose (0.3581° S, 42.5447° E)",
      altitude: "45m above sea level",
      harvestDate: "May 22, 2026",
      moistureLevel: "16.1% (Exquisite tender texture)",
      dryingTimeHours: 15,
      unFaoZone: "Lower Juba Forest & Fruit Basin (FAO Zone 16)",
      labCertificateNo: "",
      testDate: "June 08, 2026",
      heavyMetalsStatus: "Batch information on request",
      pesticideStatus: "Batch information on request",
      yeastMoldCount: "Batch information on request",
      microbialStatus: "Batch information on request",
      phLevel: "4.90",
      bxSweetnessRating: "Batch information on request"
    }
  },
  {
    id: "banana-lady-spicy",
    name: "Banana - Lady Spicy",
    scientificName: "Musa balbisiana hybrid (Somali Ginger-Banana)",
    description: "Naturally dried Banana - Lady Spicy.",
    extendedDescription: "Naturally dried Banana - Lady Spicy.",
    badges: ["Naturally dried", "Carefully packed", "Somali origin"],
    sugarContentDetails: "See the pouch for product ingredients and nutritional information.",
    imageUrl: "/src/assets/images/regenerated_image_1781793826798.jpg",
    fallbackImageColor: "from-amber-600 to-orange-700",
    price: 11,
    traceability: {
      batchNumber: "HH-BAN-SP-2026-02",
      sourceValley: "Shabelle River Valley",
      farmCoordinate: "Balcad, Shabelle Dhexe (2.3551° N, 45.3881° E)",
      altitude: "90m above sea level",
      harvestDate: "May 25, 2026",
      moistureLevel: "14.8% (Chewy & aromatically warm)",
      dryingTimeHours: 17,
      unFaoZone: "Middle Shabelle Forest Delta (FAO Zone 11)",
      labCertificateNo: "",
      testDate: "June 10, 2026",
      heavyMetalsStatus: "Batch information on request",
      pesticideStatus: "Batch information on request",
      yeastMoldCount: "Batch information on request",
      microbialStatus: "Batch information on request",
      phLevel: "4.85",
      bxSweetnessRating: "Batch information on request"
    }
  }
];

export const STORY_SECTIONS: StorySection[] = [
  {
    title: "Double Rivers Flow",
    subtitle: "Through the Twin Gilded Valleys",
    content: "The Shabelle and Juba rivers flow through some of the most fertile land on Earth — rich mineral soil, crystal-clear fresh water, and year-round warm sunshine. This magical climate and geography provide the absolute master key to Somalia's unique agricultural potential.",
    imageUrl: "/src/assets/images/regenerated_image_1781794338043.jpg",
    imageAlt: "Wide shot of the double rivers winding through the fertile green Somali landscape"
  },
  {
    title: "The Golden Law of Sweetness",
    subtitle: "Fruit from Somalia’s river valleys",
    content: "The Shabelle and Juba valleys support fruit growing and local farming communities.",
    imageUrl: "/src/assets/images/regenerated_image_1781793815025.jpg",
    imageAlt: "Lush tropical orchard of ancient fruit trees heavy with organic harvests"
  },
  {
    title: "Gentle Peak Harvesting",
    subtitle: "By Generations of Knowledgeable Hands",
    content: "Ripe fruit is selected and checked before preparation. Careful handling helps protect it during harvesting and transport.",
    imageUrl: "/src/assets/images/regenerated_image_1781793816992.jpg",
    imageAlt: "Farmers hand-picking ripe fruits under warm golden morning skies"
  },
  {
    title: "3.5kW Thermal Heritage Precision",
    subtitle: "Bridging Science & Somali Sun",
    content: "Our fruit is naturally dried, then carefully packed. Drying time depends on the fruit and its preparation.",
    imageUrl: "/src/assets/images/regenerated_image_1781793818712.jpg",
    imageAlt: "State-of-the-art hygienic drying dehydration system"
  }
];

export const LAB_DETAILS: LabCertificationDetail[] = [];

export const TRUST_BAR_ITEMS = ["Naturally dried", "Carefully packed", "Somali origin"];
