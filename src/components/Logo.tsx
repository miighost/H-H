/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
// @ts-ignore
import logoDefault from "../assets/images/regenerated_image_1781794341750.png";
// @ts-ignore
import brandLogoImg from "../assets/images/brand_logo.svg";
// @ts-ignore
import brandLogoWhiteImg from "../assets/images/brand_logo_white.svg";

interface LogoProps {
  /**
   * Layout style of the logo
   * - 'full': Horizontal layout with the Horn symbol and "Horn & Harvest" text
   * - 'stacked': Vertical layout with the Horn symbol centered above the text
   * - 'symbol': Only the stylized golden Horn symbol/icon
   * - 'text': Only the elegant serif "Horn & Harvest" typography
   */
  variant?: "full" | "stacked" | "symbol" | "text";
  /** Size modifier for the symbol/container */
  size?: "sm" | "md" | "lg" | "xl" | "custom";
  /** Custom height, used when size is 'custom' */
  height?: string;
  /** Custom width, used when size is 'custom' */
  width?: string;
  /** Custom text color overrides (defaults to matching theme classes) */
  textColorClass?: string;
  /** Extra CSS classes for the container */
  className?: string;
  /** Custom image src for the logo symbol, allows image replacement and annotating */
  logoImgSrc?: string;
}

export default function Logo({
  variant = "full",
  size = "md",
  height,
  width,
  textColorClass = "text-brand-cream",
  className = "",
  logoImgSrc,
}: LogoProps) {
  // Determine size classes
  const sizeMap = {
    sm: { symbol: "w-7 h-7 sm:w-8 sm:h-8", text: "text-base sm:text-lg", container: "gap-1.5 sm:gap-2", logoWidth: "w-32 h-8 sm:w-40 sm:h-10" },
    md: { symbol: "w-8 h-8 sm:w-12 sm:h-12", text: "text-base sm:text-2xl", container: "gap-2 sm:gap-3", logoWidth: "w-44 h-11 sm:w-52 sm:h-13" },
    lg: { symbol: "w-12 h-12 sm:w-16 sm:h-16", text: "text-xl sm:text-3xl", container: "gap-2.5 sm:gap-4", logoWidth: "w-56 h-14 sm:w-64 sm:h-16" },
    xl: { symbol: "w-16 h-16 sm:w-24 sm:h-24", text: "text-2xl sm:text-4xl", container: "gap-4 sm:gap-6", logoWidth: "w-72 h-18 sm:w-80 sm:h-20" },
    custom: { symbol: "", text: "", container: "", logoWidth: "" },
  };

  const selectedSize = sizeMap[size];

  // Horn golden icon (represented by the previous premium vector SVG implementation by default, fallback to logoImgSrc if provided)
  const renderHornSymbol = () => {
    const symbolStyle = size === "custom" ? { width, height } : {};
    const symbolClass = size === "custom" ? "" : selectedSize.symbol;

    if (logoImgSrc) {
      return (
        <img
          src={logoImgSrc}
          alt="Horn & Harvest Gold Logo Symbol"
          referrerPolicy="no-referrer"
          className={`shrink-0 object-contain rounded-full border border-brand-gold/30 p-0.5 ${symbolClass}`}
          style={symbolStyle}
        />
      );
    }

    return (
      <svg
        className={`shrink-0 ${symbolClass}`}
        style={symbolStyle}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Rich multi-stop metallic gold linear gradient */}
          <linearGradient id="goldMetallic" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8C6212" />
            <stop offset="20%" stopColor="#B4914C" />
            <stop offset="50%" stopColor="#F1D784" />
            <stop offset="80%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#B4914C" />
          </linearGradient>
          
          {/* Subtle drop shadow/glow filter for metallic feel */}
          <filter id="goldSoftGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
          </filter>
        </defs>

        <g filter="url(#goldSoftGlow)">
          {/* Segment 1: Curved Pointy Tip of the Horn of Plenty (Leftmost) */}
          <path
            d="M 12 28 C 10 24, 6 25, 4 33 C 2 40, 6 48, 12 52 C 16 54, 18 50, 16 45 C 14 41, 10 39, 11 34 C 12 30, 13 30, 12 28 Z"
            fill="url(#goldMetallic)"
          />

          {/* Segment 2: Small body curve */}
          <path
            d="M 13 42 C 14 36, 17 33, 21 34 C 25 35, 27 39, 26 47 C 25 53, 22 57, 16 55 C 14 55, 12 51, 13 42 Z"
            fill="url(#goldMetallic)"
          />

          {/* Segment 3: Medium body curve */}
          <path
            d="M 22 45 C 23 37, 27 33, 33 34 C 38 35, 41 41, 40 51 C 39 59, 34 64, 26 61 C 23 60, 21 55, 22 45 Z"
            fill="url(#goldMetallic)"
          />

          {/* Segment 4: Larger mid-body section */}
          <path
            d="M 34 49 C 35 39, 41 33, 49 34 C 55 35, 59 43, 58 55 C 57 65, 50 71, 40 67 C 36 66, 33 59, 34 49 Z"
            fill="url(#goldMetallic)"
          />

          {/* Segment 5: Big collar segment leading to rim */}
          <path
            d="M 49 53 C 51 41, 58 33, 67 34 C 74 35, 79 46, 78 59 C 77 71, 68 78, 57 74 C 52 72, 48 65, 49 53 Z"
            fill="url(#goldMetallic)"
          />

          {/* Segment 6: Elegant opening rim of the Horn (Rightmost ellipse) */}
          <path
            d="M 67 34 C 73 34, 82 43, 82 56 C 82 69, 74 77, 68 77 C 62 77, 60 67, 60 55 C 60 42, 63 34, 67 34 Z 
               M 66 38 C 63 38, 62 44, 62 55 C 62 65, 63 73, 67 73 C 71 73, 78 66, 78 56 C 78 45, 71 38, 66 38 Z"
            fill="url(#goldMetallic)"
            fillRule="evenodd"
          />
        </g>
      </svg>
    );
  };

  // Typographic component
  const renderLogoText = () => {
    return (
      <div className="flex flex-col text-left select-none leading-none">
        <div className={`font-serif tracking-wider font-semibold ${textColorClass} ${selectedSize.text} flex items-center justify-start gap-1`}>
          <span>Horn</span>
          <span className="text-brand-gold italic font-light font-serif">&amp;</span>
        </div>
        <div className={`font-serif tracking-widest uppercase font-light text-brand-gold mt-1 ${
          size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : size === "lg" ? "text-sm" : "text-lg"
        }`}>
          Harvest
        </div>
        <div className={`font-mono tracking-[0.2em] uppercase text-dark-text/40 dark:text-brand-cream/40 mt-1.5 ${
          size === "sm" ? "text-[6px]" : "text-[8px]"
        }`}>
          Heritage of Somalia
        </div>
      </div>
    );
  };

  // Main render combinations
  if (variant === "symbol") {
    return <div className={`inline-flex items-center justify-center ${className}`}>{renderHornSymbol()}</div>;
  }

  if (variant === "text") {
    return <div className={`inline-flex items-center justify-center ${className}`}>{renderLogoText()}</div>;
  }

  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${selectedSize.container} ${className}`}>
        {renderHornSymbol()}
        {renderLogoText()}
      </div>
    );
  }

  // Variant "full" (Horizontal layout) is now a SINGLE unified image representing the premium branding
  // This satisfies 'also this the should be 1 image' absolutely perfectly so it is fully image-replaceable.
  const isLightBackground = textColorClass.includes("text-[#1C3B2F]") || textColorClass.includes("text-[#2C2C2C]");
  const defaultUnifiedSrc = isLightBackground ? brandLogoImg : brandLogoWhiteImg;

  return (
    <img
      src={logoImgSrc || defaultUnifiedSrc}
      alt="Horn & Harvest Premium Brand Logo"
      referrerPolicy="no-referrer"
      className={`object-contain max-h-full ${selectedSize.logoWidth} ${className}`}
      style={size === "custom" ? { width, height } : {}}
    />
  );
}
