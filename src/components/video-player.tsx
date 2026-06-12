'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  duration?: string;
  lessonId: string;
  onProgress?: (currentTime: number, duration: number) => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 2] as const;
const PROGRESS_KEY = 'video_progress_';

export default function VideoPlayer({ src, duration, lessonId, onProgress }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 恢复上次播放进度
  useEffect(() => {
    const saved = localStorage.getItem(PROGRESS_KEY + lessonId);
    if (saved && videoRef.current) {
      const savedTime = parseFloat(saved);
      if (!isNaN(savedTime) && savedTime > 0) {
        videoRef.current.currentTime = savedTime;
        setCurrentTime(savedTime);
      }
    }
  }, [lessonId]);

  // 保存播放进度
  const saveProgress = useCallback(() => {
    if (videoRef.current && videoRef.current.currentTime > 0) {
      localStorage.setItem(
        PROGRESS_KEY + lessonId,
        String(videoRef.current.currentTime)
      );
    }
    if (onProgress && videoRef.current) {
      onProgress(videoRef.current.currentTime, videoRef.current.duration);
    }
  }, [lessonId, onProgress]);

  // 定时保存进度
  useEffect(() => {
    const interval = setInterval(saveProgress, 5000);
    return () => clearInterval(interval);
  }, [saveProgress]);

  // 自动隐藏控制条
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  const handleMouseMove = useCallback(() => {
    resetHideTimer();
  }, [resetHideTimer]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  }, []);

  const handleSpeedChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate as typeof SPEED_OPTIONS[number]);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const newRate = SPEED_OPTIONS[nextIndex];
    video.playbackRate = newRate;
    setPlaybackRate(newRate);
  }, [playbackRate]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }, []);

  const handleRestart = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  }, []);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setVideoDuration(videoRef.current.duration);
          }
        }}
        onProgress={() => {
          if (videoRef.current?.buffered?.length) {
            const buff = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
            setBuffered(buff);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          saveProgress();
        }}
        playsInline
        preload="metadata"
      />

      {/* 播放/暂停大按钮 */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-600/80 flex items-center justify-center hover:bg-blue-600 transition-colors shadow-lg">
            <Play className="w-8 h-8 md:w-10 md:h-10 text-white ml-1" />
          </div>
        </div>
      )}

      {/* 时长标签 */}
      {duration && !isPlaying && (
        <div className="absolute top-3 right-3 bg-black/60 text-white text-sm px-2 py-1 rounded-md">
          📺 {duration}
        </div>
      )}

      {/* 控制条 */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 md:px-4 pb-3 pt-8 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* 进度条 */}
        <div
          ref={progressRef}
          className="w-full h-2 bg-white/20 rounded-full cursor-pointer mb-2 group/progress hover:h-3 transition-all"
          onClick={handleSeek}
        >
          {/* 缓冲进度 */}
          <div
            className="absolute h-2 group-hover/progress:h-3 bg-white/30 rounded-full transition-all top-0 left-0"
            style={{ width: `${videoDuration > 0 ? (buffered / videoDuration) * 100 : 0}%` }}
          />
          {/* 播放进度 */}
          <div
            className="absolute h-2 group-hover/progress:h-3 bg-blue-500 rounded-full transition-all top-0 left-0"
            style={{ width: `${progressPercent}%` }}
          />
          {/* 进度指示点 */}
          <div
            className="absolute w-3.5 h-3.5 bg-blue-400 rounded-full -top-0.5 shadow-md opacity-0 group-hover/progress:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        </div>

        {/* 按钮行 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            {/* 播放/暂停 */}
            <button onClick={togglePlay} className="text-white hover:text-blue-300 transition-colors p-1">
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* 重播 */}
            <button onClick={handleRestart} className="text-white/70 hover:text-white transition-colors p-1">
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* 音量 */}
            <div className="flex items-center gap-1">
              <button onClick={toggleMute} className="text-white hover:text-blue-300 transition-colors p-1">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 md:w-16 group-hover:w-16 transition-all accent-blue-400 h-1 cursor-pointer"
              />
            </div>

            {/* 时间 */}
            <span className="text-white/80 text-xs md:text-sm font-mono whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(videoDuration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 倍速 */}
            <button
              onClick={handleSpeedChange}
              className="text-white/80 hover:text-white text-xs md:text-sm font-medium px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              {playbackRate}x
            </button>

            {/* 全屏 */}
            <button onClick={handleFullscreen} className="text-white hover:text-blue-300 transition-colors p-1">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
