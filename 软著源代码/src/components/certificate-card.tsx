"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Share2, Award, X } from "lucide-react";

interface CertificateData {
  certificate_code: string;
  user_name: string;
  completed_at: string;
  created_at: string;
}

interface CertificateCardProps {
  certificate: CertificateData;
  onClose?: () => void;
}

export default function CertificateCard({ certificate, onClose }: CertificateCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shareCanvasRef = useRef<HTMLCanvasElement>(null);
  const [showShare, setShowShare] = useState(false);
  const [generating, setGenerating] = useState(false);

  const completedDate = new Date(certificate.completed_at).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const issuedDate = new Date(certificate.created_at).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const domain = typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_COZE_PROJECT_DOMAIN_DEFAULT || window.location.host)
    : "";

  // 绘制证书到canvas
  const drawCertificate = useCallback((canvas: HTMLCanvasElement, includeQR = false) => {
    const scale = 2; // 高清
    const w = includeQR ? 900 : 800;
    const h = includeQR ? 660 : 570;
    canvas.width = w * scale;
    canvas.height = h * scale;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);

    // 背景
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    // 外边�?- 浅金色双�?
    ctx.strokeStyle = "#C9A96E";
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, w - 30, h - 30);
    ctx.strokeStyle = "#E8D5A8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(22, 22, w - 44, h - 44);

    // 顶部装饰�?
    const gradient = ctx.createLinearGradient(100, 50, w - 100, 50);
    gradient.addColorStop(0, "rgba(201,169,110,0)");
    gradient.addColorStop(0.5, "rgba(201,169,110,0.8)");
    gradient.addColorStop(1, "rgba(201,169,110,0)");
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 65);
    ctx.lineTo(w - 80, 65);
    ctx.stroke();

    // 标题
    ctx.fillStyle = "#1E3A5F";
    ctx.font = "bold 28px serif";
    ctx.textAlign = "center";
    ctx.fillText("职盈学海", w / 2, 100);

    ctx.fillStyle = "#C9A96E";
    ctx.font = "bold 20px serif";
    ctx.fillText("�?�?�?, w / 2, 128);

    ctx.fillStyle = "#1E3A5F";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText("客服主管管理能力结业证书", w / 2, 158);

    // 分割�?
    const gradient2 = ctx.createLinearGradient(120, 175, w - 120, 175);
    gradient2.addColorStop(0, "rgba(201,169,110,0)");
    gradient2.addColorStop(0.5, "rgba(201,169,110,0.6)");
    gradient2.addColorStop(1, "rgba(201,169,110,0)");
    ctx.strokeStyle = gradient2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 175);
    ctx.lineTo(w - 100, 175);
    ctx.stroke();

    // 正文
    ctx.fillStyle = "#333333";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "left";

    const textX = 80;
    let textY = 210;

    // 姓名（加粗加大）
    ctx.fillStyle = "#1E3A5F";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(certificate.user_name, textX, textY);

    ctx.fillStyle = "#333333";
    ctx.font = "18px sans-serif";
    const nameWidth = ctx.measureText(certificate.user_name).width;

    // 衔接文字
    ctx.fillText("  同学", textX + nameWidth + 4, textY);

    textY += 36;
    ctx.fillStyle = "#555555";
    ctx.font = "17px sans-serif";

    const line1 = `�?${completedDate} 完成职盈学海客服主管管理能力`;
    ctx.fillText(line1, textX, textY);

    textY += 30;
    const line2 = "全部课程学习（共4阶段25节），考核通过，特发此证�?;
    ctx.fillText(line2, textX, textY);

    // 课程阶段
    textY += 40;
    ctx.fillStyle = "#888888";
    ctx.font = "14px sans-serif";
    ctx.fillText("课程阶段：角色认�?· 目标管理 · 团队带教 · 业务落地", textX, textY);

    // 底部区域
    const bottomY = h - 110;

    // 颁发机构
    ctx.fillStyle = "#1E3A5F";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("颁发机构：职盈学�?, textX, bottomY);

    ctx.fillStyle = "#555555";
    ctx.font = "15px sans-serif";
    ctx.fillText(`颁发日期�?{issuedDate}`, textX, bottomY + 28);

    // 品牌章（右侧�?
    const stampX = w - 180;
    const stampY = bottomY - 25;

    // 圆形�?
    ctx.beginPath();
    ctx.arc(stampX + 40, stampY + 40, 38, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(201,60,60,0.7)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "rgba(201,60,60,0.7)";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("职盈学海", stampX + 40, stampY + 35);
    ctx.font = "10px sans-serif";
    ctx.fillText("颁发", stampX + 40, stampY + 52);

    // 证书编号
    ctx.fillStyle = "#999999";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`编号�?{certificate.certificate_code}`, w / 2, h - 40);

    // QR码区域（仅分享海报）
    if (includeQR) {
      const qrAreaY = h - 140;
      // 简易QR占位（实际使用canvas绘制方块模拟�?
      const qrX = w / 2 - 45;
      ctx.fillStyle = "#F5F5F5";
      ctx.fillRect(qrX - 10, qrAreaY - 10, 110, 110);
      ctx.strokeStyle = "#DDD";
      ctx.strokeRect(qrX - 10, qrAreaY - 10, 110, 110);

      // 模拟QR码图�?
      ctx.fillStyle = "#333";
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
          if (Math.random() > 0.4 || (i < 3 && j < 3) || (i > 5 && j < 3) || (i < 3 && j > 5)) {
            ctx.fillRect(qrX + i * 10, qrAreaY + j * 10, 8, 8);
          }
        }
      }

      ctx.fillStyle = "#666";
      ctx.font = "13px sans-serif";
      ctx.fillText("扫码验证证书真伪", w / 2, qrAreaY + 115);
    }
  }, [certificate, completedDate, issuedDate]);

  // 下载证书PNG
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCertificate(canvas, false);
    const link = document.createElement("a");
    link.download = `职盈学海结业证书_${certificate.user_name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [certificate, drawCertificate]);

  // 生成分享海报
  const handleShare = useCallback(() => {
    setGenerating(true);
    setTimeout(() => {
      const canvas = shareCanvasRef.current;
      if (!canvas) { setGenerating(false); return; }
      drawCertificate(canvas, true);
      setShowShare(true);
      setGenerating(false);
    }, 100);
  }, [drawCertificate]);

  // 下载分享海报
  const handleDownloadShare = useCallback(() => {
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `职盈学海结业证书_分享版_${certificate.user_name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [certificate]);

  return (
    <div className="relative">
      {/* 证书预览 - CSS渲染版本 */}
      <div className="bg-gradient-to-b from-amber-50 to-white border-2 border-amber-200 rounded-2xl p-8 relative overflow-hidden">
        {onClose && (
          <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}

        {/* 金色角标 */}
        <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 opacity-20 rounded-br-3xl" />
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-400 to-amber-600 opacity-20 rounded-bl-3xl" />

        <div className="text-center mb-6">
          <div className="text-amber-600 text-sm tracking-widest mb-1">�?�?�?/div>
          <h2 className="text-2xl font-bold text-blue-900">职盈学海</h2>
          <h3 className="text-lg font-bold text-blue-800 mt-1">客服主管管理能力结业证书</h3>
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mt-3" />
        </div>

        <div className="text-center mb-6 px-4">
          <p className="text-lg text-gray-700 leading-relaxed">
            兹证�?<span className="font-bold text-blue-900 text-xl">{certificate.user_name}</span> 同学
          </p>
          <p className="text-base text-gray-600 mt-2">
            �?{completedDate} 完成职盈学海客服主管管理能力全部课程学习（共4阶段25节），考核通过，特发此证�?
          </p>
          <p className="text-sm text-gray-400 mt-3">课程阶段：角色认�?· 目标管理 · 团队带教 · 业务落地</p>
        </div>

        <div className="flex items-end justify-between px-4 mt-6">
          <div className="text-left">
            <p className="text-sm font-bold text-blue-900">颁发机构：职盈学�?/p>
            <p className="text-sm text-gray-500 mt-1">颁发日期：{issuedDate}</p>
          </div>
          {/* 品牌�?*/}
          <div className="w-20 h-20 rounded-full border-[3px] border-red-400/60 flex flex-col items-center justify-center opacity-70 rotate-[-8deg]">
            <span className="text-red-500 font-bold text-xs">职盈学海</span>
            <span className="text-red-400 text-[10px]">颁发</span>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-400 font-mono">编号：{certificate.certificate_code}</p>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-800 text-white rounded-xl py-3 text-base font-medium hover:bg-blue-900 transition-colors"
        >
          <Download className="w-5 h-5" />
          保存证书
        </button>
        <button
          onClick={handleShare}
          disabled={generating}
          className="flex-1 flex items-center justify-center gap-2 bg-amber-500 text-white rounded-xl py-3 text-base font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
        >
          <Share2 className="w-5 h-5" />
          {generating ? "生成�?.." : "分享证书"}
        </button>
      </div>

      {/* 分享海报弹窗 */}
      {showShare && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">分享证书</h3>
              <button onClick={() => setShowShare(false)} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              长按保存图片，分享到朋友�?小红�?
            </p>
            <div className="flex justify-center mb-4">
              <canvas ref={shareCanvasRef} className="rounded-lg shadow-lg max-w-full" />
            </div>
            <button
              onClick={handleDownloadShare}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white rounded-xl py-3 text-base font-medium hover:bg-amber-600 transition-colors"
            >
              <Download className="w-5 h-5" />
              保存分享�?
            </button>
          </div>
        </div>
      )}

      {/* 隐藏canvas用于下载 */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// 恭喜完成弹窗
export function CongratsModal({
  open,
  onClose,
  onGetCertificate,
}: {
  open: boolean;
  onClose: () => void;
  onGetCertificate: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4">
          <Award className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">恭喜完成全部课程�?/h2>
        <p className="text-gray-500 mb-6">
          你已完成职盈学海客服主管管理能力全部4阶段25节课程，
          现在可以领取结业证书了！
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            稍后再说
          </button>
          <button
            onClick={onGetCertificate}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:from-amber-600 hover:to-amber-700 transition-all"
          >
            领取证书
          </button>
        </div>
      </div>
    </div>
  );
}
