import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Download, Plus, X, ChevronDown, Upload, ImageIcon, Trash2, Sparkles, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

import mockupDatacamp from "@/assets/mockup-datacamp.png";
import mockupCanva from "@/assets/mockup-canva.png";
import mockupGrammarly from "@/assets/mockup-grammarly.png";
import mockupCoursera from "@/assets/mockup-coursera.png";
import mockupDefault from "@/assets/mockup-default.png";

// ── Types ──────────────────────────────────────────────────────────────
interface PostData {
  productName: string;
  tagline: string;
  price: string;
  originalPrice: string;
  features: string[];
  badge: string;
  ctaText: string;
  footerText: string;
}

// ── Product → Mockup mapping ──────────────────────────────────────────
const MOCKUP_MAP: Record<string, string> = {
  datacamp: mockupDatacamp,
  canva: mockupCanva,
  grammarly: mockupGrammarly,
  coursera: mockupCoursera,
};

function getMockupForProduct(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, src] of Object.entries(MOCKUP_MAP)) {
    if (lower.includes(key)) return src;
  }
  return mockupDefault;
}

// ── Constants ──────────────────────────────────────────────────────────
const TEMPLATES = [
  { id: "square", label: "1080×1080", width: 1080, height: 1080 },
  { id: "story", label: "1080×1920", width: 1080, height: 1920 },
  { id: "landscape", label: "1920×1080", width: 1920, height: 1080 },
  { id: "facebook", label: "1200×630", width: 1200, height: 630 },
];

const LAYOUTS = [
  { id: "split", label: "Split Card", icon: "◧" },
  { id: "centered", label: "Centered Hero", icon: "◉" },
  { id: "bold-stack", label: "Bold Stack", icon: "▦" },
  { id: "minimal", label: "Minimal Card", icon: "▢" },
  { id: "diagonal", label: "Diagonal Cut", icon: "◤" },
];

const COLOR_PRESETS = [
  { name: "Midnight", bg: "#0d0d0d", accent: "#ff5722", text: "#ffffff", card: "#ffffff" },
  { name: "Ocean", bg: "#0a1628", accent: "#3b82f6", text: "#ffffff", card: "#f0f4ff" },
  { name: "Emerald", bg: "#042f2e", accent: "#10b981", text: "#ffffff", card: "#ecfdf5" },
  { name: "Crimson", bg: "#1c0a0a", accent: "#ef4444", text: "#ffffff", card: "#fef2f2" },
  { name: "Sunset", bg: "#1a0f05", accent: "#f97316", text: "#ffffff", card: "#fff7ed" },
  { name: "Rose", bg: "#1a0a14", accent: "#ec4899", text: "#ffffff", card: "#fdf2f8" },
  { name: "Charcoal", bg: "#1a1a1a", accent: "#a855f7", text: "#ffffff", card: "#faf5ff" },
  { name: "Gold", bg: "#1a1505", accent: "#eab308", text: "#ffffff", card: "#fefce8" },
  { name: "Arctic", bg: "#f8fafc", accent: "#0ea5e9", text: "#0f172a", card: "#ffffff" },
  { name: "Warm", bg: "#fdf6e3", accent: "#d97706", text: "#1a1a1a", card: "#ffffff" },
];

const SAMPLE_TEMPLATES: { name: string; data: PostData; colorIndex: number }[] = [
  {
    name: "DataCamp Pro",
    data: {
      productName: "DataCamp\nSubscription",
      tagline: "Learn Python, SQL & Data Science from world-class instructors",
      price: "৳999/yr",
      originalPrice: "৳25,000/yr",
      features: ["Full catalog access", "400+ courses", "AI-powered practice", "Certificates included"],
      badge: "96% OFF",
      ctaText: "ORDER NOW",
      footerText: "Order now → digistack.shop",
    },
    colorIndex: 0,
  },
  {
    name: "Canva Pro",
    data: {
      productName: "Canva\nPro",
      tagline: "Design anything. Publish anywhere. No design skills needed.",
      price: "৳350/yr",
      originalPrice: "৳1,200/yr",
      features: ["100M+ templates", "Brand Kit", "Background remover", "1TB cloud storage"],
      badge: "BEST SELLER",
      ctaText: "GET STARTED",
      footerText: "Instant delivery • digistack.shop",
    },
    colorIndex: 5,
  },
  {
    name: "Grammarly",
    data: {
      productName: "Grammarly\nPremium",
      tagline: "Write confidently with AI-powered writing assistance",
      price: "৳499/yr",
      originalPrice: "৳12,000/yr",
      features: ["Advanced grammar", "Tone detection", "Plagiarism checker", "Full rewrites"],
      badge: "LIMITED",
      ctaText: "ORDER NOW",
      footerText: "Activate instantly → digistack.shop",
    },
    colorIndex: 2,
  },
  {
    name: "Coursera Plus",
    data: {
      productName: "Coursera\nPlus",
      tagline: "Unlimited access to 7,000+ courses from top universities",
      price: "৳1,499/yr",
      originalPrice: "৳42,000/yr",
      features: ["Google & IBM certs", "University courses", "Guided projects", "Unlimited certs"],
      badge: "96% OFF",
      ctaText: "START LEARNING",
      footerText: "Start learning today • digistack.shop",
    },
    colorIndex: 7,
  },
  {
    name: "Ebook Bundle",
    data: {
      productName: "Ultimate\nEbook Bundle",
      tagline: "10 bestselling ebooks on business, marketing & self-growth — one unbeatable price",
      price: "৳499",
      originalPrice: "৳2,500",
      features: ["10 premium ebooks", "PDF + EPUB formats", "Lifetime access", "Free future updates"],
      badge: "80% OFF",
      ctaText: "DOWNLOAD NOW",
      footerText: "Instant download • digistack.shop",
    },
    colorIndex: 6,
  },
  {
    name: "Freelancing Guide",
    data: {
      productName: "Freelancing\nMasterclass",
      tagline: "Step-by-step guide to earning $5K/month freelancing from Bangladesh",
      price: "৳299",
      originalPrice: "৳1,200",
      features: ["150+ page PDF guide", "Client templates", "Proposal scripts", "Private community"],
      badge: "NEW RELEASE",
      ctaText: "GET THE GUIDE",
      footerText: "Start earning today → digistack.shop",
    },
    colorIndex: 4,
  },
  {
    name: "Video Course",
    data: {
      productName: "Complete\nVideo Course",
      tagline: "Master web development from zero to hero with 40+ hours of HD video lessons",
      price: "৳799",
      originalPrice: "৳5,000",
      features: ["40+ hours of video", "Source code included", "Certificate of completion", "Lifetime updates"],
      badge: "BESTSELLER",
      ctaText: "ENROLL NOW",
      footerText: "Start learning • digistack.shop",
    },
    colorIndex: 1,
  },
  {
    name: "Design Templates",
    data: {
      productName: "Pro Design\nTemplate Pack",
      tagline: "500+ ready-to-use Canva & Figma templates for social media, branding & marketing",
      price: "৳399",
      originalPrice: "৳2,000",
      features: ["500+ templates", "Canva & Figma files", "Commercial license", "Monthly new drops"],
      badge: "HOT DEAL",
      ctaText: "GET THE PACK",
      footerText: "Instant access • digistack.shop",
    },
    colorIndex: 3,
  },
  {
    name: "Notion Toolkit",
    data: {
      productName: "Notion\nProductivity Kit",
      tagline: "All-in-one Notion workspace — project management, habit tracker, finance planner & more",
      price: "৳199",
      originalPrice: "৳800",
      features: ["20+ Notion templates", "Drag & drop setup", "Video walkthrough", "Free updates"],
      badge: "75% OFF",
      ctaText: "GET INSTANT ACCESS",
      footerText: "Duplicate & start → digistack.shop",
    },
    colorIndex: 8,
  },
  {
    name: "Photography Preset",
    data: {
      productName: "Pro Lightroom\nPresets",
      tagline: "50 cinematic Lightroom presets — transform your photos in one click",
      price: "৳249",
      originalPrice: "৳1,500",
      features: ["50 premium presets", "Mobile + Desktop", "Before/after guide", "RAW file support"],
      badge: "83% OFF",
      ctaText: "DOWNLOAD PRESETS",
      footerText: "Works on mobile too • digistack.shop",
    },
    colorIndex: 9,
  },
];

const emptyData: PostData = {
  productName: "",
  tagline: "",
  price: "",
  originalPrice: "",
  features: [""],
  badge: "BEST DEAL",
  ctaText: "ORDER NOW",
  footerText: "",
};

// ── Component ──────────────────────────────────────────────────────────
export default function AdminPostGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<PostData>(SAMPLE_TEMPLATES[0].data);
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [colors, setColors] = useState(COLOR_PRESETS[SAMPLE_TEMPLATES[0].colorIndex]);
  const [customColors, setCustomColors] = useState({ bg: "", accent: "", text: "", card: "" });
  const [useCustom, setUseCustom] = useState(false);
  const [mockupImage, setMockupImage] = useState<HTMLImageElement | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>("content");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [layout, setLayout] = useState(LAYOUTS[0]);

  const activeColors = useCustom
    ? {
        bg: customColors.bg || "#0d0d0d",
        accent: customColors.accent || "#ff5722",
        text: customColors.text || "#ffffff",
        card: customColors.card || "#ffffff",
      }
    : colors;

  // Load product-specific mockup image (custom upload takes priority)
  useEffect(() => {
    const src = customImageUrl || getMockupForProduct(data.productName);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setMockupImage(img);
    img.src = src;
  }, [data.productName, customImageUrl]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setCustomImageUrl(url);
    toast({ title: "Custom image applied!" });
  };

  const clearCustomImage = () => {
    if (customImageUrl) URL.revokeObjectURL(customImageUrl);
    setCustomImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addFeature = () => setData((d) => ({ ...d, features: [...d.features, ""] }));
  const removeFeature = (i: number) =>
    setData((d) => ({ ...d, features: d.features.filter((_, idx) => idx !== i) }));
  const updateFeature = (i: number, val: string) =>
    setData((d) => ({ ...d, features: d.features.map((f, idx) => (idx === i ? val : f)) }));

  const toggleSection = (id: string) =>
    setActiveSection((prev) => (prev === id ? null : id));

  // ── Canvas Drawing ─────────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = template.width;
    const H = template.height;
    canvas.width = W;
    canvas.height = H;

    const scale = Math.min(W, H) / 1080;

    // ── Helper functions ─────────────────────────────────────
    const drawBg = () => {
      ctx.fillStyle = activeColors.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.025;
      for (let i = 0; i < W * H * 0.0015; i++) {
        ctx.fillStyle = activeColors.text;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }
      ctx.globalAlpha = 1;
    };

    const drawAccentBar = () => {
      ctx.fillStyle = activeColors.accent;
      ctx.fillRect(0, H - 5 * scale, W, 5 * scale);
    };

    const drawBadge = (x: number, y: number) => {
      if (!data.badge) return y;
      ctx.fillStyle = activeColors.accent;
      const badgeFont = `800 ${Math.round(15 * scale)}px "Plus Jakarta Sans", sans-serif`;
      ctx.font = badgeFont;
      const badgeText = data.badge.toUpperCase();
      const bm = ctx.measureText(badgeText);
      const bpx = 16 * scale, bpy = 9 * scale;
      const bw = bm.width + bpx * 2, bh = 15 * scale + bpy * 2;
      ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(badgeText, x + bpx, y + bh / 2);
      return y + bh + 40 * scale;
    };

    const drawProductName = (x: number, y: number, maxW: number, size: number, align: CanvasTextAlign = "left") => {
      if (!data.productName) return y;
      ctx.font = `900 ${Math.round(size)}px "Plus Jakarta Sans", serif`;
      ctx.fillStyle = activeColors.text;
      ctx.textBaseline = "top";
      ctx.textAlign = align;
      const nameLines = data.productName.split("\n");
      nameLines.forEach((rawLine) => {
        const wrapped = wrapText(ctx, rawLine, maxW);
        wrapped.forEach((line) => {
          ctx.fillText(line, x, y);
          y += size * 1.1;
        });
      });
      return y + 20 * scale;
    };

    const drawDivider = (x: number, y: number, w: number, align: CanvasTextAlign = "left") => {
      ctx.fillStyle = activeColors.accent;
      const dx = align === "center" ? x - w / 2 : x;
      ctx.fillRect(dx, y, w, 3 * scale);
      return y + 32 * scale;
    };

    const drawTagline = (x: number, y: number, maxW: number, align: CanvasTextAlign = "left") => {
      if (!data.tagline) return y;
      const tagSize = 19 * scale;
      ctx.font = `400 ${Math.round(tagSize)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = activeColors.text + "88";
      ctx.textBaseline = "top";
      ctx.textAlign = align;
      const lines = wrapText(ctx, data.tagline, maxW);
      lines.forEach((line) => { ctx.fillText(line, x, y); y += tagSize * 1.55; });
      return y + 40 * scale;
    };

    const drawFeatures = (x: number, y: number, align: CanvasTextAlign = "left") => {
      const activeFeatures = data.features.filter((f) => f.trim());
      if (activeFeatures.length === 0) return y;
      const featSize = 17 * scale;
      activeFeatures.forEach((feat) => {
        ctx.fillStyle = activeColors.accent;
        const dotX = align === "center" ? x - ctx.measureText(feat).width / 2 - 15 * scale : x + 5 * scale;
        ctx.beginPath();
        ctx.arc(dotX, y + featSize * 0.55, 3.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `400 ${Math.round(featSize)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = activeColors.text + "aa";
        ctx.textBaseline = "top";
        ctx.textAlign = align === "center" ? "left" : "left";
        const tx = align === "center" ? dotX + 12 * scale : x + 20 * scale;
        ctx.fillText(feat, tx, y);
        y += featSize * 2;
      });
      return y;
    };

    const drawPrice = (x: number, y: number, align: CanvasTextAlign, fillColor: string) => {
      if (!data.price) return y;
      const priceSize = 56 * scale;
      ctx.font = `900 ${Math.round(priceSize)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = fillColor;
      ctx.textAlign = align;
      ctx.textBaseline = "middle";
      ctx.fillText(data.price, x, y);
      if (data.originalPrice) {
        const origSize = 22 * scale;
        ctx.font = `400 ${Math.round(origSize)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = fillColor + "44";
        const origY = y + priceSize * 0.6;
        const origW = ctx.measureText(data.originalPrice).width;
        ctx.fillText(data.originalPrice, x, origY);
        ctx.strokeStyle = fillColor + "55";
        ctx.lineWidth = 1.5 * scale;
        const origX = align === "center" ? x - origW / 2 - 4 : x - 4;
        ctx.beginPath();
        ctx.moveTo(origX, origY);
        ctx.lineTo(origX + origW + 8, origY);
        ctx.stroke();
        return origY + origSize + 30 * scale;
      }
      return y + priceSize * 0.8 + 30 * scale;
    };

    const drawCta = (cx: number, y: number) => {
      if (!data.ctaText) return y;
      const ctaFontSize = 22 * scale;
      ctx.font = `800 ${Math.round(ctaFontSize)}px "Plus Jakarta Sans", sans-serif`;
      const ctaTextW = ctx.measureText(data.ctaText.toUpperCase()).width;
      const ctaPadX = 50 * scale, ctaPadY = 20 * scale;
      const ctaW = ctaTextW + ctaPadX * 2, ctaH = ctaFontSize + ctaPadY * 2;
      const ctaX = cx - ctaW / 2;
      ctx.fillStyle = activeColors.accent;
      ctx.beginPath();
      ctx.roundRect(ctaX, y, ctaW, ctaH, 4 * scale);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(data.ctaText.toUpperCase(), cx, y + ctaH / 2);
      return y + ctaH + 20 * scale;
    };

    const drawFooter = (cx: number, y: number) => {
      if (!data.footerText) return;
      const footSize = 15 * scale;
      ctx.font = `500 ${Math.round(footSize)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = activeColors.text + "44";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(data.footerText, cx, y);
    };

    const drawMockupWindow = (fx: number, fy: number, fw: number, fh: number) => {
      if (!mockupImage) return;
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath(); ctx.roundRect(fx + 6 * scale, fy + 6 * scale, fw, fh, 6 * scale); ctx.fill();
      ctx.fillStyle = activeColors.text === "#ffffff" ? "#1a1a1a" : "#f0f0f0";
      ctx.beginPath(); ctx.roundRect(fx, fy, fw, fh, 6 * scale); ctx.fill();
      const titleBarH = 28 * scale;
      ctx.fillStyle = activeColors.accent + "22";
      ctx.fillRect(fx, fy, fw, titleBarH);
      const dotR = 4 * scale;
      [activeColors.accent, activeColors.text + "33", activeColors.text + "33"].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(fx + 16 * scale + i * 16 * scale, fy + titleBarH / 2, dotR, 0, Math.PI * 2);
        ctx.fill();
      });
      const innerPad = 8 * scale;
      const innerY = fy + titleBarH + innerPad;
      const innerW = fw - innerPad * 2, innerH = fh - titleBarH - innerPad * 2;
      const imgAspect = mockupImage.width / mockupImage.height;
      let drawW = innerW, drawH = drawW / imgAspect;
      if (drawH > innerH) { drawH = innerH; drawW = drawH * imgAspect; }
      const drawX = fx + innerPad + (innerW - drawW) / 2;
      const drawY = innerY + (innerH - drawH) / 2;
      ctx.drawImage(mockupImage, drawX, drawY, drawW, drawH);
    };

    const drawMockupPlain = (cx: number, cy: number, maxW: number, maxH: number) => {
      if (!mockupImage) return;
      const imgAspect = mockupImage.width / mockupImage.height;
      let iw = maxW, ih = iw / imgAspect;
      if (ih > maxH) { ih = maxH; iw = ih * imgAspect; }
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 30 * scale;
      ctx.shadowOffsetY = 10 * scale;
      ctx.drawImage(mockupImage, cx - iw / 2, cy - ih / 2, iw, ih);
      ctx.restore();
    };

    // ── Layout Renderers ─────────────────────────────────────
    if (layout.id === "split") {
      // Original split layout
      drawBg();
      const isLandscape = W > H;
      const splitX = isLandscape ? W * 0.42 : W * 0.4;
      const cardMargin = 40 * scale;
      const cardX = splitX, cardY = cardMargin;
      const cardW = W - splitX - cardMargin, cardH = H - cardMargin * 2;
      ctx.fillStyle = activeColors.card;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      if (mockupImage) {
        const imgPad = 30 * scale;
        const imgMaxW = cardW - imgPad * 2, imgMaxH = cardH * 0.38;
        const imgAspect = mockupImage.width / mockupImage.height;
        let imgW = imgMaxW, imgH = imgW / imgAspect;
        if (imgH > imgMaxH) { imgH = imgMaxH; imgW = imgH * imgAspect; }
        ctx.drawImage(mockupImage, cardX + (cardW - imgW) / 2, cardY + cardH * 0.08, imgW, imgH);
      }
      drawPrice(cardX + cardW / 2, cardY + cardH * 0.52, "center", activeColors.bg);
      drawCta(cardX + cardW / 2, cardY + cardH * 0.68);
      if (data.footerText) {
        const footSize = 15 * scale;
        ctx.font = `500 ${Math.round(footSize)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = activeColors.bg + "44"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(data.footerText, cardX + cardW / 2, cardY + cardH - 22 * scale);
      }
      if (mockupImage) {
        const frameW = (splitX - 80 * scale) * 0.85, frameH = frameW * 0.7;
        drawMockupWindow((splitX - frameW) / 2, H - frameH - 60 * scale, frameW, frameH);
      }
      const padX = 50 * scale;
      const maxTextW = splitX - padX * 2;
      let cy = H * 0.1;
      cy = drawBadge(padX, cy);
      cy = drawProductName(padX, cy, maxTextW, (isLandscape ? 56 : 64) * scale);
      cy = drawDivider(padX, cy, 60 * scale);
      cy = drawTagline(padX, cy, maxTextW);
      drawFeatures(padX, cy);
      drawAccentBar();

    } else if (layout.id === "centered") {
      // Centered hero layout
      drawBg();
      const cx = W / 2;
      let cy = H * 0.06;
      cy = drawBadge(cx - 50 * scale, cy);
      cy = drawProductName(cx, cy, W * 0.7, 60 * scale, "center");
      cy = drawDivider(cx, cy, 80 * scale, "center");
      cy = drawTagline(cx, cy, W * 0.6, "center");
      if (mockupImage) {
        const imgMaxW = W * 0.45, imgMaxH = H * 0.3;
        drawMockupPlain(cx, cy + imgMaxH / 2, imgMaxW, imgMaxH);
        cy += imgMaxH + 30 * scale;
      }
      cy = drawPrice(cx, cy + 10 * scale, "center", activeColors.text);
      cy = drawCta(cx, cy);
      drawFeatures(cx, cy, "center");
      drawFooter(cx, H - 40 * scale);
      drawAccentBar();

    } else if (layout.id === "bold-stack") {
      // Bold stacked full-width layout
      drawBg();
      // Large accent strip at top
      ctx.fillStyle = activeColors.accent;
      ctx.fillRect(0, 0, W, 8 * scale);
      const padX = 60 * scale;
      let cy = 50 * scale;
      cy = drawBadge(padX, cy);
      cy = drawProductName(padX, cy, W - padX * 2, 72 * scale);
      // Full-width divider
      ctx.fillStyle = activeColors.accent + "33";
      ctx.fillRect(padX, cy, W - padX * 2, 2 * scale);
      cy += 30 * scale;
      // Two-column: features left, image right
      const colW = (W - padX * 3) / 2;
      const leftX = padX;
      let leftY = cy;
      leftY = drawTagline(leftX, leftY, colW);
      drawFeatures(leftX, leftY);
      // Image on right
      if (mockupImage) {
        const imgX = padX * 2 + colW;
        drawMockupPlain(imgX + colW / 2, cy + colW * 0.35, colW * 0.9, colW * 0.7);
      }
      // Bottom bar with price + CTA
      const barH = 160 * scale;
      const barY = H - barH;
      ctx.fillStyle = activeColors.accent + "11";
      ctx.fillRect(0, barY, W, barH);
      ctx.fillStyle = activeColors.accent;
      ctx.fillRect(0, barY, W, 2 * scale);
      // Price on left of bar
      drawPrice(padX + 80 * scale, barY + barH / 2 - 10 * scale, "left", activeColors.text);
      // CTA on right of bar
      drawCta(W - padX - 120 * scale, barY + barH / 2 - 32 * scale);
      drawFooter(W / 2, barY + barH - 25 * scale);
      drawAccentBar();

    } else if (layout.id === "minimal") {
      // Minimal centered card on gradient
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, activeColors.bg);
      grad.addColorStop(1, activeColors.accent + "33");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      // Center card
      const cardW = W * 0.7, cardH = H * 0.8;
      const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2;
      ctx.fillStyle = activeColors.card;
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 40 * scale;
      ctx.shadowOffsetY = 10 * scale;
      ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 16 * scale); ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      const cx = cardX + cardW / 2;
      let cy = cardY + 40 * scale;
      // Badge
      if (data.badge) {
        ctx.fillStyle = activeColors.accent;
        ctx.font = `800 ${Math.round(13 * scale)}px "Plus Jakarta Sans", sans-serif`;
        const bt = data.badge.toUpperCase();
        const bm = ctx.measureText(bt);
        const bpx = 14 * scale, bpy = 7 * scale;
        ctx.beginPath(); ctx.roundRect(cx - bm.width / 2 - bpx, cy, bm.width + bpx * 2, 13 * scale + bpy * 2, 99); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(bt, cx, cy + (13 * scale + bpy * 2) / 2);
        cy += 13 * scale + bpy * 2 + 30 * scale;
      }
      // Image
      if (mockupImage) {
        const imgMaxW = cardW * 0.6, imgMaxH = cardH * 0.28;
        drawMockupPlain(cx, cy + imgMaxH / 2, imgMaxW, imgMaxH);
        cy += imgMaxH + 20 * scale;
      }
      // Product name
      cy = drawProductName(cx, cy, cardW * 0.8, 44 * scale, "center");
      // Tagline
      const tagSize = 16 * scale;
      if (data.tagline) {
        ctx.font = `400 ${Math.round(tagSize)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = activeColors.bg + "66"; ctx.textAlign = "center"; ctx.textBaseline = "top";
        const lines = wrapText(ctx, data.tagline, cardW * 0.75);
        lines.forEach((line) => { ctx.fillText(line, cx, cy); cy += tagSize * 1.5; });
        cy += 20 * scale;
      }
      // Price
      cy = drawPrice(cx, cy, "center", activeColors.bg);
      // CTA
      drawCta(cx, cy);
      // Footer
      if (data.footerText) {
        const fs = 13 * scale;
        ctx.font = `500 ${Math.round(fs)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = activeColors.bg + "33"; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        ctx.fillText(data.footerText, cx, cardY + cardH - 20 * scale);
      }

    } else if (layout.id === "diagonal") {
      // Diagonal cut layout
      drawBg();
      // Diagonal accent shape
      ctx.fillStyle = activeColors.accent + "15";
      ctx.beginPath();
      ctx.moveTo(W * 0.55, 0);
      ctx.lineTo(W, 0);
      ctx.lineTo(W, H);
      ctx.lineTo(W * 0.35, H);
      ctx.closePath();
      ctx.fill();
      // Accent line along diagonal
      ctx.strokeStyle = activeColors.accent + "44";
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(W * 0.55, 0);
      ctx.lineTo(W * 0.35, H);
      ctx.stroke();
      // Left content
      const padX = 60 * scale;
      const maxTextW = W * 0.4;
      let cy = H * 0.1;
      cy = drawBadge(padX, cy);
      cy = drawProductName(padX, cy, maxTextW, 58 * scale);
      cy = drawDivider(padX, cy, 60 * scale);
      cy = drawTagline(padX, cy, maxTextW);
      drawFeatures(padX, cy);
      // Right side: image + price + CTA
      const rightCx = W * 0.75;
      let ry = H * 0.08;
      if (mockupImage) {
        const imgMaxW = W * 0.35, imgMaxH = H * 0.35;
        drawMockupPlain(rightCx, ry + imgMaxH / 2, imgMaxW, imgMaxH);
        ry += imgMaxH + 20 * scale;
      }
      ry = drawPrice(rightCx, ry + 10 * scale, "center", activeColors.text);
      drawCta(rightCx, ry);
      drawFooter(rightCx, H - 50 * scale);
      drawAccentBar();
    }
  }, [data, template, activeColors, mockupImage, layout]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${data.productName?.replace(/\n/g, "-") || "post"}-${template.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast({ title: "Image downloaded!" });
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-display font-bold tracking-tight">POST GENERATOR</h2>
            <p className="text-xs text-muted-foreground tracking-wide mt-0.5">
              Create editorial-grade social media images
            </p>
          </div>
          <Button onClick={downloadImage} variant="default" className="gap-2 rounded-xl">
            <Download className="h-4 w-4" /> EXPORT PNG
          </Button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[340px,1fr]">
          {/* ── Controls Sidebar ────────────────────────────────── */}
          <div className="order-2 lg:order-1 space-y-3">
            {/* Quick Templates */}
            <BentoSection title="TEMPLATES" id="templates" active={activeSection} onToggle={toggleSection}>
              <div className="grid grid-cols-2 gap-1.5">
                {SAMPLE_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => {
                      setData(t.data);
                      setColors(COLOR_PRESETS[t.colorIndex]);
                      setUseCustom(false);
                    }}
                    className="text-left text-[11px] px-3 py-2.5 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <span className="font-bold text-foreground block group-hover:text-primary transition-colors">{t.name}</span>
                    <span className="text-muted-foreground">{t.data.price}</span>
                  </button>
                ))}
                <button
                  onClick={() => setData(emptyData)}
                  className="text-[11px] px-3 py-2.5 rounded-xl border border-dashed border-border/60 hover:border-primary/40 text-muted-foreground hover:text-foreground transition-all col-span-2"
                >
                  + Start blank
                </button>
              </div>
            </BentoSection>

            {/* Size */}
            <BentoSection title="SIZE" id="size" active={activeSection} onToggle={toggleSection}>
              <div className="grid grid-cols-2 gap-1.5">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t)}
                    className={`text-[11px] font-medium px-3 py-2 rounded-xl border transition-all ${
                      template.id === t.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-foreground/20"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </BentoSection>

            {/* Layout */}
            <BentoSection title="LAYOUT" id="layout" active={activeSection} onToggle={toggleSection}>
              <div className="grid grid-cols-2 gap-1.5">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLayout(l)}
                    className={`text-[11px] font-medium px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                      layout.id === l.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-foreground/20"
                    }`}
                  >
                    <span className="text-base leading-none">{l.icon}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            </BentoSection>

            {/* Color Palette */}
            <BentoSection title="COLOR PALETTE" id="colors" active={activeSection} onToggle={toggleSection}>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => { setColors(c); setUseCustom(false); }}
                    title={c.name}
                    className={`group relative aspect-square rounded-xl border-2 transition-all overflow-hidden ${
                      !useCustom && colors.name === c.name
                        ? "border-primary scale-105 shadow-sm"
                        : "border-transparent hover:border-foreground/20"
                    }`}
                  >
                    <div className="absolute inset-0" style={{ background: c.bg }} />
                    <div className="absolute bottom-0 left-0 right-0 h-[40%]" style={{ background: c.accent }} />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/10" />
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustom}
                  onChange={(e) => setUseCustom(e.target.checked)}
                  className="rounded-[2px] border-border"
                />
                Custom colors
              </label>
              {useCustom && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["bg", "accent", "text", "card"] as const).map((key) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={customColors[key] || activeColors[key]}
                        onChange={(e) => setCustomColors((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-7 h-7 rounded-xl cursor-pointer border border-border/60 p-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-[9px] uppercase text-muted-foreground font-medium tracking-wider block">{key}</span>
                        <input
                          type="text"
                          value={customColors[key] || activeColors[key]}
                          onChange={(e) => setCustomColors((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full h-6 rounded-xl border border-border/60 bg-background px-1.5 text-[10px] font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </BentoSection>

            {/* Product Image */}
            <BentoSection title="PRODUCT IMAGE" id="image" active={activeSection} onToggle={toggleSection}>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {customImageUrl ? (
                  <div className="relative rounded-xl border border-border/60 overflow-hidden bg-muted/20">
                    <img
                      src={customImageUrl}
                      alt="Custom product"
                      className="w-full h-28 object-contain p-2"
                    />
                    <button
                      onClick={clearCustomImage}
                      className="absolute top-1.5 right-1.5 p-1 rounded-xl bg-background/90 border border-border/60 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 rounded-xl border border-dashed border-border/60 hover:border-primary/40 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition-all group"
                  >
                    <Upload className="h-5 w-5 group-hover:text-primary transition-colors" />
                    <span className="text-[11px]">Upload custom image</span>
                  </button>
                )}
                <p className="text-[10px] text-muted-foreground">
                  {customImageUrl ? "Custom image active" : "Auto-selects based on product name"}
                </p>
                {customImageUrl && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    <ImageIcon className="h-3 w-3" /> Replace image
                  </button>
                )}
              </div>
            </BentoSection>

            {/* Content — logically ordered */}
            <BentoSection title="CONTENT" id="content" active={activeSection} onToggle={toggleSection} defaultOpen>
              <div className="space-y-3">
                <FieldInput
                  label="Product Name"
                  value={data.productName}
                  onChange={(v) => setData((d) => ({ ...d, productName: v }))}
                  placeholder="e.g. DataCamp Subscription"
                  multiline
                />
                <FieldInput
                  label="Tagline / Description"
                  value={data.tagline}
                  onChange={(v) => setData((d) => ({ ...d, tagline: v }))}
                  placeholder="One-line product description"
                />
                <div className="grid grid-cols-2 gap-2">
                  <FieldInput
                    label="Price"
                    value={data.price}
                    onChange={(v) => setData((d) => ({ ...d, price: v }))}
                    placeholder="৳999"
                  />
                  <FieldInput
                    label="Original Price"
                    value={data.originalPrice}
                    onChange={(v) => setData((d) => ({ ...d, originalPrice: v }))}
                    placeholder="৳25,000"
                  />
                </div>
                <FieldInput
                  label="Badge Text"
                  value={data.badge}
                  onChange={(v) => setData((d) => ({ ...d, badge: v }))}
                  placeholder="e.g. 96% OFF, LIMITED"
                />
                <FieldInput
                  label="CTA Button Text"
                  value={data.ctaText}
                  onChange={(v) => setData((d) => ({ ...d, ctaText: v }))}
                  placeholder="e.g. ORDER NOW, GET STARTED"
                />
                <FieldInput
                  label="Footer Text"
                  value={data.footerText}
                  onChange={(v) => setData((d) => ({ ...d, footerText: v }))}
                  placeholder="e.g. Order now → digistack.shop"
                />
              </div>
            </BentoSection>

            {/* Features */}
            <BentoSection title="FEATURES" id="features" active={activeSection} onToggle={toggleSection}>
              <div className="space-y-1.5">
                {data.features.map((feat, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      value={feat}
                      onChange={(e) => updateFeature(i, e.target.value)}
                      placeholder={`Feature ${i + 1}`}
                      className="h-8 flex-1 rounded-xl border border-border/60 bg-background px-2.5 text-xs font-body focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    {data.features.length > 1 && (
                      <button
                        onClick={() => removeFeature(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addFeature}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <Plus className="h-3 w-3" /> Add feature
                </button>
              </div>
            </BentoSection>

            {/* AI Caption Generator */}
            <BentoSection title="AI CAPTION" id="caption" active={activeSection} onToggle={toggleSection}>
              <CaptionGenerator data={data} />
            </BentoSection>
          </div>

          {/* ── Canvas Preview ──────────────────────────────────── */}
          <div className="order-1 lg:order-2 sticky top-20">
            <div
              className="rounded-xl border border-border/40 p-6 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 25%, #f0f0f0 50%, #e5e5e5 75%, #f2f2f2 100%)",
              }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto rounded-xl shadow-lg"
                style={{ maxHeight: "72vh" }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 tracking-wider uppercase">
              {template.width} × {template.height}px — PNG
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "twitter", label: "Twitter/X" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "tiktok", label: "TikTok" },
];

function CaptionGenerator({ data }: { data: PostData }) {
  const [platform, setPlatform] = useState("facebook");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!data.productName?.trim()) {
      toast({ title: "Enter a product name first", variant: "destructive" });
      return;
    }
    setLoading(true);
    setCaption("");
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-caption", {
        body: {
          productName: data.productName,
          tagline: data.tagline,
          price: data.price,
          originalPrice: data.originalPrice,
          features: data.features,
          platform,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setCaption(result?.caption || "");
    } catch (e: any) {
      toast({ title: e.message || "Failed to generate caption", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyCaption = () => {
    navigator.clipboard.writeText(caption);
    setCopied(true);
    toast({ title: "Caption copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`text-[11px] font-medium px-3 py-1.5 rounded-xl border transition-all ${
              platform === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-foreground/20"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Button
        onClick={generate}
        disabled={loading}
        variant="outline"
        className="w-full gap-2 rounded-xl text-xs"
        size="sm"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {loading ? "Generating..." : "Generate Caption"}
      </Button>
      {caption && (
        <div className="relative">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
            {caption}
          </div>
          <button
            onClick={copyCaption}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/90 border border-border/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Copy caption"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

function BentoSection({
  title,
  id,
  active,
  onToggle,
  defaultOpen,
  children,
}: {
  title: string;
  id: string;
  active: string | null;
  onToggle: (id: string) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const isOpen = active === id || (active === null && defaultOpen);

  return (
    <div className="rounded-xl border border-border/50 bg-background overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors"
      >
        <span className="text-[11px] font-bold tracking-widest text-foreground/80">{title}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full rounded-xl border border-border/60 bg-background px-2.5 py-2 text-xs font-body focus:outline-none focus:border-primary/50 transition-colors resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 w-full rounded-xl border border-border/60 bg-background px-2.5 text-xs font-body focus:outline-none focus:border-primary/50 transition-colors"
        />
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const testLine = currentLine ? currentLine + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}
