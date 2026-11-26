import Image from "next/image";
import Link from "next/link";
import { Accent, BRAND, Logo } from "@/components/brand";
import windowImg from "../textures/lancet-window.webp";

export const metadata = { title: "Brand assets · shule" };

const SAMPLES: { name: string; cls: string; use: string; file: string }[] = [
  { name: "Stained glass", cls: "tex-glass", use: "Hero backdrops, card headers, section dividers (crop it small)", file: "stained-glass-tile.webp · tiles seamlessly" },
  { name: "Wood planks", cls: "tex-wood", use: "Warm panels, footers, testimonial or quote blocks", file: "wood-planks-tile.webp · tiles seamlessly" },
];

export default function BrandAssets() {
  return (
    <main>
      <nav className="section nav" style={{ paddingTop: 24, paddingBottom: 12 }}>
        <Logo />
        <div className="nav-links"><Link href="/">Home</Link><Link className="btn" href="/start">Get started</Link></div>
      </nav>

      <header className="section" style={{ paddingTop: 32, paddingBottom: 24 }}>
        <span className="eyebrow">Internal · brand assets</span>
        <h1 className="h-hero" style={{ marginTop: 16, fontSize: "clamp(40px, 5vw, 60px)" }}>Textures and <Accent>accents.</Accent></h1>
        <p className="muted" style={{ maxWidth: 680, fontSize: 18 }}>
          Generated in Blender and Python from the brand palette. Source maps (base color, normal, roughness, height),
          the .blend file and the scripts live in <code>brand-assets/</code> in the repo.
        </p>
      </header>

      <section className="section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>
        <figure className="card" style={{ margin: 0, display: "grid", placeItems: "center", background: BRAND.warm }}>
          <Image src={windowImg} alt="Timber-framed lancet window with shule stained glass" style={{ width: "min(100%, 320px)", height: "auto" }} priority />
          <figcaption className="muted" style={{ fontSize: 14, textAlign: "center", marginTop: 12 }}>
            <b style={{ color: BRAND.deep }}>Lancet window</b> · transparent background · lancet-window.webp (and -sm)
          </figcaption>
        </figure>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {SAMPLES.map(s => (
            <figure key={s.cls} className="card" style={{ margin: 0, padding: 0, overflow: "hidden" }}>
              <div className={s.cls} style={{ height: 200 }} />
              <figcaption style={{ padding: 18 }}>
                <b>{s.name}</b> <code style={{ fontSize: 13 }}>.{s.cls}</code>
                <div className="muted" style={{ fontSize: 14 }}>{s.use}</div>
                <div className="muted" style={{ fontSize: 13 }}>{s.file}</div>
              </figcaption>
            </figure>
          ))}
          <figure className="card" style={{ margin: 0 }}>
            <div className="beam-rule" />
            <figcaption style={{ paddingTop: 14 }}>
              <b>Timber beam</b> <code style={{ fontSize: 13 }}>.beam-rule</code>
              <div className="muted" style={{ fontSize: 14 }}>A divider or shelf line with iron pegs · wood-beam-border.webp · repeats horizontally</div>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 48, paddingBottom: 64 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800 }}>In use</h2>
        <div className="glass-panel tex-glass" style={{ borderRadius: "220px 220px 24px 24px", padding: "90px 28px 36px", maxWidth: 560 }}>
          <div style={{ background: "rgba(255,248,243,.94)", borderRadius: 20, padding: 24 }}>
            <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>A card framed in <Accent>glass.</Accent></h3>
            <p className="muted" style={{ margin: "8px 0 0" }}>Keep text on a solid surface; the texture is the frame, never the background behind words.</p>
          </div>
        </div>
        <div className="beam-rule" style={{ margin: "36px 0", maxWidth: 560 }} />
        <div className="tex-wood" style={{ borderRadius: 24, padding: 28, maxWidth: 560 }}>
          <blockquote style={{ margin: 0, background: "rgba(255,248,243,.95)", borderRadius: 18, padding: 22 }}>
            <span className="accent" style={{ fontSize: 24, color: BRAND.violet }}>“Let all things be done decently and in order.”</span>
            <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>1 Corinthians 14:40</div>
          </blockquote>
        </div>
      </section>
    </main>
  );
}
