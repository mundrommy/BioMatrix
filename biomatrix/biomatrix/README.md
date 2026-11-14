# BioMatrix: Autonomous Astronaut Health Monitoring & Triage

A working prototype for the **2026 NASA Space Apps Challenge**, challenge
*"Create Health Monitoring Software for Astronauts on Space Missions"*, by the **BioMatrix** team.

The app helps an astronaut **gather** health indicators, **evaluate** them at a glance and
**act** on the result, even when Earth is up to 20 minutes away.

> Guidance only, not a medical diagnosis. The flight surgeon makes medical decisions.
> All astronaut data in the app is simulated demo data. This project is not endorsed by NASA.

## What it does

- **Interactive astronaut body map**: 5 clickable zones (Neuro-Ocular & CNS, Cardiopulmonary & Cabin Air,
  Metabolic & Renal, Musculoskeletal, Immune & Radiation Shielding) that glow green, amber or red.
- **Medical guidance drawer** for each zone: linked NASA hazards, why space causes the problem,
  step-by-step "how to perform exam" checklists, reference ranges and countermeasures, each with its source.
- **Autonomous triage** in 4 levels: Nominal, Self-Care Protocol, Crew Assist Needed,
  Transmit Urgent Telemetry to Earth Flight Surgeons. In Mars transit the self-care steps come first,
  because a reply from Earth can take 40+ minutes.
- **Vitals input**: sliders and number boxes for 15 indicators plus symptom checkboxes. Zones and triage update instantly.
- **Mission environments**: ISS, Lunar Base, Mars Transit and Pressurized Rover change gravity,
  communication delay, radiation and how early the app escalates.
- **15-second reaction test** (PVT-style mini-game) that feeds the reaction-time indicator.
- **14-day trend chart** for every numeric indicator.
- **3 one-click demo scenarios** for a live pitch.
- **Simulated wearable sync** that streams heart rate, SpO2 and respiratory rate.
- **Offline-first**: no backend. State is saved in the browser with `localStorage`.

## How to run

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install
npm run dev
```

Then open the address shown in the terminal (usually http://localhost:5173).

To build for hosting (for example on Vercel or GitHub Pages):

```bash
npm run build     # output goes to the dist/ folder
npm run preview   # check the built version locally
```

On Vercel: import the GitHub repository and keep the default settings (framework preset "Vite").

## Project structure

```
src/
  data/spaceHealthEngine.ts   All health data, ranges, sources, environments, presets and the triage logic
  components/
    Header.tsx                Environment switcher, Earth-link status, demo scenarios, wearable toggle
    AstronautMap.tsx          SVG astronaut with 5 clickable zones
    GuidanceDrawer.tsx        Medical guidance for the selected zone
    TriageBanner.tsx          Triage level, steps, telemetry summary
    VitalsPanel.tsx           Symptoms and all indicator inputs
    PVTGame.tsx               15-second reaction test
    TrendPanel.tsx            14-day chart (Recharts)
    ui.tsx                    Status badge, source tag, panel
  App.tsx                     Page layout and state
```

## Scientific accuracy

Every threshold, fact and countermeasure in `spaceHealthEngine.ts` has a `source`:

- a link to a NASA, CSA or medical reference page, **or**
- the tag **"Illustrative (team design, not a NASA/CSA threshold)"**.

Illustrative values (for example the cut-offs for SpO2, cabin CO2, reaction time, hydration,
radiation dose, daily radiation rates and the Rover environment) are our own design choices to make
the prototype work. They are not NASA or CSA thresholds. The app shows this tag next to each of them.

## Sources & Credits

### NASA data and resources

- [NASA HRP: 5 Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/)
- [NASA HRP: Hazard - Space Radiation](https://www.nasa.gov/hrp/hazard-space-radiation/)
- [NASA HRP: Hazard - Isolation and Confinement](https://www.nasa.gov/hrp/hazard-isolation-and-confinement/)
- [NASA HRP: Hazard - Distance from Earth](https://www.nasa.gov/hrp/hazard-distance-from-earth/)
- [NASA HRP: Hazard - Gravity Fields](https://www.nasa.gov/hrp/hazard-gravity-fields/)
- [NASA HRP: Hazard - Hostile/Closed Environments](https://www.nasa.gov/hrp/hazard-hostile-closed-environments/)
- [NASA HRP: Ongoing HRP Research in Space](https://www.nasa.gov/hrp/ongoing-hrp-research/)
- [NASA: Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)](https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/)
- [NASA: Risk of Spaceflight-Induced Bone Changes](https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/)
- [NASA: Risk of Cardiovascular Adaptations](https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/)
- [NASA: Risk of Altered Immune System Responses](https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/)
- [NASA: Risk of Altered Sensorimotor and Vestibular Function](https://www.nasa.gov/reference/risk-of-altered-sensorimotor-and-vestibular-function/)
- [NASA: Risk from Inadequate Sleep and Irregular Schedules](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/)
- [NASA: Risk of Behavioral Conditions and Psychiatric Disorders](https://www.nasa.gov/reference/risk-of-behavioral-conditions-and-psychiatric-disorders/)
- [NASA: Risk of Radiation-Induced Cancers](https://www.nasa.gov/reference/risk-of-radiation-induced-cancers/)

### Space agency partner resources

- [CSA: Monitoring Radiation for Astronaut Health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp)

### Medical reference ranges

- [American Heart Association: Blood pressure readings](https://heart.org/bplevels)
- [Mayo Clinic: Normal resting heart rate](https://www.mayoclinic.org/healthy-lifestyle/fitness/expert-answers/heart-rate/faq-20057979)
- [Mayo Clinic: Low blood pressure (hypotension)](https://www.mayoclinic.org/diseases-conditions/hypotension/symptoms-causes/syc-20355465)
- [MedlinePlus: Blood glucose test](https://medlineplus.gov/ency/article/003482.htm)
- [Merck Manual: Fever in adults](https://merckmanuals.com/home/infections/biology-of-infectious-disease/fever-in-adults)
- [CDC MMWR: Healthy sleep duration among adults](https://www.cdc.gov/mmwr/volumes/65/wr/mm6506a1.htm)

### Open-source libraries

| Library | Used for | License |
| --- | --- | --- |
| [React](https://react.dev/) | User interface | MIT |
| [Vite](https://vite.dev/) | Development server and build | MIT |
| [TypeScript](https://www.typescriptlang.org/) | Typed JavaScript | Apache-2.0 |
| [Tailwind CSS](https://tailwindcss.com/) | Styling | MIT |
| [Recharts](https://recharts.org/) | Trend chart | MIT |
| [Lucide React](https://lucide.dev/) | Icons | ISC |

### Artwork

The human figure and the BioMatrix logo are original artwork drawn by the team from simple SVG shapes.

### Use of AI

AI tools (Anthropic Claude) were used to help research sources, plan the project and write code.
The team reviewed the content and is responsible for it.

## License

MIT, see [LICENSE](LICENSE).
