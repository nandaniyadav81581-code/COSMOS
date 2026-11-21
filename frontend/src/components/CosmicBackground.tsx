// Star positions are calculated once, from the star's number, so they never jump around.
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: (i * 73.13) % 100,
  y: (i * 41.71) % 100,
  size: (i % 3) + 1,
  delay: (i % 7) * 0.6,
}));

export function CosmicBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-32 -top-40 h-[36rem] w-[36rem] rounded-full bg-lavender-200/50 blur-3xl" />
      <div className="absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-blush-100/70 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-[28rem] w-[28rem] rounded-full bg-mint-100/60 blur-3xl" />
      {STARS.map((s, i) => (
        <span key={i} className="absolute animate-twinkle rounded-full bg-violet-500/40"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
      ))}
    </div>
  );
}