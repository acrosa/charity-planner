import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Blinds } from "~/components/Blinds";
import { Interview } from "~/components/Interview";
import { MetaStrip } from "~/components/MetaStrip";
import { PipelineTheater } from "~/components/PipelineTheater";
import { Report } from "~/components/report/Report";
import type { Facets } from "~/lib/facets";
import type { NewsItem, Report as ReportType } from "~/lib/types";
import type { Route } from "./+types/plan";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Charity Planner — your giving plan" }];
}

type Stage = "interview" | "loading" | "report" | "error";

export default function Plan() {
  const [params] = useSearchParams();
  const mode = params.get("mode") === "quick" ? "quick" : "full";

  const [stage, setStage] = useState<Stage>("interview");
  const [stageLabel, setStageLabel] = useState("INTERVIEW");
  const [report, setReport] = useState<ReportType | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [location, setLocation] = useState("");
  const [blinds, setBlinds] = useState(false);
  const recommendStarted = useRef(false);

  const triggerBlinds = () => {
    setBlinds(true);
    setTimeout(() => setBlinds(false), 800);
  };

  async function runRecommend(facets: Facets) {
    if (recommendStarted.current) return;
    recommendStarted.current = true;
    triggerBlinds();
    setStage("loading");
    setStageLabel("BUILDING YOUR STRATEGY");
    if (facets.geo.city || facets.geo.state) {
      setLocation(facets.geo.city || facets.geo.state || "");
    }
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facets, mode }),
      });
      if (!res.ok) throw new Error("recommend failed");
      const data = (await res.json()) as { report: ReportType };
      triggerBlinds();
      setReport(data.report);
      setStage("report");
      setStageLabel("YOUR REPORT");
      hydrateNews(data.report);
    } catch {
      setStage("error");
    }
  }

  async function hydrateNews(rep: ReportType) {
    setNewsLoading(true);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          charities: rep.charities.map((c) => ({
            ein: c.ein,
            name: c.name,
            city: c.city,
            state: c.state,
          })),
        }),
      });
      const data = (await res.json()) as { news: Record<string, NewsItem | null> };
      setReport((prev) =>
        prev
          ? {
              ...prev,
              charities: prev.charities.map((c) => ({ ...c, news: data.news[c.ein] ?? null })),
            }
          : prev,
      );
    } catch {
      /* news is a progressive enhancement */
    } finally {
      setNewsLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Blinds show={blinds} />
      <MetaStrip
        location={location}
        onLocationChange={setLocation}
        stageLabel={stageLabel}
        voiceOn={voiceOn}
      />

      {stage === "interview" && (
        <Interview
          mode={mode}
          voiceOn={voiceOn}
          onToggleVoice={() => setVoiceOn((v) => !v)}
          onStageChange={(_s, turns) =>
            setStageLabel(`INTERVIEW${mode === "quick" ? ` (${Math.min(turns + 1, 3)}/3)` : ""}`)
          }
          onComplete={runRecommend}
        />
      )}

      {stage === "loading" && <PipelineTheater corpusCount={10000} />}

      {stage === "report" && report && <Report report={report} newsLoading={newsLoading} />}

      {stage === "error" && (
        <div className="mx-auto max-w-xl px-6 py-32 text-center">
          <p className="font-display text-3xl" style={{ fontWeight: 380 }}>
            Something interrupted your plan.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 font-mono text-[13px] uppercase tracking-[0.08em] underline"
          >
            start over
          </button>
        </div>
      )}
    </main>
  );
}
