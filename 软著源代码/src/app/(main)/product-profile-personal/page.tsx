'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  Package, Plus, Trash2, Sparkles, Save, CheckCircle2,
  Edit3, ChevronDown, Loader2, AlertCircle, ArrowRight,
} from 'lucide-react';

/* ─── 常量 ─── */

const CATEGORIES = ['智能马桶', '花洒', '浴室�?, '水龙�?, '淋浴�?, '其他'];
const WARRANTY_OPTIONS = [1, 2, 3, 5, 8, 10];
const PRICE_RANGES = ['500以下', '500-1000', '1000-3000', '3000-5000', '5000以上'];
const COMPLAINT_TYPES = ['漏水', '安装问题', '退换货', '质量问题', '物流损坏', '异味', '尺寸不符', '其他'];

const STORAGE_KEY = 'personal_product_profile';

interface ProductEntry {
  name: string;
  warranty: number;
  priceRange: string;
}

interface AIGenerated {
  features: string[];
  materials: string[];
  commonIssues: { question: string; answer: string }[];
  quickPhrases: { presale: string[]; aftersale: string[] };
}

interface ProductProfile {
  brand: string;
  category: string;
  products: ProductEntry[];
  teamSize: number;
  complaintTypes: string[];
  aiGenerated: AIGenerated | null;
  updatedAt: string;
}

const DEFAULT_PROFILE: ProductProfile = {
  brand: '',
  category: '',
  products: [{ name: '', warranty: 3, priceRange: '1000-3000' }],
  teamSize: 1,
  complaintTypes: [],
  aiGenerated: null,
  updatedAt: '',
};

/* ─── 工具函数 ─── */

function loadProfileFromLocal(): ProductProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_PROFILE;
}

function saveProfileToLocal(profile: ProductProfile): void {
  profile.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/** Map Supabase row �?ProductProfile */
function rowToProfile(row: Record<string, unknown>): ProductProfile {
  return {
    brand: (row.brand as string) || '',
    category: (row.category as string) || '',
    products: (row.specifications as { products?: ProductEntry[] })?.products || [{ name: '', warranty: 3, priceRange: '1000-3000' }],
    teamSize: (row.specifications as { teamSize?: number })?.teamSize || 1,
    complaintTypes: (row.specifications as { complaintTypes?: string[] })?.complaintTypes || [],
    aiGenerated: (row.features as AIGenerated | null) || null,
    updatedAt: (row.updated_at as string) || '',
  };
}

/** Map ProductProfile �?Supabase row fields */
function profileToRow(p: ProductProfile, userId: string, companyId: string | null) {
  return {
    user_id: userId,
    company_id: companyId,
    product_name: p.brand || '未命名档�?,
    category: p.category,
    brand: p.brand,
    specifications: { products: p.products, teamSize: p.teamSize, complaintTypes: p.complaintTypes },
    features: p.aiGenerated ? JSON.parse(JSON.stringify(p.aiGenerated)) : [],
    updated_at: new Date().toISOString(),
  };
}

/* ─── 组件 ─── */

export default function ProductProfilePersonalPage() {
  const { authFetch, profile: authProfile } = useAuth();
  const supabaseRowIdRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<ProductProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAiResult] = useState<AIGenerated | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Load: Supabase优先 �?localStorage降级
  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/personal-product-profile');
        if (res.ok) {
          const { data } = await res.json();
          if (data) {
            supabaseRowIdRef.current = data.id as string;
            const p = rowToProfile(data as Record<string, unknown>);
            setProfile(p);
            if (p.aiGenerated) setAiResult(p.aiGenerated);
            // 同步到localStorage作降级缓�?
            saveProfileToLocal(p);
            setLoaded(true);
            return;
          }
        }
      } catch { /* Supabase失败，降级localStorage */ }
      // 降级：从localStorage读取
      const saved = loadProfileFromLocal();
      setProfile(saved);
      if (saved.aiGenerated) setAiResult(saved.aiGenerated);
      setLoaded(true);
    })();
  }, [authFetch]);

  // 多标签页同步：标签页重新获得焦点时，从服务器重新加载
  useEffect(() => {
    if (!authFetch) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        authFetch('/api/personal-product-profile')
          .then(res => res.ok ? res.json() : null)
          .then(({ data } = {}) => {
            if (data) {
              supabaseRowIdRef.current = data.id as string;
              const p = rowToProfile(data as Record<string, unknown>);
              setProfile(p);
              if (p.aiGenerated) setAiResult(p.aiGenerated);
              saveProfileToLocal(p);
            }
          })
          .catch(() => { toast.error('云端同步失败，数据已暂存本地'); });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [authFetch]);

  // Update profile field helper
  const update = useCallback(<K extends keyof ProductProfile>(key: K, value: ProductProfile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  }, []);

  // Products array helpers
  const addProduct = useCallback(() => {
    setProfile(prev => ({
      ...prev,
      products: [...prev.products, { name: '', warranty: 3, priceRange: '1000-3000' }],
    }));
  }, []);

  const removeProduct = useCallback((idx: number) => {
    setProfile(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== idx),
    }));
  }, []);

  const updateProduct = useCallback((idx: number, field: keyof ProductEntry, value: string | number) => {
    setProfile(prev => {
      const products = [...prev.products];
      products[idx] = { ...products[idx], [field]: value };
      return { ...prev, products };
    });
  }, []);

  // Toggle complaint type
  const toggleComplaint = useCallback((type: string) => {
    setProfile(prev => ({
      ...prev,
      complaintTypes: prev.complaintTypes.includes(type)
        ? prev.complaintTypes.filter(t => t !== type)
        : [...prev.complaintTypes, type],
    }));
  }, []);

  // AI Generate product knowledge
  const handleGenerate = useCallback(async () => {
    if (!profile.brand.trim()) { toast.error('请填写品牌名�?); return; }
    if (!profile.category) { toast.error('请选择品类'); return; }

    setGenerating(true);
    setAiResult(null);
    setEditMode(false);

    try {
      const response = await fetch('/api/ai-checkup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'generate-product-knowledge',
          input: JSON.stringify({
            brand: profile.brand,
            category: profile.category,
            products: profile.products.filter(p => p.name.trim()),
            teamSize: profile.teamSize,
            complaintTypes: profile.complaintTypes,
          }),
        }),
      });

      if (!response.ok) {
        throw new Error('AI生成失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应�?);

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) { throw new Error(data.error); }
              if (data.done) { accumulated = data.fullContent || accumulated; }
              else if (data.content) { accumulated += data.content; }
            } catch (e) {
              if (e instanceof Error && !e.message.includes('JSON')) throw e;
            }
          }
        }
      }

      // Parse AI result
      let parsed: AIGenerated;
      try {
        // Try to extract JSON from the accumulated text
        const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback: construct from raw text
        parsed = {
          features: ['AI生成内容解析异常，请重新生成或手动编�?],
          materials: [],
          commonIssues: [],
          quickPhrases: { presale: [], aftersale: [] },
        };
      }

      setAiResult(parsed);
      toast.success('产品知识已生成，请确认后保存');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI生成失败，请稍后重试');
    } finally {
      setGenerating(false);
    }
  }, [profile]);

  // Save profile
  const handleSave = useCallback(async () => {
    if (!profile.brand.trim()) { toast.error('请填写品牌名�?); return; }
    if (!profile.category) { toast.error('请选择品类'); return; }
    const validProducts = profile.products.filter(p => p.name.trim());
    if (validProducts.length === 0) { toast.error('请至少输入一个产品名�?); return; }

    setSaving(true);
    try {
      const toSave: ProductProfile = {
        ...profile,
        aiGenerated: aiResult,
      };

      // 双写：Supabase + localStorage
      saveProfileToLocal(toSave);

      try {
        const rowFields = profileToRow(toSave, authProfile?.id || '', authProfile?.companyId ?? null);
        const res = await authFetch('/api/personal-product-profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rowFields),
        });
        if (res.ok) {
          const { data } = await res.json();
          if (data?.id) supabaseRowIdRef.current = data.id;
        }
      } catch { toast.error('云端保存失败，数据已暂存本地，恢复网络后将自动同�?); }

      setProfile(toSave);
      setEditMode(false);
      setJustSaved(true);
      toast.success('已为您同步至AI急救站、话术练兵场、AI体检站、模板库');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  }, [profile, aiResult, authFetch, authProfile?.id, authProfile?.companyId]);

  if (!loaded) return null;

  const hasProfile = !!profile.updatedAt;
  const isComplete = hasProfile && !!profile.aiGenerated;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              产品档案
            </h1>
            <p className="text-gray-500 mt-1">填写您的产品信息，AI帮您生成专属知识�?/p>
          </div>
          {isComplete && (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 已完�?
            </Badge>
          )}
        </div>

        {/* Guide Card */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-lg p-4 mb-6">
          <p className="text-sm text-blue-800 font-medium mb-2">
            💡 填写产品档案后，AI将根据您的品类和产品自动生成�?
          </p>
          <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
            <li>产品功能特点与材质参�?/li>
            <li>该品类常见问题及标准回复话术</li>
            <li>售前/售后推荐快捷�?/li>
            <li>自动同步到AI急救站、话术练兵场、AI体检站、模板库</li>
          </ul>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基础信息</h2>

          {/* Brand */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">品牌</label>
            <Input
              placeholder="如箭牌、九牧、恒�?
              value={profile.brand}
              onChange={(e) => update('brand', e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Category */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">品类</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => update('category', cat)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    profile.category === cat
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Models */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">主要产品型号</label>
              <button
                onClick={addProduct}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> 添加型号
              </button>
            </div>
            <div className="space-y-3">
              {profile.products.map((prod, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <Input
                      placeholder="型号名称"
                      value={prod.name}
                      onChange={(e) => updateProduct(idx, 'name', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <select
                        value={prod.warranty}
                        onChange={(e) => updateProduct(idx, 'warranty', Number(e.target.value))}
                        className="w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 text-sm pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {WARRANTY_OPTIONS.map(y => (
                          <option key={y} value={y}>{y}年质�?/option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="w-36">
                    <div className="relative">
                      <select
                        value={prod.priceRange}
                        onChange={(e) => updateProduct(idx, 'priceRange', e.target.value)}
                        className="w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 text-sm pr-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {PRICE_RANGES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  {profile.products.length > 1 && (
                    <button
                      onClick={() => removeProduct(idx)}
                      className="text-red-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Team Size */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">团队人数</label>
            <Input
              type="number"
              min={1}
              max={50}
              value={profile.teamSize}
              onChange={(e) => update('teamSize', Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="w-32"
            />
          </div>

          {/* Complaint Types */}
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">主要客诉类型（多选）</label>
            <div className="flex flex-wrap gap-2">
              {COMPLAINT_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleComplaint(type)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    profile.complaintTypes.includes(type)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* AI Generate Button */}
        <div className="mb-6">
          <Button
            onClick={handleGenerate}
            disabled={generating || !profile.brand.trim() || !profile.category}
            className="w-full h-12 text-base bg-[#0F2B46] hover:bg-[#1a3a5c] text-white"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> AI正在生成产品知识...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" /> AI生成产品知识
              </>
            )}
          </Button>
        </div>

        {/* AI Result Display */}
        {aiResult && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" /> AI生成的产品知�?
              </h2>
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> {editMode ? '完成编辑' : '编辑修改'}
              </button>
            </div>

            {/* Features */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">🔧 产品功能特点</h3>
              {editMode ? (
                <div className="space-y-1">
                  {aiResult.features.map((f, i) => (
                    <Input
                      key={i}
                      value={f}
                      onChange={(e) => {
                        const updated = [...aiResult.features];
                        updated[i] = e.target.value;
                        setAiResult({ ...aiResult, features: updated });
                      }}
                      className="text-sm"
                    />
                  ))}
                  <button
                    onClick={() => setAiResult({ ...aiResult, features: [...aiResult.features, ''] })}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    + 添加
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {aiResult.features.map((f, i) => (
                    <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Materials */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">🧱 材质参数</h3>
              {editMode ? (
                <div className="space-y-1">
                  {aiResult.materials.map((m, i) => (
                    <Input
                      key={i}
                      value={m}
                      onChange={(e) => {
                        const updated = [...aiResult.materials];
                        updated[i] = e.target.value;
                        setAiResult({ ...aiResult, materials: updated });
                      }}
                      className="text-sm"
                    />
                  ))}
                  <button
                    onClick={() => setAiResult({ ...aiResult, materials: [...aiResult.materials, ''] })}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    + 添加
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {aiResult.materials.map((m, i) => (
                    <Badge key={i} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      {m}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Common Issues */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">�?常见问题及标准回�?/h3>
              <div className="space-y-3">
                {aiResult.commonIssues.map((issue, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    {editMode ? (
                      <>
                        <Input
                          value={issue.question}
                          onChange={(e) => {
                            const updated = [...aiResult.commonIssues];
                            updated[i] = { ...updated[i], question: e.target.value };
                            setAiResult({ ...aiResult, commonIssues: updated });
                          }}
                          placeholder="问题"
                          className="text-sm mb-2"
                        />
                        <Input
                          value={issue.answer}
                          onChange={(e) => {
                            const updated = [...aiResult.commonIssues];
                            updated[i] = { ...updated[i], answer: e.target.value };
                            setAiResult({ ...aiResult, commonIssues: updated });
                          }}
                          placeholder="标准回复"
                          className="text-sm"
                        />
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-800">Q: {issue.question}</p>
                        <p className="text-sm text-gray-600 mt-1">A: {issue.answer}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Phrases */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2">💬 推荐快捷�?/h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">售前话术</p>
                  <div className="space-y-1">
                    {aiResult.quickPhrases.presale.map((p, i) => (
                      editMode ? (
                        <Input
                          key={i}
                          value={p}
                          onChange={(e) => {
                            const updated = [...aiResult.quickPhrases.presale];
                            updated[i] = e.target.value;
                            setAiResult({ ...aiResult, quickPhrases: { ...aiResult.quickPhrases, presale: updated } });
                          }}
                          className="text-sm"
                        />
                      ) : (
                        <div key={i} className="text-sm bg-green-50 text-green-800 rounded px-2 py-1 border border-green-200">
                          {p}
                        </div>
                      )
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">售后话术</p>
                  <div className="space-y-1">
                    {aiResult.quickPhrases.aftersale.map((p, i) => (
                      editMode ? (
                        <Input
                          key={i}
                          value={p}
                          onChange={(e) => {
                            const updated = [...aiResult.quickPhrases.aftersale];
                            updated[i] = e.target.value;
                            setAiResult({ ...aiResult, quickPhrases: { ...aiResult.quickPhrases, aftersale: updated } });
                          }}
                          className="text-sm"
                        />
                      ) : (
                        <div key={i} className="text-sm bg-orange-50 text-orange-800 rounded px-2 py-1 border border-orange-200">
                          {p}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        {aiResult && (
          <div className="mb-8">
            <Button
              onClick={handleSave}
              disabled={saving || !profile.brand.trim() || !profile.category}
              className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              保存产品档案
            </Button>

            {/* 跳转按钮 - 保存成功后展�?*/}
            {justSaved && (
              <div className="mt-4 space-y-3">
                <p className="text-center text-sm text-gray-500">产品档案已同步，立即体验�?/p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 border-blue-300 text-blue-700 hover:bg-blue-50"
                    onClick={() => window.location.href = '/ai-assistant'}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    去AI急救站体�?
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-11 border-green-300 text-green-700 hover:bg-green-50"
                    onClick={() => window.location.href = '/ai-checkup/speech'}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    去AI体检站检�?
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* No AI result yet - show status */}
        {!aiResult && hasProfile && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="text-center py-4">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-gray-700 font-medium">产品档案已保存基础信息</p>
              <p className="text-sm text-gray-500 mt-1">点击「AI生成产品知识」完善专属知识库</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
