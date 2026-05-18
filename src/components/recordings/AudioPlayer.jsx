import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

const PIN_COLORS = {
  PRICE_MENTION: '#eab308',
  PRICE_RANGE: '#7c3aed',
  CONDITIONAL_ORDER: '#ea580c',
  QTY_PRICE: '#dc2626',
  TIME_INSTRUCTION: '#2563eb',
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(secs) {
  if (!secs || isNaN(secs)) return '00:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ recordingUrl, durationSeconds, extractions = [], seekRef, onTimeUpdate }) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [hoveredPin, setHoveredPin] = useState(null); // { idx, x, ext }
  const hasAudio = !!recordingUrl && recordingUrl.trim() !== '';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      if (onTimeUpdate) onTimeUpdate(audio.currentTime);
    };
    const onLoaded = () => setDuration(audio.duration || durationSeconds || 0);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, [durationSeconds, onTimeUpdate]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play(); setIsPlaying(true); }
  };

  const seekTo = useCallback((secs) => {
    const audio = audioRef.current;
    if (!audio || !hasAudio) return;
    audio.currentTime = secs;
    setCurrentTime(secs);
    audio.play();
    setIsPlaying(true);
  }, [hasAudio]);

  // Register seekTo fn in parent's ref so ExtractionCard timestamp chips can trigger it
  useEffect(() => {
    if (seekRef) seekRef.current = seekTo;
  }, [seekTo, seekRef]);

  const handleProgressClick = (e) => {
    if (!hasAudio) return;
    const bar = progressBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * (duration || 1));
  };

  const changeSpeed = (s) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const changeVolume = (v) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Pin positions
  const pins = extractions
    .filter(e => e.timestamp_estimate_seconds != null)
    .map((e, idx) => ({
      idx,
      ext: e,
      pct: duration > 0 ? Math.min(100, (e.timestamp_estimate_seconds / duration) * 100) : 0,
      color: PIN_COLORS[e.type] || '#888',
    }));

  return (
    <div className="rounded-xl px-4 pt-3 pb-4 flex flex-col gap-3" style={{ background: '#1a1a2e' }}>
      {!hasAudio && (
        <p className="text-xs text-center py-1" style={{ color: '#6b7db3' }}>
          Live recording will appear here once the integration is active.
        </p>
      )}

      {hasAudio && (
        <audio ref={audioRef} src={recordingUrl} preload="metadata" style={{ display: 'none' }} />
      )}

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={!hasAudio}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: hasAudio ? '#4F8EF7' : '#2d2d4e', color: '#fff', cursor: hasAudio ? 'pointer' : 'not-allowed' }}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Time + progress bar + total */}
        <div className="flex-1 flex flex-col gap-1.5">
          {/* Progress bar with pins */}
          <div
            ref={progressBarRef}
            onClick={handleProgressClick}
            className="relative h-5 rounded-sm overflow-visible"
            style={{ background: '#2d2d4e', cursor: hasAudio ? 'pointer' : 'default' }}
          >
            {/* Fill */}
            <div
              className="absolute left-0 top-0 h-full rounded-sm transition-none"
              style={{ width: `${progress}%`, background: '#4F8EF7' }}
            />

            {/* Timestamp pins */}
            {pins.map(pin => (
              <div
                key={pin.idx}
                className="absolute top-0 h-full"
                style={{ left: `${pin.pct}%`, transform: 'translateX(-50%)', zIndex: 10 }}
                onMouseEnter={e => {
                  const bar = progressBarRef.current;
                  const rect = bar?.getBoundingClientRect();
                  setHoveredPin({ ...pin, x: e.clientX - (rect?.left || 0) });
                }}
                onMouseLeave={() => setHoveredPin(null)}
                onClick={e => { e.stopPropagation(); if (hasAudio) seekTo(pin.ext.timestamp_estimate_seconds); }}
              >
                {/* Pin line */}
                <div className="w-[3px] h-full rounded-sm" style={{ background: pin.color }} />
                {/* Pin dot on top */}
                <div
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: pin.color, borderColor: '#1a1a2e' }}
                />
              </div>
            ))}

            {/* Tooltip */}
            {hoveredPin && (
              <div
                className="absolute bottom-full mb-2 z-50 pointer-events-none"
                style={{ left: `${hoveredPin.pct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="rounded-lg px-2.5 py-1.5 text-xs shadow-xl" style={{ background: '#0f0f1e', border: `1px solid ${hoveredPin.color}`, color: '#e2e8f0', minWidth: 140, maxWidth: 200 }}>
                  <p className="font-semibold mb-0.5" style={{ color: hoveredPin.color }}>{hoveredPin.ext.type?.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] opacity-80 mb-1 leading-snug">
                    "{(hoveredPin.ext.quote || '').slice(0, 40)}{hoveredPin.ext.quote?.length > 40 ? '…' : ''}"
                  </p>
                  <p className="font-mono text-[10px] opacity-70">{formatTime(hoveredPin.ext.timestamp_estimate_seconds)}</p>
                  {/* Arrow */}
                  <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-2.5 h-2.5 rotate-45" style={{ background: '#0f0f1e', borderRight: `1px solid ${hoveredPin.color}`, borderBottom: `1px solid ${hoveredPin.color}` }} />
                </div>
              </div>
            )}
          </div>

          {/* Time labels */}
          <div className="flex justify-between px-0.5">
            <span className="text-[10px] font-mono" style={{ color: '#8899cc' }}>{formatTime(currentTime)}</span>
            <span className="text-[10px] font-mono" style={{ color: '#8899cc' }}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed selector */}
        <div className="flex gap-1 shrink-0">
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => changeSpeed(s)}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors"
              style={{
                background: speed === s ? '#4F8EF7' : 'transparent',
                color: speed === s ? '#fff' : '#8899cc',
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Volume2 className="w-3 h-3" style={{ color: '#8899cc' }} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={e => changeVolume(Number(e.target.value))}
            className="w-16 h-1 appearance-none rounded-full cursor-pointer"
            style={{ accentColor: '#4F8EF7', background: '#2d2d4e' }}
          />
        </div>
      </div>
    </div>
  );
}