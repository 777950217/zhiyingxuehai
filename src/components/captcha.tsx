'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CaptchaProps {
  onValidate: (isValid: boolean) => void;
  length?: number;
}

export default function Captcha({ onValidate, length = 4 }: CaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');

  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const generateCode = useCallback(() => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return result;
  }, [length]);

  const drawCaptcha = useCallback((text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 120;
    const H = 44;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#f0f4f8';
    ctx.fillRect(0, 0, W, H);

    // Interference lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `hsl(${Math.random() * 360}, 40%, 70%)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.random() * W, Math.random() * H);
      ctx.lineTo(Math.random() * W, Math.random() * H);
      ctx.stroke();
    }

    // Interference dots
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `hsl(${Math.random() * 360}, 40%, 60%)`;
      ctx.beginPath();
      ctx.arc(Math.random() * W, Math.random() * H, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw characters
    const charWidth = W / (text.length + 1);
    for (let i = 0; i < text.length; i++) {
      ctx.save();
      const x = charWidth * (i + 0.5) + 4;
      const y = H / 2 + 6;
      const angle = (Math.random() - 0.5) * 0.4;
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 35%)`;
      ctx.font = `bold ${20 + Math.random() * 6}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
  }, []);

  const refresh = useCallback(() => {
    const newCode = generateCode();
    setCode(newCode);
    setInput('');
    onValidate(false);
    // Draw on next frame so canvas is ready
    requestAnimationFrame(() => drawCaptcha(newCode));
  }, [generateCode, drawCaptcha, onValidate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleInput = (value: string) => {
    const upper = value.toUpperCase().slice(0, length);
    setInput(upper);
    onValidate(upper === code);
  };

  return (
    <div className="flex items-center gap-3">
      <canvas
        ref={canvasRef}
        onClick={refresh}
        className="cursor-pointer rounded-lg border border-gray-200 hover:border-sky-400 transition-colors"
        title="点击刷新验证码"
      />
      <input
        type="text"
        value={input}
        onChange={(e) => handleInput(e.target.value)}
        placeholder="请输入验证码"
        maxLength={length}
        autoComplete="off"
        className="w-28 px-3 py-2.5 rounded-lg border border-gray-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none transition-colors text-sm tracking-widest uppercase"
      />
      <button
        type="button"
        onClick={refresh}
        className="text-xs text-sky-500 hover:text-sky-600 whitespace-nowrap"
      >
        换一张
      </button>
    </div>
  );
}
