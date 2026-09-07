# SchoolQuest (Volksschule) — UI-Prototyp

Browser-only Lern-Quest-App für die österreichische Volksschule (Stufen 1–4) — ein
eigenständiger UI-Prototyp (Sidecar) zum Hauptprojekt **OpenAustria SchoolFlow**.

## Vision

Ein Lehrer unterrichtet Klasse 1–4 komplett mit dieser App: vollständige Inhalte
und interaktive Quests auf Basis des neuen Volksschul-Lehrplans (BGBl. II Nr. 1/2023).
Keine zusätzlichen Lehrmaterialien nötig — ausgenommen Fächer mit physischer
Betätigung (Bewegung und Sport, praktische Anteile von Technik und Design).

## Setup-Basis

- Lehrplan-Research & Spec-Grundlage: `silversurfer.openaustria.org/research/vs-lehrplan-spec/`
- MVP-Empfehlung: Deutsch + Mathematik (3.–4. Stufe) zuerst
- Rechtliches: Lehrplan-Texte sind § 7 UrhG frei; DSGVO: PII-frei, EU-Hosting

## Technischer Rahmen (wie stundenplaner)

- Kein Backend, kein Build-Step, keine Dependencies: reine HTML/CSS/JS
- localStorage-Persistenz, JSON-Import/-Export
- Deployment: automatisch via `deploy-prototypes-pages.yml` auf
  https://martinvidec.github.io/openaustria-school-flow/schoolquest/

## Status

🚧 Prototyp-Ordner angelegt — Implementierung folgt (Workflow: concept-analysis-spec).
