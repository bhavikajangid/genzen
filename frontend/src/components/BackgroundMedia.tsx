"use client";

import * as React from "react";

type Theme = "day" | "night";

const THEME_KEY = "theme";
const SOUND_KEY = "sound";

function rand01(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function BackgroundMedia({ inSession, doorKey }: { inSession: boolean; doorKey: number }) {
  const [theme, setTheme] = React.useState<Theme>("night");
  const [soundOn, setSoundOn] = React.useState(false);

  const dayAudioRef = React.useRef<HTMLAudioElement | null>(null);
  const nightAudioRef = React.useRef<HTMLAudioElement | null>(null);

  const stars = React.useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => {
      const r1 = rand01(1000 + i * 3);
      const r2 = rand01(2000 + i * 7);
      const r3 = rand01(3000 + i * 11);
      const r4 = rand01(4000 + i * 13);
      const r5 = rand01(5000 + i * 17);
      return {
        left: r1 * 100,
        top: r2 * 70,
        size: 0.7 + r3 * 2.1,
        dur: (2.2 + r4 * 2.8).toFixed(1),
        delay: (r5 * 3.5).toFixed(1)
      };
    });
  }, []);

  const windowStars = React.useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => {
      const r1 = rand01(6000 + i * 5);
      const r2 = rand01(7000 + i * 9);
      const r3 = rand01(8000 + i * 13);
      const r4 = rand01(9000 + i * 17);
      return {
        left: r1 * 100,
        top: r2 * 65,
        size: 0.6 + r3 * 1.8,
        dur: (2 + r4 * 2).toFixed(1),
        delay: (rand01(9100 + i * 19) * 3).toFixed(1)
      };
    });
  }, []);

  React.useEffect(() => {
    document.body.classList.toggle("in-session", inSession);
    if (!inSession) document.body.classList.remove("door-animating");
  }, [inSession]);

  React.useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    const nextTheme: Theme = savedTheme === "day" ? "day" : "night";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;

    const savedSound = window.localStorage.getItem(SOUND_KEY);
    setSoundOn(savedSound === "on");
  }, []);

  React.useEffect(() => {
    if (!dayAudioRef.current) {
      const audio = new Audio("/assets/ambience-day.mp3");
      audio.loop = true;
      audio.preload = "none";
      audio.volume = 0.35;
      dayAudioRef.current = audio;
    }
    if (!nightAudioRef.current) {
      const audio = new Audio("/assets/ambience-night.mp3");
      audio.loop = true;
      audio.preload = "none";
      audio.volume = 0.28;
      nightAudioRef.current = audio;
    }
  }, []);

  React.useEffect(() => {
    const dayAudio = dayAudioRef.current;
    const nightAudio = nightAudioRef.current;
    if (!dayAudio || !nightAudio) return;

    const stopAll = () => {
      dayAudio.pause();
      nightAudio.pause();
      dayAudio.currentTime = 0;
      nightAudio.currentTime = 0;
    };

    if (!soundOn) {
      stopAll();
      return;
    }

    const active = theme === "day" ? dayAudio : nightAudio;
    const inactive = theme === "day" ? nightAudio : dayAudio;

    inactive.pause();
    inactive.currentTime = 0;
    void active.play().catch(() => {});
  }, [soundOn, theme]);

  React.useEffect(() => {
    if (doorKey <= 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    document.body.classList.remove("door-animating");
    // force reflow
    void document.body.offsetHeight;
    document.body.classList.add("door-animating");
    const id = window.setTimeout(() => {
      document.body.classList.remove("door-animating");
    }, 950);
    return () => window.clearTimeout(id);
  }, [doorKey]);

  const toggleTheme = () => {
    const next: Theme = theme === "day" ? "night" : "day";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_KEY, next);
  };

  const toggleSound = () => {
    setSoundOn((prev) => {
      const next = !prev;
      window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      return next;
    });
  };

  return (
    <>
      <div className="site-bg" aria-hidden="true">
        <div className="site-bg__stars">
          {stars.map((s, i) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              className="site-bg__star"
              style={{
                width: `${s.size}px`,
                height: `${s.size}px`,
                top: `${s.top}%`,
                left: `${s.left}%`,
                // @ts-expect-error CSS var for animation duration.
                ["--dur"]: `${s.dur}s`,
                animationDelay: `${s.delay}s`
              }}
            />
          ))}
        </div>

        <div className="site-bg__sun" />
        <div className="site-bg__moon" />

        <svg className="site-bg__cloudsBack" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <g className="cloud-float-1">
            <ellipse cx="130" cy="90" rx="100" ry="44" fill="var(--cloud-back-fill)" opacity="0.82" />
            <ellipse cx="96" cy="106" rx="64" ry="34" fill="var(--cloud-back-hl)" opacity="0.88" />
            <ellipse cx="172" cy="102" rx="72" ry="30" fill="var(--cloud-back-hl)" opacity="0.82" />
            <ellipse cx="130" cy="114" rx="92" ry="24" fill="var(--cloud-back-sh)" opacity="0.35" />
          </g>
          <g className="cloud-float-2">
            <ellipse cx="630" cy="70" rx="88" ry="38" fill="var(--cloud-back-fill)" opacity="0.75" />
            <ellipse cx="600" cy="84" rx="56" ry="28" fill="var(--cloud-back-hl)" opacity="0.8" />
            <ellipse cx="664" cy="80" rx="62" ry="26" fill="var(--cloud-back-hl)" opacity="0.75" />
          </g>
          <g className="cloud-float-3">
            <ellipse cx="400" cy="45" rx="70" ry="28" fill="var(--cloud-back-fill)" opacity="0.55" />
            <ellipse cx="378" cy="56" rx="44" ry="20" fill="var(--cloud-back-hl)" opacity="0.6" />
            <ellipse cx="426" cy="53" rx="48" ry="19" fill="var(--cloud-back-hl)" opacity="0.55" />
          </g>
        </svg>

        <svg className="site-bg__cloudsFront" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <g className="cloud-float-2">
            <ellipse cx="680" cy="200" rx="78" ry="34" fill="var(--cloud-front-fill)" opacity="0.88" />
            <ellipse cx="654" cy="214" rx="50" ry="26" fill="var(--cloud-front-hl)" opacity="0.92" />
            <ellipse cx="712" cy="210" rx="56" ry="24" fill="var(--cloud-front-hl)" opacity="0.88" />
            <ellipse cx="680" cy="218" rx="70" ry="18" fill="var(--cloud-front-sh)" opacity="0.35" />
          </g>
          <g className="cloud-float-3">
            <ellipse cx="60" cy="300" rx="66" ry="28" fill="var(--cloud-front-fill)" opacity="0.8" />
            <ellipse cx="36" cy="312" rx="42" ry="22" fill="var(--cloud-front-hl)" opacity="0.85" />
            <ellipse cx="88" cy="308" rx="48" ry="20" fill="var(--cloud-front-hl)" opacity="0.8" />
          </g>
          <g className="cloud-float-1">
            <ellipse cx="750" cy="380" rx="72" ry="30" fill="var(--cloud-front-fill)" opacity="0.72" />
            <ellipse cx="725" cy="392" rx="46" ry="22" fill="var(--cloud-front-hl)" opacity="0.78" />
            <ellipse cx="778" cy="390" rx="52" ry="20" fill="var(--cloud-front-hl)" opacity="0.72" />
          </g>
        </svg>
      </div>

      <div className={`session-room ${theme}`} aria-hidden="true">
        <div className="wall-texture" />
        <div className="window-light-cast" />

        <div className="window-frame">
          <div className="window-outer" />
          <div className="window-glass">
            <div className="sky-day" />
            <div className="sky-night" />

            <div className="birds">
              <svg className="bird-svg bd1" viewBox="0 0 40 20" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
                <path className="wl" d="M20,10 Q10,0 0,5" stroke="#2a5a6a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <path className="wr" d="M20,10 Q30,0 40,5" stroke="#2a5a6a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              </svg>
              <svg className="bird-svg bd2" viewBox="0 0 40 20" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
                <path className="wl" d="M20,10 Q10,0 0,5" stroke="#2a5a6a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
                <path className="wr" d="M20,10 Q30,0 40,5" stroke="#2a5a6a" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            <div className="window-stars">
              {windowStars.map((s, i) => (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  className="wstar"
                  style={{
                    width: `${s.size}px`,
                    height: `${s.size}px`,
                    top: `${s.top}%`,
                    left: `${s.left}%`,
                    // @ts-expect-error CSS var for animation duration.
                    ["--d"]: `${s.dur}s`,
                    animationDelay: `${s.delay}s`
                  }}
                />
              ))}
            </div>

            <div className="window-sun" />
            <div className="window-moon" />

            <svg className="window-clouds" viewBox="0 0 456 308" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
              <g className="wc1" id="wc-day-1">
                <ellipse cx="100" cy="70" rx="68" ry="30" fill="white" opacity="0.85" />
                <ellipse cx="76" cy="82" rx="44" ry="23" fill="white" opacity="0.9" />
                <ellipse cx="130" cy="78" rx="50" ry="22" fill="#f5f5f5" opacity="0.85" />
              </g>
              <g className="wc2" id="wc-day-2">
                <ellipse cx="340" cy="55" rx="58" ry="26" fill="white" opacity="0.8" />
                <ellipse cx="316" cy="66" rx="38" ry="20" fill="white" opacity="0.85" />
                <ellipse cx="368" cy="63" rx="42" ry="19" fill="#f5f5f5" />
              </g>
              <g className="wc1" id="wc-night-1">
                <ellipse cx="100" cy="70" rx="68" ry="30" fill="#8899bb" opacity="0" />
                <ellipse cx="76" cy="82" rx="44" ry="23" fill="#aab0cc" opacity="0" />
                <ellipse cx="130" cy="78" rx="50" ry="22" fill="#aab0cc" opacity="0" />
              </g>
              <g className="wc3" id="wc-night-2">
                <ellipse cx="280" cy="160" rx="60" ry="26" fill="#b8aace" opacity="0" />
                <ellipse cx="256" cy="172" rx="40" ry="20" fill="#ccc0e0" opacity="0" />
                <ellipse cx="308" cy="168" rx="44" ry="18" fill="#ccc0e0" opacity="0" />
              </g>
            </svg>

            <svg className="window-garden" viewBox="0 0 456 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="100" width="456" height="40" fill="#7acc7a" opacity="0.6" />
              <rect x="0" y="108" width="456" height="32" fill="#5aaa5a" opacity="0.4" />
              <g strokeLinecap="round" fill="none" opacity="0.7">
                <path d="M20,100 Q18,88 22,82" stroke="#4a9a40" strokeWidth="1.5" />
                <path d="M24,100 Q28,86 24,78" stroke="#5aaa50" strokeWidth="1.5" />
                <path d="M60,100 Q58,88 62,82" stroke="#3a8a30" strokeWidth="1.5" />
                <path d="M64,100 Q68,86 64,78" stroke="#68bb58" strokeWidth="1.2" />
                <path d="M120,100 Q118,89 122,83" stroke="#5aaa50" strokeWidth="1.5" />
                <path d="M124,100 Q128,87 124,79" stroke="#4a9a40" strokeWidth="1.5" />
                <path d="M200,100 Q198,88 202,82" stroke="#3a8a30" strokeWidth="1.5" />
                <path d="M204,100 Q208,86 204,78" stroke="#5aaa50" strokeWidth="1.5" />
                <path d="M280,100 Q278,89 282,83" stroke="#4a9a40" strokeWidth="1.5" />
                <path d="M284,100 Q288,87 284,79" stroke="#68bb58" strokeWidth="1.2" />
                <path d="M360,100 Q358,88 362,82" stroke="#5aaa50" strokeWidth="1.5" />
                <path d="M364,100 Q368,86 364,78" stroke="#3a8a30" strokeWidth="1.5" />
                <path d="M420,100 Q418,89 422,83" stroke="#4a9a40" strokeWidth="1.5" />
                <path d="M424,100 Q428,87 424,79" stroke="#5aaa50" strokeWidth="1.5" />
              </g>

              <rect x="54" y="54" width="8" height="48" fill="#6b4a1e" rx="2" />
              <ellipse cx="58" cy="62" rx="24" ry="16" fill="#2d7a28" opacity="0.6" />
              <ellipse cx="58" cy="50" rx="20" ry="18" fill="#3a9032" opacity="0.85" />
              <ellipse cx="58" cy="38" rx="16" ry="16" fill="#4aaa3a" opacity="0.9" />
              <ellipse cx="58" cy="28" rx="10" ry="11" fill="#6acc50" opacity="0.78" />

              <rect x="158" y="48" width="9" height="54" fill="#6b4a1e" rx="2" />
              <ellipse cx="162" cy="56" rx="26" ry="17" fill="#4a9820" opacity="0.55" />
              <ellipse cx="162" cy="43" rx="22" ry="19" fill="#5aaa3a" opacity="0.85" />
              <ellipse cx="162" cy="30" rx="17" ry="17" fill="#78cc50" opacity="0.9" />
              <ellipse cx="162" cy="18" rx="11" ry="12" fill="#a0e870" opacity="0.78" />

              <rect x="256" y="40" width="10" height="62" fill="#6b4a1e" rx="2" />
              <ellipse cx="261" cy="50" rx="30" ry="18" fill="#3a7040" opacity="0.55" />
              <ellipse cx="261" cy="36" rx="26" ry="21" fill="#4a8850" opacity="0.85" />
              <ellipse cx="261" cy="22" rx="21" ry="19" fill="#60a865" opacity="0.9" />
              <ellipse cx="261" cy="10" rx="14" ry="13" fill="#88cc88" opacity="0.78" />

              <rect x="358" y="50" width="8" height="52" fill="#6b4a1e" rx="2" />
              <ellipse cx="362" cy="58" rx="24" ry="16" fill="#5a9820" opacity="0.55" />
              <ellipse cx="362" cy="45" rx="20" ry="18" fill="#6ab028" opacity="0.85" />
              <ellipse cx="362" cy="32" rx="16" ry="16" fill="#8acc40" opacity="0.9" />
              <ellipse cx="362" cy="21" rx="10" ry="11" fill="#b0e860" opacity="0.78" />

              <g opacity="0.85">
                <rect x="200" y="92" width="56" height="8" rx="3" fill="#a07840" />
                <rect x="204" y="82" width="48" height="7" rx="3" fill="#b88840" opacity="0.9" />
                <rect x="206" y="100" width="6" height="10" rx="2" fill="#6b4a1e" opacity="0.85" />
                <rect x="244" y="100" width="6" height="10" rx="2" fill="#6b4a1e" opacity="0.85" />
              </g>
            </svg>

            <div className="window-night-ground">
              <svg viewBox="0 0 456 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="nw" width="18" height="12" patternUnits="userSpaceOnUse">
                    <rect width="18" height="12" fill="rgba(0,0,0,0)" />
                    <rect x="3" y="2" width="3" height="4" fill="rgba(255,236,180,0.45)" />
                    <rect x="10" y="3" width="2" height="3" fill="rgba(255,220,160,0.35)" />
                  </pattern>
                </defs>
                <path
                  d="M0 70 L0 40 L40 40 L40 26 L74 26 L74 42 L110 42 L110 22 L150 22 L150 46 L210 46 L210 30 L250 30 L250 56 L310 56 L310 28 L350 28 L350 52 L400 52 L400 34 L456 34 L456 70 Z"
                  fill="rgba(0,0,0,0.55)"
                />
                <rect x="0" y="26" width="456" height="44" fill="url(#nw)" opacity="0.45" style={{ mixBlendMode: "screen" }} />
              </svg>
            </div>
          </div>

          <div className="window-bar-h" />
          <div className="window-bar-v" />
          <div className="window-sill" />
        </div>

        <svg className="bookshelf-left" viewBox="0 0 140 300" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="100" width="140" height="6" fill="#7a5030" rx="1" opacity="0.8" />
          <rect x="10" y="50" width="14" height="50" fill="#8b3a3a" rx="1" opacity="0.7" />
          <rect x="25" y="58" width="11" height="42" fill="#c8a96e" rx="1" opacity="0.7" />
          <rect x="37" y="44" width="16" height="56" fill="#3a5a8b" rx="1" opacity="0.7" />
          <rect x="54" y="55" width="12" height="45" fill="#5a8b3a" rx="1" opacity="0.7" />
          <rect x="67" y="48" width="18" height="52" fill="#6a3a8b" rx="1" opacity="0.7" />
          <rect x="0" y="200" width="140" height="6" fill="#7a5030" rx="1" opacity="0.8" />
          <rect x="8" y="150" width="15" height="50" fill="#3a8b7a" rx="1" opacity="0.7" />
          <rect x="24" y="160" width="11" height="40" fill="#8b3a5a" rx="1" opacity="0.7" />
          <rect x="36" y="148" width="17" height="52" fill="#4a6a8b" rx="1" opacity="0.7" />
          <rect x="54" y="155" width="13" height="45" fill="#7a8b3a" rx="1" opacity="0.7" />
          <rect x="68" y="146" width="16" height="54" fill="#c8a96e" rx="1" opacity="0.7" />
        </svg>

        <svg className="bookshelf-right" viewBox="0 0 140 300" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="100" width="140" height="6" fill="#7a5030" rx="1" opacity="0.8" />
          <rect x="15" y="48" width="16" height="52" fill="#8b5a3a" rx="1" opacity="0.7" />
          <rect x="32" y="56" width="12" height="44" fill="#3a4a8b" rx="1" opacity="0.7" />
          <rect x="45" y="44" width="18" height="56" fill="#8b3a6a" rx="1" opacity="0.7" />
          <rect x="64" y="52" width="13" height="48" fill="#3a8b5a" rx="1" opacity="0.7" />
          <rect x="78" y="46" width="15" height="54" fill="#6a3a8b" rx="1" opacity="0.7" />
          <rect x="0" y="200" width="140" height="6" fill="#7a5030" rx="1" opacity="0.8" />
          <rect x="12" y="150" width="14" height="50" fill="#c8a96e" rx="1" opacity="0.7" />
          <rect x="27" y="158" width="12" height="42" fill="#8b3a3a" rx="1" opacity="0.7" />
          <rect x="40" y="146" width="16" height="54" fill="#3a6a8b" rx="1" opacity="0.7" />
          <rect x="57" y="153" width="11" height="47" fill="#5a8b3a" rx="1" opacity="0.7" />
          <rect x="69" y="145" width="17" height="55" fill="#8b6a3a" rx="1" opacity="0.7" />
        </svg>

        <div className="lamp-wall-glow" />
        <svg className="lamp" width="80" height="160" viewBox="0 0 80 160" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="40" cy="155" rx="22" ry="5" fill="#1a0f08" opacity="0.8" />
          <rect x="34" y="100" width="12" height="55" fill="#2a1a0c" rx="3" />
          <rect x="30" y="148" width="20" height="8" fill="#3a2010" rx="4" />
          <rect x="36" y="68" width="8" height="35" fill="#2a1a0c" rx="3" />
          <path d="M12,68 Q40,50 68,68 L58,40 Q40,30 22,40 Z" fill="#c8944a" opacity="0.95" />
          <path d="M12,68 Q40,50 68,68 L58,40 Q40,30 22,40 Z" fill="rgba(255,200,100,0.15)" />
          <ellipse cx="40" cy="68" rx="28" ry="6" fill="#b07838" opacity="0.9" />
          <circle cx="40" cy="62" r="8" fill="#ffe090" opacity="0.9" />
          <circle cx="40" cy="62" r="5" fill="white" opacity="0.7" />
          <path d="M22,68 Q40,130 58,68" fill="rgba(255,200,80,0.08)" />
          <ellipse cx="40" cy="68" rx="28" ry="4" fill="rgba(255,200,80,0.15)" />
        </svg>
        <div className="lamp-glow" />

        <div className="floor" />
      </div>

      <div className="door-overlay" id="doorOverlay" aria-hidden="true">
        <div className="door-frame" />
        <div className="door-panels">
          <div className="door-panel left" />
          <div className="door-panel right" />
        </div>
      </div>

      <div className="site-bg-controls">
        <button
          type="button"
          className="sound-toggle"
          onClick={toggleSound}
          aria-label={soundOn ? "Turn sound off" : "Turn sound on"}
          title={soundOn ? "Sound on" : "Sound off"}
        >
          <img alt="" src={soundOn ? "/assets/sound-on.png" : "/assets/sound-off.png"} width={20} height={20} />
        </button>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === "day" ? "Switch to night theme" : "Switch to day theme"}
        >
          <span className="theme-toggle__day" aria-hidden="true">
            ☀️
          </span>
          <span className="theme-toggle__night" aria-hidden="true">
            🌙
          </span>
        </button>
      </div>
    </>
  );
}
