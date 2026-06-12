/**
 * Shared helper: read personal product profile from localStorage
 * and build productContext for AI checkup requests
 */

export interface ProductProfile {
  brand: string;
  category: string;
  products: { name: string; warranty: number; priceRange: string }[];
  teamSize: number;
  complaintTypes: string[];
  aiGenerated: {
    features: string[];
    materials: string[];
    commonIssues: { question: string; answer: string }[];
    quickPhrases: { presale: string[]; aftersale: string[] };
  } | null;
  updatedAt: string;
}

export function loadProductProfile(): ProductProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('personal_product_profile');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function buildProductContext(profile: ProductProfile): Record<string, unknown> {
  return {
    brand: profile.brand,
    category: profile.category,
    products: profile.products.filter(p => p.name.trim()).map(p => `${p.name}(${p.warranty}年质保/${p.priceRange})`),
    teamSize: profile.teamSize,
    complaintTypes: profile.complaintTypes,
    features: profile.aiGenerated?.features || [],
    commonIssues: profile.aiGenerated?.commonIssues?.map(i => i.question) || [],
    quickPhrases: profile.aiGenerated?.quickPhrases || null,
  };
}
