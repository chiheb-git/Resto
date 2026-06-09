import { useCurrency, formatPrice } from "@/lib/currency";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import i18n from "@/i18n";
import {
  useGetTableByToken,
  useListCategories,
  useListDishes,
  useCreateOrder,
  useGetActiveOrderByTable,
  useCreateRating,
  getGetActiveOrderByTableQueryKey,
} from "@workspace/api-client-react";
import type { Dish, OrderWithItems } from "@workspace/api-client-react";
import { toast } from "sonner";
import { getSocket } from "@/lib/socket";

/* ============================================================
   TYPES
   ============================================================ */
interface CartItem {
  dish: Dish;
  quantity: number;
  customNote?: string;
  selectedSize?: "normale" | "grande";
  unitPrice: number;
}

/* ============================================================
   HELPERS
   ============================================================ */
function getLangName(item: Record<string, unknown>, lang: string): string {
  const key = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
  return (item[key] as string) || (item.nameEn as string) || "";
}

function getLangDesc(item: Record<string, unknown>, lang: string): string {
  const key = `description${lang.charAt(0).toUpperCase() + lang.slice(1)}`;
  return (item[key] as string) || (item.descriptionEn as string) || "";
}

const FOOD_EMOJIS: Record<string, string> = {
  pizza: "🍕", burger: "🍔", pasta: "🍝", salad: "🥗", soup: "🍲", dessert: "🍮", drink: "🥤", coffee: "☕", default: "🍽️",
};
function getFoodEmoji(name: string): string {
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(FOOD_EMOJIS)) if (n.includes(k)) return v;
  return FOOD_EMOJIS.default;
}

/* ============================================================
   HERO BANNER 3D ULTRA PROFESSIONNEL
   ============================================================ */
function HeroBanner({ tableNumber }: { tableNumber: number | string }) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const logoRef  = useRef<HTMLDivElement>(null);
  const bagRef   = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [tick, setTick]   = useState(0);

  /* Parallax mouse */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = bannerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 2,
      y: ((e.clientY - r.top)  / r.height - 0.5) * 2,
    });
  };
  const handleMouseLeave = () => setMouse({ x: 0, y: 0 });

  /* Breathing tick for bag */
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 50);
    return () => clearInterval(id);
  }, []);
  const breath = Math.sin(tick * 0.08);

  /* Bag 3D tilt */
  const bagTiltX = mouse.y * -12;
  const bagTiltY = mouse.x *  12;
  const bagFloat = breath * 6;

  return (
    <div
      ref={bannerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: "relative",
        margin: "20px 16px 0",
        borderRadius: 28,
        overflow: "hidden",
        height: 220,
        background: "linear-gradient(135deg,#0D0D18 0%,#1A0E2E 40%,#0F1620 100%)",
        border: "0.5px solid rgba(255,107,53,0.18)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,107,53,0.08) inset",
        cursor: "none",
      }}
    >
      {/* ---- SVG animated background grid ---- */}
      <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.07 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hgrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FF6B35" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hgrid)"
          style={{ transform:`translate(${mouse.x*8}px,${mouse.y*8}px)`, transition:"transform 0.6s ease" }}/>
      </svg>

      {/* ---- Orbs ---- */}
      <div style={{
        position:"absolute", width:320, height:320, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(255,107,53,0.22) 0%,transparent 70%)",
        top:-80, left:-60,
        transform:`translate(${mouse.x*18}px,${mouse.y*18}px)`,
        transition:"transform 0.8s cubic-bezier(0.4,0,0.2,1)",
        filter:"blur(2px)",
      }}/>
      <div style={{
        position:"absolute", width:240, height:240, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(168,85,247,0.18) 0%,transparent 70%)",
        bottom:-60, left:"35%",
        transform:`translate(${mouse.x*-12}px,${mouse.y*-12}px)`,
        transition:"transform 0.9s cubic-bezier(0.4,0,0.2,1)",
        filter:"blur(2px)",
      }}/>
      <div style={{
        position:"absolute", width:180, height:180, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(255,159,28,0.15) 0%,transparent 70%)",
        top:20, right:"15%",
        transform:`translate(${mouse.x*10}px,${mouse.y*10}px)`,
        transition:"transform 1s cubic-bezier(0.4,0,0.2,1)",
        filter:"blur(1px)",
      }}/>

      {/* ---- Floating particles ---- */}
      {[
        { x:"8%",  y:"20%", size:3, delay:0,   color:"#FF6B35" },
        { x:"20%", y:"70%", size:2, delay:0.6, color:"#FF9F1C" },
        { x:"55%", y:"15%", size:2, delay:1.2, color:"#a855f7" },
        { x:"75%", y:"60%", size:3, delay:0.3, color:"#FF6B35" },
        { x:"88%", y:"30%", size:2, delay:0.9, color:"#FF9F1C" },
        { x:"42%", y:"80%", size:2, delay:1.5, color:"#a855f7" },
      ].map((p,i) => (
        <div key={i} style={{
          position:"absolute", left:p.x, top:p.y,
          width:p.size, height:p.size, borderRadius:"50%",
          background:p.color,
          boxShadow:`0 0 ${p.size*3}px ${p.color}`,
          animation:`heroParticle 3s ${p.delay}s ease-in-out infinite`,
        }}/>
      ))}

      {/* ---- LEFT TEXT BLOCK ---- */}
      <div style={{
        position:"absolute", left:28, top:"50%",
        transform:`translateY(-50%) translate(${mouse.x*-5}px,${mouse.y*-5}px)`,
        transition:"transform 0.6s cubic-bezier(0.4,0,0.2,1)",
        zIndex:10,
        maxWidth: 260,
      }}>
        {/* Label */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:6,
          padding:"4px 12px", borderRadius:100,
          background:"rgba(255,107,53,0.12)",
          border:"0.5px solid rgba(255,107,53,0.35)",
          marginBottom:10,
        }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#FF6B35", display:"inline-block", boxShadow:"0 0 6px #FF6B35" }}/>
          <span style={{ fontSize:10, fontWeight:700, color:"#FF9F1C", letterSpacing:"0.12em", textTransform:"uppercase" }}>
            Table {tableNumber} � Bienvenue
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily:"'Playfair Display',Georgia,serif",
          fontSize:34, fontWeight:700, lineHeight:1.15,
          color:"#F5F5F0", marginBottom:8,
          textShadow:"0 2px 24px rgba(0,0,0,0.8)",
        }}>
          Notre{" "}
          <span style={{
            background:"linear-gradient(135deg,#FF6B35 0%,#FF9F1C 50%,#FFD700 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            display:"inline-block",
          }}>
            Menu
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize:13, color:"rgba(245,245,240,0.5)",
          fontFamily:"'DM Sans',-apple-system,sans-serif",
          letterSpacing:"0.01em", lineHeight:1.5,
        }}>
          D�couvrez nos plats pr�par�s avec passion
        </p>

        {/* Divider line animated */}
        <div style={{
          marginTop:14, height:2, width:60, borderRadius:2,
          background:"linear-gradient(90deg,#FF6B35,#FF9F1C,transparent)",
          animation:"heroDivider 2s ease-in-out infinite alternate",
        }}/>
      </div>

      {/* ---- 3D LOGO ICON (LEFT SIDE FLOATING) ---- */}
      <div
        ref={logoRef}
        style={{
          position:"absolute", left:230, top:"50%",
          transform:`translateY(-50%) translate(${mouse.x*8}px,${mouse.y*8+bagFloat*0.4}px)`,
          transition:"transform 0.5s cubic-bezier(0.4,0,0.2,1)",
          zIndex:8,
          opacity:0.18,
        }}
      >
        {/* Big R letter 3D shadow */}
        <div style={{
          fontFamily:"'Playfair Display',Georgia,serif",
          fontSize:120, fontWeight:900,
          background:"linear-gradient(135deg,rgba(255,107,53,0.6),rgba(255,159,28,0.3))",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          filter:"blur(0.5px)",
          userSelect:"none",
          lineHeight:1,
        }}>R</div>
      </div>

      {/* ---- 3D SHOPPING BAG (RIGHT SIDE) ---- */}
      <div
        ref={bagRef}
        style={{
          position:"absolute",
          right:24, top:"50%",
          transform:`translateY(-50%) translateY(${bagFloat}px) perspective(800px) rotateX(${bagTiltX}deg) rotateY(${bagTiltY}deg)`,
          transition:"transform 0.15s linear",
          zIndex:10,
          width:140, height:160,
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        }}
      >
        {/* Bag SVG 3D */}
        <svg width="130" height="150" viewBox="0 0 130 150" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ filter:"drop-shadow(0 20px 40px rgba(255,107,53,0.45)) drop-shadow(0 4px 12px rgba(0,0,0,0.6))" }}>
          {/* Handle */}
          <path d="M45 45 C45 25 85 25 85 45" stroke="url(#hg1)" strokeWidth="6" strokeLinecap="round" fill="none"/>
          {/* Bag body */}
          <rect x="20" y="45" width="90" height="80" rx="14" fill="url(#hg2)"/>
          {/* Shine top */}
          <rect x="20" y="45" width="90" height="28" rx="14" fill="url(#hg3)" opacity="0.35"/>
          {/* Left dark side for 3D depth */}
          <rect x="20" y="45" width="14" height="80" rx="7" fill="rgba(0,0,0,0.25)"/>
          {/* Bottom shadow */}
          <ellipse cx="65" cy="130" rx="42" ry="6" fill="rgba(255,107,53,0.2)"/>
          {/* Center logo R */}
          <text x="65" y="100" textAnchor="middle"
            fontFamily="Georgia,serif" fontSize="36" fontWeight="900"
            fill="rgba(255,255,255,0.95)"
            style={{ filter:"drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>R</text>
          {/* Sparkle dots */}
          <circle cx="98" cy="56" r="3.5" fill="#FFD700" opacity="0.9"/>
          <circle cx="106" cy="68" r="2" fill="#FF9F1C" opacity="0.7"/>
          <circle cx="94" cy="70" r="1.5" fill="white" opacity="0.6"/>
          {/* Gradients */}
          <defs>
            <linearGradient id="hg1" x1="45" y1="45" x2="85" y2="45" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF6B35"/>
              <stop offset="100%" stopColor="#FF9F1C"/>
            </linearGradient>
            <linearGradient id="hg2" x1="20" y1="45" x2="110" y2="125" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF7A40"/>
              <stop offset="50%" stopColor="#E85D20"/>
              <stop offset="100%" stopColor="#C04010"/>
            </linearGradient>
            <linearGradient id="hg3" x1="20" y1="45" x2="110" y2="73" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="white"/>
              <stop offset="100%" stopColor="transparent"/>
            </linearGradient>
          </defs>
        </svg>

        {/* Reflection below bag */}
        <div style={{
          width:80, height:16, marginTop:-4,
          background:"linear-gradient(to bottom,rgba(255,107,53,0.2),transparent)",
          borderRadius:"50%",
          filter:"blur(6px)",
          transform:`scaleX(${1 + Math.abs(bagTiltY)*0.02})`,
        }}/>
      </div>

      {/* ---- CORNER PROJECT NAME ---- */}
      <div style={{
        position:"absolute", bottom:14, right:16,
        display:"flex", alignItems:"center", gap:6,
        opacity:0.55,
      }}>
        <span style={{
          fontSize:10, fontWeight:700,
          color:"rgba(245,245,240,0.6)",
          letterSpacing:"0.15em", textTransform:"uppercase",
          fontFamily:"'DM Sans',-apple-system,sans-serif",
        }}>RestaurantOS</span>
        <div style={{ width:1, height:10, background:"rgba(255,107,53,0.4)" }}/>
        <span style={{ fontSize:10, color:"#FF6B35", fontWeight:600 }}>PRO</span>
      </div>

      {/* ---- Keyframes ---- */}
      <style>{`
        @keyframes heroParticle {
          0%,100% { transform:translateY(0) scale(1); opacity:0.7; }
          50%      { transform:translateY(-10px) scale(1.4); opacity:1; }
        }
        @keyframes heroDivider {
          0%   { width:40px; opacity:0.6; }
          100% { width:80px; opacity:1; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   STATUS BADGE
   ============================================================ */
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const conf: Record<string, { bg: string; color: string; icon: string }> = {
    pending:   { bg: "rgba(251,191,36,0.15)",  color: "#fbbf24", icon: "?" },
    confirmed: { bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", icon: "?" },
    refused:   { bg: "rgba(239,68,68,0.15)",   color: "#f87171", icon: "?" },
    ready:     { bg: "rgba(34,197,94,0.15)",   color: "#4ade80", icon: "✅" },
    delivered: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", icon: "✅" },
  };
  const c = conf[status] ?? conf.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 14px", borderRadius: 100,
      background: c.bg, color: c.color,
      border: `0.5px solid ${c.color}33`,
      fontSize: 12, fontWeight: 600,
    }}>
      {c.icon} {t(status)}
    </span>
  );
}

/* ============================================================
   DISH CARD 3D
   ============================================================ */
function DishCard({ dish, onAdd, index, formatPrice }: { dish: Dish; onAdd: (dish: Dish) => void; index: number; formatPrice: (p: number|string) => string }) {
  const { t } = useTranslation();
  const lang = i18n.language;
  const name = getLangName(dish as unknown as Record<string, unknown>, lang);
  const desc = getLangDesc(dish as unknown as Record<string, unknown>, lang);
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [added, setAdded] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientY - rect.top) / rect.height - 0.5) * -14;
    const y = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    setTilt({ x, y });
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!dish.isAvailable || added) return;
    setAdded(true);
    onAdd(dish);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      style={{
        background: "var(--bg-card)",
        border: hovered ? "0.5px solid rgba(255,107,53,0.3)" : "0.5px solid var(--border-subtle)",
        borderRadius: 24,
        overflow: "hidden",
        cursor: dish.isAvailable ? "pointer" : "default",
        opacity: dish.isAvailable ? 1 : 0.5,
        transform: hovered
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-8px) scale(1.02)`
          : "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)",
        transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1), border-color 0.25s ease, box-shadow 0.25s ease",
        boxShadow: hovered
          ? "0 20px 60px rgba(0,0,0,0.7), 0 4px 20px rgba(255,107,53,0.15)"
          : "0 4px 20px rgba(0,0,0,0.4)",
        animation: `cardEnter 0.5s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.07}s both`,
        position: "relative",
      }}
    >
      {/* Image */}
      <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
        {dish.imageUrl ? (
          <img
            src={dish.imageUrl}
            alt={name}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              transform: hovered ? "scale(1.08)" : "scale(1)",
              transition: "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(135deg, #1a1a28 0%, #22223a 50%, #1a1a28 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 64,
          }}>
            {getFoodEmoji(name)}
          </div>
        )}
        {/* Overlay gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(10,10,15,0.8) 0%, transparent 60%)",
        }} />
        {/* Badges */}
        <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {dish.isNew && (
            <span style={{
              padding: "4px 10px", borderRadius: 100,
              background: "rgba(34,197,94,0.9)", color: "white",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", backdropFilter: "blur(8px)",
            }}>NEW</span>
          )}
          {dish.isPopular && (
            <span style={{
              padding: "4px 10px", borderRadius: 100,
              background: "rgba(255,107,53,0.9)", color: "white",
              fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
              textTransform: "uppercase", backdropFilter: "blur(8px)",
            }}>⭐ POP</span>
          )}
        </div>
        {/* Price on image */}
        <div style={{
          position: "absolute", bottom: 12, right: 12,
          background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)",
          border: "0.5px solid rgba(255,107,53,0.4)",
          borderRadius: 12, padding: "6px 14px",
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "rgba(255,107,53,0.7)", fontWeight: 600 }}>Normale</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#FF6B35" }}>{formatPrice(dish.price)}</span>
          </div>
          {(dish as any).priceLarge != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(255,159,28,0.7)", fontWeight: 600 }}>Grande</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#FF9F1C" }}>{formatPrice((dish as any).priceLarge)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 20px 20px" }}>
        <h3 style={{
          fontFamily: "var(--font-display)",
          fontSize: 18, fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 6, lineHeight: 1.3,
        }}>{name}</h3>

        {desc && (
          <p style={{
            fontSize: 13, color: "var(--text-secondary)",
            lineHeight: 1.6, marginBottom: 12,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>{desc}</p>
        )}

        {/* Allergens */}
        {dish.allergens && dish.allergens.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
            {dish.allergens.map((a) => (
              <span key={a} style={{
                padding: "3px 8px", borderRadius: 6,
                background: "rgba(168,85,247,0.1)",
                border: "0.5px solid rgba(168,85,247,0.25)",
                color: "#c084fc", fontSize: 11, fontWeight: 500,
              }}>{a}</span>
            ))}
          </div>
        )}

        {/* Add button */}
        {dish.isAvailable ? (
          <button
            onClick={handleAdd}
            style={{
              width: "100%", height: 44,
              borderRadius: 14, border: "none",
              background: added
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : "linear-gradient(135deg,#FF6B35,#FF9F1C)",
              color: "white",
              fontFamily: "var(--font-body)",
              fontSize: 14, fontWeight: 600,
              cursor: "pointer",
              display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8,
              transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              transform: added ? "scale(0.98)" : "scale(1)",
              boxShadow: added
                ? "0 4px 20px rgba(34,197,94,0.4)"
                : "0 4px 16px rgba(255,107,53,0.35)",
            }}
          >
            {added ? "? Ajout� !" : `+ ${t("addToCart")}`}
          </button>
        ) : (
          <div style={{
            width: "100%", height: 44, borderRadius: 14,
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: 13,
          }}>
            {t("unavailable")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CUSTOMIZE MODAL (bottom sheet)
   ============================================================ */
function CustomizeModal({
  dish, lang, onConfirm, onClose, formatPrice,
}: {
  dish: Dish; lang: string;
  onConfirm: (note: string, size: "normale" | "grande", price: number) => void;
  onClose: () => void;
  formatPrice: (p: number|string) => string;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const hasLarge = (dish as any).priceLarge != null;
  const [selectedSize, setSelectedSize] = useState<"normale" | "grande">("normale");
  const currentPrice = selectedSize === "grande" && hasLarge ? (dish as any).priceLarge : dish.price;
  const name = getLangName(dish as unknown as Record<string, unknown>, lang);
  const desc = getLangDesc(dish as unknown as Record<string, unknown>, lang);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      animation: "fadeIn 0.2s ease",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 600, maxHeight: "90vh",
          background: "var(--bg-card)",
          borderRadius: "32px 32px 0 0",
          border: "0.5px solid var(--border-subtle)",
          borderBottom: "none",
          overflowY: "auto",
          animation: "slideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Image */}
        {dish.imageUrl ? (
          <img src={dish.imageUrl} alt={name}
            style={{ width: "100%", height: 240, objectFit: "cover" }} />
        ) : (
          <div style={{
            width: "100%", height: 240,
            background: "linear-gradient(135deg,#1a1a28,#22223a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 80,
          }}>{getFoodEmoji(name)}</div>
        )}

        <div style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <h2 style={{
                fontFamily: "var(--font-display)",
                fontSize: 26, fontWeight: 700,
                color: "var(--text-primary)", lineHeight: 1.2,
              }}>{name}</h2>
              {desc && (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.6 }}>{desc}</p>
              )}
            </div>
            <button onClick={onClose} style={{
              flexShrink: 0, width: 36, height: 36, borderRadius: 10,
              border: "0.5px solid var(--border-subtle)",
              background: "var(--bg-glass)", color: "var(--text-secondary)",
              cursor: "pointer", fontSize: 18, display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>?</button>
          </div>

          {/* Allergens */}
          {dish.allergens && dish.allergens.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
              {dish.allergens.map((a) => (
                <span key={a} style={{
                  padding: "3px 8px", borderRadius: 6,
                  background: "rgba(168,85,247,0.1)",
                  border: "0.5px solid rgba(168,85,247,0.25)",
                  color: "#c084fc", fontSize: 11, fontWeight: 500,
                }}>{a}</span>
              ))}
            </div>
          )}

          {/* Choix taille si priceLarge existe */}
          {hasLarge && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {(["normale", "grande"] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 14, border: "none",
                    background: selectedSize === size
                      ? "linear-gradient(135deg,#FF6B35,#FF9F1C)"
                      : "var(--bg-surface)",
                    color: selectedSize === size ? "white" : "var(--text-secondary)",
                    fontWeight: 700, fontSize: 14, cursor: "pointer",
                    border: selectedSize === size ? "none" : "0.5px solid var(--border-subtle)",
                    transition: "all 0.2s",
                  }}
                >
                  {size === "normale" ? `🍽️ Normale � ${formatPrice(dish.price)}` : `🍖 Grande � ${formatPrice((dish as any).priceLarge)}`}
                </button>
              ))}
            </div>
          )}

          {/* Note input */}
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
            ✏️ {t("specialRequest")}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex: sans sel, bien cuit, sauce � part..."
            rows={3}
            style={{
              width: "100%", background: "var(--bg-surface)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: 16, padding: "12px 16px",
              color: "var(--text-primary)", fontFamily: "var(--font-body)",
              fontSize: 14, resize: "none", outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
          />

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, gap: 16 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: "#FF6B35" }}>
              {formatPrice(currentPrice)}
            </span>
            <button
              onClick={() => onConfirm(note, selectedSize, Number(currentPrice))}
              style={{
                flex: 1, height: 52, borderRadius: 16, border: "none",
                background: "linear-gradient(135deg,#FF6B35,#FF9F1C)",
                color: "white", fontFamily: "var(--font-body)",
                fontSize: 15, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 8px 28px rgba(255,107,53,0.4)",
                transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              🛒 {t("addToCart")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CART VIEW
   ============================================================ */
function CartView({
  cart, setCart, orderNote, setOrderNote,
  cartTotal, onPlaceOrder, isPending, lang, formatPrice,
}: {
  cart: CartItem[]; setCart: (c: CartItem[]) => void;
  orderNote: string; setOrderNote: (n: string) => void;
  cartTotal: number; onPlaceOrder: () => void;
  isPending: boolean; lang: string; formatPrice: (p: number|string) => string;
}) {
  const { t } = useTranslation();

  const updateQty = (i: number, delta: number) => {
    const next = cart.map((c, j) => j === i ? { ...c, quantity: c.quantity + delta } : c).filter((c) => c.quantity > 0);
    setCart(next);
  };

  if (cart.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🍽️</div>
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 600,
          color: "var(--text-secondary)", marginBottom: 8,
        }}>Panier vide</h3>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Ajoutez des plats depuis le menu</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px 120px" }}>
      {/* Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        {cart.map((item, i) => {
          const name = getLangName(item.dish as unknown as Record<string, unknown>, lang);
          return (
            <div key={i} style={{
              background: "var(--bg-card)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: 20, padding: 16,
              display: "flex", alignItems: "center", gap: 14,
              animation: "slideIn 0.3s ease",
            }}>
              {/* Img or emoji */}
              <div style={{
                width: 64, height: 64, borderRadius: 14, flexShrink: 0,
                overflow: "hidden", background: "var(--bg-surface)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
              }}>
                {item.dish.imageUrl
                  ? <img src={item.dish.imageUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : getFoodEmoji(name)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginBottom: 2 }}>{name}</p>
                {item.customNote && (
                  <p style={{ fontSize: 12, color: "#FF6B35", fontStyle: "italic", marginBottom: 4 }}>{item.customNote}</p>
                )}
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {item.selectedSize === "grande" ? "🍖 Grande" : "🍽️ Normale"} · {formatPrice(item.unitPrice * item.quantity)}
                </p>
              </div>
              {/* Qty */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "var(--bg-surface)",
                border: "0.5px solid var(--border-subtle)",
                borderRadius: 14, padding: 4,
              }}>
                {[{d: -1, icon: "?"}, {d: 1, icon: "+"}].map(({d, icon}, bi) => (
                  bi === 0 ? (
                    <button key={d} onClick={() => updateQty(i, d)} style={{
                      width: 32, height: 32, borderRadius: 10, border: "none",
                      background: d === 1 ? "linear-gradient(135deg,#FF6B35,#FF9F1C)" : "var(--bg-glass)",
                      color: "var(--text-primary)", fontSize: 18, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                    }}>{icon}</button>
                  ) : null
                ))}
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: "center", color: "var(--text-primary)" }}>
                  {item.quantity}
                </span>
                <button onClick={() => updateQty(i, 1)} style={{
                  width: 32, height: 32, borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#FF6B35,#FF9F1C)",
                  color: "white", fontSize: 18, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                }}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
          📝 {t("note")}
        </label>
        <textarea
          value={orderNote} onChange={(e) => setOrderNote(e.target.value)}
          placeholder={t("specialRequest")} rows={2}
          style={{
            width: "100%", background: "var(--bg-card)",
            border: "0.5px solid var(--border-subtle)",
            borderRadius: 16, padding: "12px 16px",
            color: "var(--text-primary)", fontFamily: "var(--font-body)",
            fontSize: 14, resize: "none", outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#FF6B35")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
        />
      </div>

      {/* Total */}
      <div style={{
        background: "var(--bg-card)", border: "0.5px solid var(--border-subtle)",
        borderRadius: 20, padding: "16px 20px", marginBottom: 16,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 16, color: "var(--text-secondary)" }}>{t("orderTotal")}</span>
        <span style={{ fontSize: 28, fontWeight: 700, color: "#FF6B35" }}>{formatPrice(cartTotal)}</span>
      </div>

      {/* Confirm */}
      <button
        onClick={onPlaceOrder} disabled={isPending}
        style={{
          width: "100%", height: 56, borderRadius: 18, border: "none",
          background: isPending ? "rgba(255,107,53,0.5)" : "linear-gradient(135deg,#FF6B35,#FF9F1C)",
          color: "white", fontFamily: "var(--font-body)",
          fontSize: 16, fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          boxShadow: "0 8px 32px rgba(255,107,53,0.4)",
          transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s",
        }}
        onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.transform = "translateY(-3px)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      >
        {isPending ? "⏳ " + t("loading") : "🍽️ " + t("placeOrder")}
      </button>
    </div>
  );
}

/* ============================================================
   ORDER TRACKER
   ============================================================ */
function OrderTracker({ order, formatPrice }: { order: OrderWithItems; formatPrice: (p: number|string) => string }) {
  const { t } = useTranslation();
  const lang = i18n.language;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const ratingMutation = useCreateRating();

  const steps = ["pending", "confirmed", "ready", "delivered"];
  const currentStep = steps.indexOf(order.status);
  const statusConf: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    pending:   { icon: "?", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", label: "En attente" },
    confirmed: { icon: "?", color: "#60a5fa", bg: "rgba(59,130,246,0.12)", label: "Confirm�e" },
    refused:   { icon: "?", color: "#f87171", bg: "rgba(239,68,68,0.12)",  label: "Refus�e" },
    ready:     { icon: "✅", color: "#4ade80", bg: "rgba(34,197,94,0.12)",  label: "Pr�te !" },
    delivered: { icon: "✅", color: "#94a3b8", bg: "rgba(148,163,184,0.12)", label: "Livr�e" },
  };
  const sc = statusConf[order.status] ?? statusConf.pending;

  return (
    <div style={{ padding: "20px 24px 100px" }}>
      {/* Status hero */}
      <div style={{
        background: sc.bg, border: `0.5px solid ${sc.color}33`,
        borderRadius: 24, padding: 32, textAlign: "center",
        marginBottom: 20, animation: "fadeSlideIn 0.5s ease",
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: sc.bg, border: `1px solid ${sc.color}55`,
          margin: "0 auto 16px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36,
          animation: order.status === "pending" ? "pulse 2s infinite" : "none",
        }}>{sc.icon}</div>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700,
          color: sc.color, marginBottom: 6,
        }}>{sc.label}</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Commande #{order.id}</p>
      </div>

      {/* Step tracker */}
      {order.status !== "refused" && (
        <div style={{
          background: "var(--bg-card)", border: "0.5px solid var(--border-subtle)",
          borderRadius: 20, padding: "20px 16px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between", overflowX: "auto",
        }}>
          {steps.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 0, flex: 1 }}>
              <div style={{ textAlign: "center", flex: "0 0 auto" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12, margin: "0 auto 6px",
                  background: i <= currentStep
                    ? "linear-gradient(135deg,#FF6B35,#FF9F1C)"
                    : "var(--bg-surface)",
                  border: i <= currentStep
                    ? "none"
                    : "0.5px solid var(--border-subtle)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, color: i <= currentStep ? "white" : "var(--text-muted)",
                  transition: "all 0.3s ease",
                  boxShadow: i <= currentStep ? "0 4px 12px rgba(255,107,53,0.4)" : "none",
                }}>
                  {i < currentStep ? "?" : i + 1}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: i <= currentStep ? "#FF6B35" : "var(--text-muted)",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}>{t(step)}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginBottom: 22,
                  background: i < currentStep
                    ? "linear-gradient(90deg,#FF6B35,#FF9F1C)"
                    : "var(--border-subtle)",
                  transition: "background 0.3s ease",
                }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Refusal reason */}
      {order.status === "refused" && order.refusalReason && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.25)",
          borderRadius: 16, padding: 16, marginBottom: 20,
          color: "#f87171", fontSize: 14,
        }}>
          ⚠️ {order.refusalReason}
        </div>
      )}

      {/* Items list */}
      <div style={{
        background: "var(--bg-card)", border: "0.5px solid var(--border-subtle)",
        borderRadius: 20, padding: 20, marginBottom: 20,
      }}>
        <h3 style={{
          fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600,
          color: "var(--text-primary)", marginBottom: 14,
        }}>📋 Détail commande</h3>
        {order.items.map((item) => {
          const nameKey = `name${lang.charAt(0).toUpperCase() + lang.slice(1)}` as keyof typeof item.dish;
          const dishName = item.dish
            ? ((item.dish as unknown as Record<string, string>)[nameKey as string] || item.dish.nameEn)
            : "�";
          return (
            <div key={item.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 0",
              borderBottom: "0.5px solid var(--border-subtle)",
              fontSize: 14,
            }}>
              <span style={{ color: "var(--text-primary)" }}>{item.quantity}� {dishName}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {formatPrice(Number(item.unitPrice) * item.quantity)}
              </span>
            </div>
          );
        })}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingTop: 12, marginTop: 4, fontWeight: 700,
        }}>
          <span style={{ color: "var(--text-primary)" }}>{t("total")}</span>
          <span style={{ color: "#FF6B35", fontSize: 20 }}>{formatPrice(order.totalPrice)}</span>
        </div>
      </div>

      {/* Rating */}
      {order.status === "delivered" && !order.rating && (
        <div style={{
          background: "var(--bg-card)", border: "0.5px solid var(--border-subtle)",
          borderRadius: 20, padding: 20,
        }}>
          <h3 style={{
            fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600,
            color: "var(--text-primary)", marginBottom: 14,
          }}>? {t("rateYourOrder")}</h3>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, justifyContent: "center" }}>
            {[1,2,3,4,5].map((star) => (
              <button key={star} onClick={() => setRating(star)} style={{
                fontSize: 32, background: "none", border: "none", cursor: "pointer",
                transform: rating >= star ? "scale(1.2)" : "scale(1)",
                transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                filter: rating >= star ? "drop-shadow(0 0 6px rgba(251,191,36,0.8))" : "none",
              }}>
                {rating >= star ? "?" : "?"}
              </button>
            ))}
          </div>
          <textarea
            value={comment} onChange={(e) => setComment(e.target.value)}
            placeholder={t("comment")} rows={2}
            style={{
              width: "100%", background: "var(--bg-surface)",
              border: "0.5px solid var(--border-subtle)",
              borderRadius: 14, padding: "10px 14px",
              color: "var(--text-primary)", fontFamily: "var(--font-body)",
              fontSize: 13, resize: "none", outline: "none", marginBottom: 12,
            }}
          />
          <button
            onClick={() => ratingMutation.mutate(
              { data: { orderId: order.id, stars: rating, comment } },
              {
                onSuccess: () => toast.success(t("success")),
                onError: () => toast.error(t("error")),
              }
            )}
            disabled={rating === 0 || ratingMutation.isPending || !!ratingMutation.isSuccess}
            style={{
              width: "100%", height: 48, borderRadius: 14, border: "none",
              background: ratingMutation.isSuccess
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : "linear-gradient(135deg,#FF6B35,#FF9F1C)",
              color: "white", fontFamily: "var(--font-body)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              opacity: rating === 0 ? 0.5 : 1,
            }}
          >
            {ratingMutation.isSuccess ? "? Envoy� !" : t("submitRating")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
export default function MenuPage() {
  const { formatPrice: fp } = useCurrency();
  const { t } = useTranslation();
  const params = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";
  const BG = isDark ? "#0A0A0A" : "#F5F5F0";
  const CARD = isDark ? "#141414" : "#FFFFFF";
  const CARD2 = isDark ? "#1C1C1C" : "#F0EFEB";
  const BORDER = isDark ? "#2A2A2A" : "#E0DED8";
  const TEXT = isDark ? "#FFFFFF" : "#111111";
  const MUTED = isDark ? "#888888" : "#666666";
  const lang = i18n.language;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNote, setOrderNote] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [view, setView] = useState<"menu" | "cart" | "tracking">("menu");
  const [customizeItem, setCustomizeItem] = useState<Dish | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: table, isLoading: tableLoading, isError: tableError } = useGetTableByToken(params.token);
  const { data: categories } = useListCategories({ includeInactive: false });
  const { data: dishes } = useListDishes(activeCategory ? { categoryId: activeCategory } : {});
  const { data: activeOrder } = useGetActiveOrderByTable(
    table?.id ?? 0,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!table?.id && view === "tracking" } as any }
  );
  const createOrder = useCreateOrder();

  useEffect(() => {
    if (categories && categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    if (!table?.id) return;
    const socket = getSocket();
    const activeOrderId = orderId ?? activeOrder?.id;
    const handleUpdatedOrder = (updatedOrder: OrderWithItems) => {
      if (updatedOrder.id === activeOrderId) {
        queryClient.setQueryData(getGetActiveOrderByTableQueryKey(table.id), updatedOrder);
        setView("tracking");
        toast.success(t("orderStatusUpdated"));
      }
    };
    socket.on("order:updated", handleUpdatedOrder);
    socket.on("menu:updated", () => { queryClient.invalidateQueries({ queryKey: ["listDishes"] }); queryClient.invalidateQueries({ queryKey: ["listCategories"] }); });
    if (activeOrderId) socket.emit("subscribeOrder", { orderId: activeOrderId, tableToken: params.token });
    return () => { socket.off("order:updated", handleUpdatedOrder); };
  }, [activeOrder?.id, orderId, queryClient, table?.id, params.token, t]);

  // formatPrice imported directly from @/lib/currency
  const cartTotal = cart.reduce((s, i) => s + (i.unitPrice || Number(i.dish.price)) * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleAddDish = (dish: Dish) => setCustomizeItem(dish);

  const handleConfirmAdd = (note: string, size: "normale" | "grande" = "normale", unitPrice: number = 0) => {
    if (!customizeItem) return;
    const price = unitPrice || Number(customizeItem.price);
    const existing = cart.find((c) => c.dish.id === customizeItem.id && c.customNote === (note || undefined) && c.selectedSize === size);
    if (existing) {
      setCart(cart.map((c) => c === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { dish: customizeItem, quantity: 1, customNote: note || undefined, selectedSize: size, unitPrice: price }]);
    }
    setCustomizeItem(null);
    toast.success("🛒 " + t("addToCart"));
  };

  const placeOrder = () => {
    if (!table || cart.length === 0) return;
    createOrder.mutate(
      {
        data: {
          tableId: table.id,
          note: orderNote || undefined,
          items: cart.map((c) => ({ dishId: c.dish.id, quantity: c.quantity, selectedSize: c.selectedSize, customNote: [c.selectedSize === "grande" ? "[Grande]" : "[Normale]", c.customNote].filter(Boolean).join(" � ") || undefined })),
        },
      },
      {
        onSuccess: (data) => {
          setOrderId(data.id);
          setCart([]);
          setView("tracking");
          toast.success("🎉 " + t("orderPlaced"));
        },
        onError: () => toast.error(t("error")),
      }
    );
  };

  /* ---- Loading ---- */
  if (tableLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg-deep)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-body)",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "linear-gradient(135deg,#FF6B35,#FF9F1C)",
            margin: "0 auto 16px",
            animation: "pulse 1.5s infinite",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>🍽️</div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("loading")}</p>
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (tableError || !table) {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg-deep)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24, fontFamily: "var(--font-body)",
      }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 80, marginBottom: 20 }}>🍽️</div>
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700,
            color: "var(--text-primary)", marginBottom: 10,
          }}>Table introuvable</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>
            Ce QR code est invalide ou la table a �t� d�sactiv�e.
          </p>
        </div>
      </div>
    );
  }

  /* ---- MAIN RENDER ---- */
  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{
        minHeight: "100vh",
        background: "var(--bg-deep)",
        fontFamily: "var(--font-body)",
        position: "relative",
      }}
    >
      {/* Animated background orbs */}
      <div className="bg-orbs">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* Keyframes injected */}
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,107,53,0.3); }
          50%      { box-shadow: 0 0 0 16px rgba(255,107,53,0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(30px,-40px) scale(1.05); }
          66%      { transform: translate(-20px,20px) scale(0.95); }
        }
        .bg-orbs { position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
        .bg-orb  { position:absolute; border-radius:50%; filter:blur(80px); opacity:0.12; animation:orbFloat 12s ease-in-out infinite; }
        .bg-orb-1 { width:600px;height:600px;background:radial-gradient(circle,#FF6B35,transparent 70%);top:-200px;left:-200px;animation-delay:0s; }
        .bg-orb-2 { width:500px;height:500px;background:radial-gradient(circle,#FF9F1C,transparent 70%);bottom:-150px;right:-150px;animation-delay:-4s; }
        .bg-orb-3 { width:300px;height:300px;background:radial-gradient(circle,#a855f7,transparent 70%);top:40%;left:60%;animation-delay:-8s;opacity:0.06; }
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#FF6B35;border-radius:2px}
      `}</style>

      {/* ---- HEADER ---- */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,10,15,0.88)",
        backdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        padding: "0 20px", height: 68,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14,
            background: "linear-gradient(135deg,#FF6B35,#FF9F1C)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "white", fontWeight: 700,
            boxShadow: "0 0 20px rgba(255,107,53,0.4)",
          }}>R</div>
          <div>
            <p style={{
              fontFamily: "'Playfair Display',Georgia,serif",
              fontSize: 16, fontWeight: 700,
              color: "var(--text-primary, #F5F5F0)",
              lineHeight: 1.2,
            }}>RestaurantOS</p>
            <p style={{ fontSize: 11, color: "#FF6B35", fontWeight: 600, letterSpacing: "0.08em" }}>
              TABLE {table.number}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {["fr", "en", "ar"].map((l) => (
            <button key={l} onClick={() => { i18n.changeLanguage(l); localStorage.setItem("lang", l); }} style={{
              padding: "5px 11px", borderRadius: 8,
              border: lang === l ? "none" : "0.5px solid rgba(255,255,255,0.1)",
              background: lang === l ? "linear-gradient(135deg,#FF6B35,#FF9F1C)" : "transparent",
              color: lang === l ? "white" : "rgba(245,245,240,0.5)",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              letterSpacing: "0.05em", transition: "all 0.2s",
            }}>{l.toUpperCase()}</button>
          ))}
          <button
            onClick={() => setTheme(theme === "dark" ? "☀️" : "🌙")}
            style={{
              width: 34, height: 34, borderRadius: 10,
              border: "0.5px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(245,245,240,0.5)", cursor: "pointer",
              fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      {/* ---- NAV TABS ---- */}
      <nav style={{
        position: "sticky", top: 68, zIndex: 90,
        background: "rgba(10,10,15,0.8)", backdropFilter: "blur(20px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        padding: "0 20px",
      }}>
        <div style={{ display: "flex", gap: 4, padding: "10px 0", overflowX: "auto" }}>
          {[
            { key: "menu",     icon: "🍽️", label: t("menu"),      count: 0 },
            { key: "cart",     icon: "🛒", label: t("yourCart"),  count: cartCount },
            { key: "tracking", icon: "📍", label: t("trackOrder"), count: 0 },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setView(tab.key as typeof view)} style={{
              padding: "9px 18px", borderRadius: 12, border: "none",
              background: view === tab.key ? "var(--bg-card, #1A1A26)" : "transparent",
              borderColor: view === tab.key ? "rgba(255,107,53,0.4)" : "transparent",
              borderStyle: "solid", borderWidth: "0.5px",
              color: view === tab.key ? "#FF6B35" : "rgba(245,245,240,0.4)",
              fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
              display: "flex", alignItems: "center", gap: 7,
              transition: "all 0.25s ease",
            }}>
              <span>{tab.icon}</span>
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 10,
                  background: "linear-gradient(135deg,#FF6B35,#FF9F1C)",
                  color: "white", fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "0 5px",
                }}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ---- CONTENT ---- */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto" }}>

        {/* MENU VIEW */}
        {view === "menu" && (
          <>
            {/* ============ HERO BANNER 3D ULTRA PRO ============ */}
            <HeroBanner tableNumber={table.number} />


            {/* Category pills */}
            <div style={{ display: "flex", gap: 10, overflowX: "auto", padding: "8px 24px 16px", scrollbarWidth: "none" }}>
              {categories?.map((cat) => {
                const catName = getLangName(cat as unknown as Record<string, unknown>, lang);
                const isActive = activeCategory === cat.id;
                return (
                  <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{
                    flexShrink: 0, padding: "9px 20px", borderRadius: 100,
                    border: isActive ? "none" : "0.5px solid rgba(255,255,255,0.08)",
                    background: isActive
                      ? "linear-gradient(135deg,#FF6B35,#FF9F1C)"
                      : "rgba(26,26,38,1)",
                    color: isActive ? "white" : "rgba(245,245,240,0.5)",
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                    transform: isActive ? "translateY(-2px) scale(1.04)" : "none",
                    boxShadow: isActive ? "0 4px 20px rgba(255,107,53,0.4)" : "none",
                    transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)",
                    fontFamily: "var(--font-body)",
                  }}>{catName}</button>
                );
              })}
            </div>

            {/* Dishes grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              gap: 20, padding: "0 24px 120px",
            }}>
              {dishes?.map((dish, i) => (
                <DishCard key={dish.id} dish={dish} onAdd={handleAddDish} index={i} formatPrice={fp} />
              ))}
              {dishes?.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 0" }}>
                  <div style={{ fontSize: 56, marginBottom: 12 }}>🍽️</div>
                  <p style={{ color: "rgba(245,245,240,0.4)", fontSize: 15 }}>{t("noData")}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* CART VIEW */}
        {view === "cart" && (
          <CartView
            cart={cart} setCart={setCart}
            orderNote={orderNote} setOrderNote={setOrderNote}
            cartTotal={cartTotal} onPlaceOrder={placeOrder}
            isPending={createOrder.isPending} lang={lang} formatPrice={fp}
          />
        )}

        {/* TRACKING VIEW */}
        {view === "tracking" && (
          activeOrder
            ? <OrderTracker order={activeOrder as unknown as OrderWithItems} formatPrice={fp} />
            : (
              <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <div style={{ fontSize: 72, marginBottom: 16 }}>🍽️</div>
                <h3 style={{
                  fontFamily: "'Playfair Display',Georgia,serif",
                  fontSize: 22, fontWeight: 600,
                  color: "rgba(245,245,240,0.4)", marginBottom: 8,
                }}>Aucune commande active</h3>
                <p style={{ fontSize: 14, color: "rgba(245,245,240,0.25)" }}>
                  Passez une commande depuis le menu
                </p>
              </div>
            )
        )}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && view !== "cart" && (
        <button
          onClick={() => setView("cart")}
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 200,
            width: 64, height: 64, borderRadius: 20, border: "none",
            background: "linear-gradient(135deg,#FF6B35,#FF9F1C)",
            boxShadow: "0 8px 32px rgba(255,107,53,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 26,
            transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            animation: "pulse 2.5s infinite",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px) scale(1.08)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
        >
          🛒
          <span style={{
            position: "absolute", top: -8, right: -8,
            minWidth: 22, height: 22, borderRadius: 11,
            background: "white", color: "#FF6B35",
            fontSize: 11, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 5px",
          }}>{cartCount}</span>
        </button>
      )}

      {/* Customize modal */}
      {customizeItem && (
        <CustomizeModal
          dish={customizeItem}
          lang={lang}
          onConfirm={handleConfirmAdd}
          onClose={() => setCustomizeItem(null)} formatPrice={fp}
        />
      )}
    </div>
  );
}

