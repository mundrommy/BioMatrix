/**
 * Onboard summary: a plain-language explanation of today's results written by the app itself,
 * with no internet. Used by "Explain my results" when the AI cannot be reached (offline, timeout,
 * server not set up). It only re-uses what the health engine and the Autonomy Copilot already
 * computed, so it never adds new medical claims. Same inputs always give the same text.
 */
import type { CopilotResult } from './autonomyCopilot';
import { METRICS, type Assessment, type Environment } from './spaceHealthEngine';

export interface SummarySection {
  heading: string;
  lines: string[];
}

export interface OnboardSummary {
  headline: string;
  sections: SummarySection[];
}

const VERDICT: Record<string, string> = { go: 'GO', caution: 'CAUTION', 'no-go': 'NO-GO' };

export function buildOnboardSummary(
  assessment: Assessment,
  env: Environment,
  missionDay: number,
  copilot?: CopilotResult,
): OnboardSummary {
  const { triage } = assessment;
  const sections: SummarySection[] = [];
  const patterns = copilot?.patterns.filter((p) => !p.drill) ?? [];

  const headline =
    triage.level === 0
      ? `Mission Day ${missionDay}, ${env.name}: all indicators are in the normal range.`
      : `Mission Day ${missionDay}, ${env.name}: ${triage.title}. ${triage.reason}`;

  if (patterns.length > 0) {
    sections.push({
      heading: 'What is most likely going on',
      lines: patterns.slice(0, 3).map((p) => {
        const ruledOut = p.ruledOut.length ? ` Checked: ${p.ruledOut.join(', ')}.` : '';
        const crew = p.crewWide ? ' This can affect the whole crew.' : '';
        return `${p.title} ${p.explanation.text}${crew}${ruledOut}`;
      }),
    });
  }

  if (triage.findings.length > 0) {
    sections.push({
      heading: 'Out of range today',
      lines: triage.findings.slice(0, 5).map((f) => {
        const m = METRICS[f.metric];
        const level = f.status === 'red' ? 'critical' : 'caution';
        const again = f.persisting ? ' Also out of range at the last check-in.' : '';
        const note = /[.!?]$/.test(f.note) ? f.note : `${f.note}.`;
        return `${m.label}: ${f.value}${m.unit ? ` ${m.unit}` : ''} (${level}). ${note}${again}`;
      }),
    });
  }

  if (copilot) {
    const r = copilot.readiness;
    const reasons = [...r.blockers, ...r.cautions].slice(0, 2).map((x) => `${x.text} (clears when: ${x.clears})`);
    sections.push({
      heading: `Readiness for ${r.task}: ${VERDICT[r.verdict] ?? r.verdict.toUpperCase()}`,
      lines: reasons,
    });

    const ahead = [
      ...copilot.forecasts.slice(0, 2).map((f) => `${f.text} (straight-line estimate, not a medical prediction)`),
      ...copilot.drifts.slice(0, 2).map((d) => d.text),
    ];
    if (ahead.length) sections.push({ heading: 'What to watch', lines: ahead });
  }

  const steps = copilot && copilot.protocol.length > 0 ? copilot.protocol.map((a) => a.text) : triage.steps;
  if (steps.length > 0) sections.push({ heading: 'What to do now', lines: steps.slice(0, 4) });
  else if (triage.level === 0) {
    sections.push({ heading: 'What to do now', lines: ['Keep your daily routine and check in again tomorrow.'] });
  }

  return { headline, sections };
}

/** The same summary as plain text (for copying or tests). */
export function onboardSummaryText(s: OnboardSummary): string {
  return [s.headline, ...s.sections.flatMap((x) => ['', x.heading, ...x.lines.map((l) => `- ${l}`)])].join('\n');
}
