"use client";

import Image from "next/image";
import { ContactForm } from "@/components/contact-form";
import { MitigationQuantumCanvas } from "@/components/mitigation-quantum-canvas";
import { NewsletterForm } from "@/components/newsletter-form";
import { WaitlistDialog } from "@/components/waitlist-dialog";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { IconType } from "react-icons";
import {
  HiOutlineAcademicCap,
  HiOutlineBuildingLibrary,
  HiOutlineCodeBracket,
  HiOutlineComputerDesktop,
  HiOutlineFaceSmile,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

type LandingRuntimeModule = {
  mountOnyxLanding?: () => (() => void) | null;
};

type AudienceOrbitNode = {
  id: string;
  title: string;
  description: string;
  Icon: IconType;
  angle: string;
};

type AudienceOrbit = {
  id: string;
  width: string;
  height: string;
  duration: string;
  delay: string;
  tilt: string;
  tone: "cyan" | "purple" | "yellow";
  nodes: AudienceOrbitNode[];
};

const audienceOrbits: AudienceOrbit[] = [
  {
    id: "outer",
    width: "92%",
    height: "84%",
    duration: "96s",
    delay: "-12s",
    tilt: "-8deg",
    tone: "cyan",
    nodes: [
      {
        id: "students",
        title: "Students",
        description: "Quantum Computing is rarely a topic that is addressed in school or universities. Students can learn Quantum Computing by completing modules and earn badges as a result.",
        Icon: HiOutlineFaceSmile,
        angle: "300deg",
      },
      {
        id: "cyber-specialists",
        title: "Cyber Specialists",
        description: "Cyber specialists can learn about cryptography and also use Onyx to evaluate exposure, identify weak domains, and map findings to recognized standards.",
        Icon: HiOutlineShieldCheck,
        angle: "120deg",
      },
    ],
  },
  {
    id: "middle",
    width: "70%",
    height: "62%",
    duration: "96s",
    delay: "-12s",
    tilt: "-8deg",
    tone: "purple",
    nodes: [
      {
        id: "researchers",
        title: "Researchers",
        description: "In the mitigation layer, they can benefit from understanding how defense-in-depth increases quantum attack crack time. More research coming up to include in Onyx!",
        Icon: HiOutlineAcademicCap,
        angle: "0deg",
      },
      {
        id: "critical-infrastructure",
        title: "Critical Infrastructure",
        description: "Our main target is the Operational Technology field too, where critical infrastructures can benefit from both awareness and assessment layers.",
        Icon: HiOutlineBuildingLibrary,
        angle: "180deg",
      },
    ],
  },
  {
    id: "inner",
    width: "48%",
    height: "42%",
    duration: "96s",
    delay: "-12s",
    tilt: "-8deg",
    tone: "yellow",
    nodes: [
      {
        id: "software-engineers",
        title: "Software Engineers",
        description: "Software engineers can benefit by identifying quantum-related risks in codebases and websites, or can include it within a proactive process in software maintenance.",
        Icon: HiOutlineComputerDesktop,
        angle: "60deg",
      },
      {
        id: "vibe-coders",
        title: "Vibe Coders",
        description: "Vibe coding helps people build faster, but security posture can be unclear. General AI may miss quantum-security risks if users do not know to ask.",
        Icon: HiOutlineCodeBracket,
        angle: "240deg",
      },
    ],
  },
];

const audienceNodes = audienceOrbits.flatMap((orbit) => orbit.nodes);
let hasLoggedConsoleGreeting = false;

// Display order for the mobile target-user cards: lead with Students, then
// Vibe Coders, followed by the remaining audiences.
const audienceCardOrder = [
  "students",
  "vibe-coders",
  "cyber-specialists",
  "researchers",
  "critical-infrastructure",
  "software-engineers",
];
const audienceCards = audienceCardOrder
  .map((id) => audienceNodes.find((node) => node.id === id))
  .filter((node): node is (typeof audienceNodes)[number] => Boolean(node));

// Each orbit circle gets its own accent tone (cyan / purple / yellow) so the
// ring of audiences reads as three alternating colors instead of one navy.
// Tones rotate around the circle so neighboring nodes never share a color, and
// the hovered audience's focus label adopts the same tone.
type AudienceTone = "cyan" | "purple" | "yellow";
const audienceToneById: Record<string, AudienceTone> = {
  "cyber-specialists": "cyan",
  "critical-infrastructure": "purple",
  "vibe-coders": "yellow",
  students: "cyan",
  researchers: "purple",
  "software-engineers": "yellow",
};
const audienceToneFor = (id: string): AudienceTone => audienceToneById[id] ?? "cyan";

type MitigationSlide = {
  id: string;
  title: string;
  description: string;
  cta: string;
};

const mitigationSlides: MitigationSlide[] = [
  {
    id: "awareness",
    title: "Demo Prototype",
    description:
      "You can take a look how defense-in-depth cryptographic flow works when a message is sent from one person to another.",
    cta: "Join Waitlist",
  },
  {
    id: "algorithm",
    title: "Layered by Design",
    description:
      "You can adjust the control settings and see how different algorithm factors influence defense strength, classical attack difficulty, and quantum attack difficulty.",
    cta: "Join Waitlist",
  },
  {
    id: "try",
    title: "Run the Code",
    description:
      "Try the code yourself and see how each defensive layer strengthens resistance against quantum attacks, with examples available in two programming languages.",
    cta: "Join Waitlist",
  },
];

export default function LandingPage() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [activeAudienceId, setActiveAudienceId] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [anchorJumping, setAnchorJumping] = useState(false);
  const faqTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorJumpTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readinessSectionRef = useRef<HTMLElement | null>(null);
  const readinessAnimationFrameRef = useRef<number | null>(null);
  const readinessHasAnimatedRef = useRef(false);
  const [readinessValues, setReadinessValues] = useState<[number, number]>([0, 0]);
  const [readinessVisible, setReadinessVisible] = useState(false);
  const [mitigationSlide, setMitigationSlide] = useState(0);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const mitigationSlideCount = mitigationSlides.length;
  const activeMitigationSlide = mitigationSlides[mitigationSlide];

  const goToMitigationSlide = (index: number) => {
    setMitigationSlide(((index % mitigationSlideCount) + mitigationSlideCount) % mitigationSlideCount);
  };

  const openWaitlist = () => {
    setWaitlistOpen(true);
  };

  const faqs = [
    {
      question: "Why Onyx?",
      answer:
        "Google warns that quantum threats may arrive sooner than expected by 2029, while NIST has pushed organizations to begin urgent migration toward Post-Quantum Cryptography with milestones around 2030 and 2035. Hence, quantum security is no longer just a prediction, but a migration challenge that must be addressed now. There are a few platforms that clearly address this issue. That is why Onyx connects awareness, assessment, and mitigation in one platform for both individuals and organizations to be ready for the quantum era.",
    },
       {
      question: "If quantum computers are not here yet, why should I care now?",
      answer:
        "There is a threat known as ‘Harvest Now, Decrypt Later’ (HNDL), where sensitive data can be collected today and decrypted later once powerful quantum computers become available. This means the risk does not start only when quantum computers arrive. Preparation also takes time; organizations need to identify where vulnerable cryptography is used, understand which systems are exposed, and prioritize what matters. This is especially true for legacy IT and OT environments, where it is a multi-year proactive process to upgrade. Additionally, 48% of surveyed organizations are unprepared, as reported by Keyfactor in 2025. This shows that there is a clear readiness gap, and simultaneously, NIST’s transition guidance signals that widely used public-key algorithms such as RSA and ECC are moving toward deprecation around 2030 and disallowance by 2035.",
    },
     {
      question: "Why does Onyx assess both IT and OT environments?",
      answer:
        "Quantum risks do not just affect traditional IT. In fact, CISA has highlighted that Operational Technology (OT) and Industrial Control Systems (ICS) may face long-term risks from quantum computing, and migrating these environments to post-quantum cryptography is a multi-year process. This is because OT environments often rely on legacy systems which are difficult to patch or replace; hence, dealing with it is not a reactive process, but rather a long, proactive process. Onyx is unique because it is an OT-aware quantum resilience platform, not just focusing on IT. It rather helps individuals and organizations assess IT and OT exposure early, without storing sensitive data, so they can plan migration before quantum threats become urgent.",
    },
    {
      question: "Can’t I just ask an AI agent to check my code, website, or crypto risks?",
      answer:
        "Yes, but a general AI agent depends on you knowing exactly what to ask. Thus, if you are unaware of quantum-security risks, you may miss important issues in your code, website, cryptography, OT environment, or migration plan. In fact, according to ISACA, 37% of organizations have not discussed quantum computing at all, while 24% do not know how their organization views it. This becomes even riskier with the rise of vibe coding, where code can be generated quickly without always considering long-term security risks. Onyx is built specifically for quantum readiness. It guides you through the areas that matter, identifies weak points, provides standards-aligned recommendations, and suggests practical mitigation steps with a clear migration timeline. Instead of starting from a blank prompt, you can simply upload source code, enter a website URL, or answer a structured set of questions. Onyx is also especially relevant for OT environments, where systems are safety-critical, legacy-heavy, and cannot be treated like normal software projects. It is also designed with privacy in mind, so assessments can be completed without sending raw code, website data, or assessment details to a general AI chatbot.",
    },

    {
      question: "What will I benefit from the mitigation layer?",
      answer:
        "Our platform proposes a defense-in-depth approach that users can benefit from. We do not replace ML-KEM or ML-DSA, which are standardized post-quantum mechanisms for key exchange and digital signatures. In real systems, especially in legacy systems, IT and OT systems, migration to PQC is not easily supported because of performance, memory, bandwidth, and compatibility challenges. Hence, Onyx supports both modern and legacy IT and OT environments, by reducing exposure while preparing for full post-quantum migration.",
    },
  ];

  const readinessRingRadius = 68;
  const readinessRingCircumference = 2 * Math.PI * readinessRingRadius;
  const activeAudience = activeAudienceId === null ? null : audienceNodes.find((audience) => audience.id === activeAudienceId) ?? null;
  const invertAngle = (value: string) => (value.startsWith("-") ? value.slice(1) : `-${value}`);

  useEffect(() => {
    if (hasLoggedConsoleGreeting) return;
    hasLoggedConsoleGreeting = true;
    console.log(
      "Hai! Enjoying the website so far? Don't forget to join the waitlist! :)",
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only the desktop (>1080px) layout is a scroll-scrubbed canvas narrative.
    // Restoring a mid-sequence scroll position on refresh makes the runtime snap
    // through layers while it boots (a ~1s flash). Always begin at the hero unless
    // deep-linking a section. The mobile/tablet layout is a normal stacked
    // document, so its native scroll restoration is left untouched.
    if (window.innerWidth <= 1080) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (faqTransitionTimeoutRef.current) {
        clearTimeout(faqTransitionTimeoutRef.current);
      }
      if (anchorJumpTimeoutRef.current) {
        clearTimeout(anchorJumpTimeoutRef.current);
      }
      if (readinessAnimationFrameRef.current) {
        cancelAnimationFrame(readinessAnimationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const section = readinessSectionRef.current;
    if (!section) return;

    const animateReadiness = () => {
      setReadinessVisible(true);
      const startAt = performance.now();
      const duration = 1500;

      const step = (now: number) => {
        const progress = Math.min((now - startAt) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setReadinessValues([Math.round(48 * eased), Math.round(56 * eased)]);

        if (progress < 1) {
          readinessAnimationFrameRef.current = requestAnimationFrame(step);
        } else {
          readinessAnimationFrameRef.current = null;
          setReadinessValues([48, 56]);
        }
      };

      readinessAnimationFrameRef.current = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || readinessHasAnimatedRef.current) return;
        readinessHasAnimatedRef.current = true;
        animateReadiness();
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let landingCleanup: null | (() => void) = null;
    const reducedHeroMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resetSceneMount = () => {
      const sceneMount = document.getElementById("scene");
      if (!sceneMount) return;
      sceneMount.dataset.ready = "false";
      sceneMount.replaceChildren();
    };

    const mountLanding = async () => {
      setSceneReady(true);
      resetSceneMount();
      if (reducedHeroMotion) return;
      try {
        const landingRuntime = (await import("@/lib/onyx-landing-runtime")) as LandingRuntimeModule;
        if (cancelled) return;
        landingCleanup =
          typeof landingRuntime.mountOnyxLanding === "function" ? landingRuntime.mountOnyxLanding() : null;
      } catch {
        if (!cancelled) {
          setSceneReady(true);
        }
      }
    };

    void mountLanding();

    return () => {
      cancelled = true;
      landingCleanup?.();
      resetSceneMount();
    };
  }, []);

  const handleFaqToggle = (index: number) => {
    if (faqTransitionTimeoutRef.current) {
      clearTimeout(faqTransitionTimeoutRef.current);
      faqTransitionTimeoutRef.current = null;
    }

    if (openFaqIndex === index) {
      setOpenFaqIndex(null);
      return;
    }

    if (openFaqIndex !== null) {
      setOpenFaqIndex(null);
      faqTransitionTimeoutRef.current = setTimeout(() => {
        setOpenFaqIndex(index);
        faqTransitionTimeoutRef.current = null;
      }, 240);
      return;
    }

    setOpenFaqIndex(index);
  };

  const handleAnchorJump = (event?: MouseEvent<HTMLElement>) => {
    const target = event?.target instanceof Element ? event.target : null;
    const link = target?.closest('a[href^="#"]');
    if (event && (!link || link.getAttribute("href") === "#top")) {
      return;
    }

    setAnchorJumping(true);
    if (anchorJumpTimeoutRef.current) {
      clearTimeout(anchorJumpTimeoutRef.current);
    }
    anchorJumpTimeoutRef.current = setTimeout(() => {
      setAnchorJumping(false);
      anchorJumpTimeoutRef.current = null;
    }, 820);
  };

  return (
    <>
      <main className={`landing-page${sceneReady ? " is-scene-ready" : ""}${anchorJumping ? " is-anchor-jumping" : ""}`}>
        <nav className="nav" onClickCapture={handleAnchorJump}>
          <div className="nav-inner">
            <a className="brand" href="#top">
              <Image
                className="brand__logo"
                src="/logo/onyx-logo-horizontal-white-transparent.png"
                alt="Onyx"
                width={666}
                height={375}
                priority
              />
            </a>
            <ul className="nav-links">
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#faqs">FAQs</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
            <button className="btn-cta" type="button" onClick={openWaitlist}>
              Join Waitlist
            </button>
          </div>
        </nav>

        <div id="scene"></div>
        <div className="post-faq-nebula" id="postFaqNebula" aria-hidden="true" />

        <div className="scroll-space" id="top">
          <div className="text-left" id="heroText">
            <h2>ONYX</h2>
            <h1>Quantum-Ready Security</h1>
            <p>Preparing organizations for the quantum era through awareness, assessment, and defense-in-depth mitigation.</p>
            <button id="heroLoginButton" type="button" onClick={openWaitlist}>
              Join Waitlist
            </button>
          </div>

          <div className="text-left" id="matrixText">
            {/* <h2>Post-Quantum Era</h2> */}
            <h1>What happens when quantum attacks arrive?</h1>
            <p>Vulnerable encryption may no longer protect your data, identities, and critical systems.</p>
          </div>

          <div className="text-center" id="breachText">
            {/* <h2>Quantum Breach Detected</h2> */}
            <h1>The Encryption Fails</h1>
          </div>

          <div className="text-center" id="finalText">
            <h1>It’s Over.</h1>
          </div>

          <div className="text-center" id="preventText">
            <h2>So, how can you prepare?</h2>
            <h1>Start with risk. Leave with a plan. </h1>
          </div>

          <div className="services" id="servicesRow">
            <article className="service-card">
              <h3>Assess Quantum Risks</h3>
              <p>You can check your website, code, or questionnaire answers to see where quantum-related risks may appear.</p>
            </article>
            <article className="service-card">
              <h3>Score Your Readiness</h3>
              <p>Based on that, you receive a quantum readiness score and get clear standards-supported guidance on what to do next. </p>
              <p> </p>
            </article>
            <article className="service-card">
              <h3>Try Mitigation Strategies</h3>
              <p>Finally, you can try defense-in-depth strategies and see how they can support post-quantum resilience.</p>
            </article>
          </div>

          <div className="landing-narrative-spacer" aria-hidden="true" />

          <div className="landing-sections">
            <section ref={readinessSectionRef} className="readiness-section" aria-label="Quantum readiness findings">
              <div className={`readiness-grid${readinessVisible ? " is-visible" : ""}`}>
                <article className="readiness-card readiness-card--stat readiness-card--stat-a">
                  <div className="readiness-card__ring" aria-hidden="true">
                    <svg viewBox="0 0 160 160" role="presentation">
                      <defs>
                        <linearGradient id="readinessGradientLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3a4300" />
                          <stop offset="34%" stopColor="#fdffc6" />
                          <stop offset="72%" stopColor="#784ed4" />
                          <stop offset="100%" stopColor="#82e9ff" />
                        </linearGradient>
                      </defs>
                      <circle className="readiness-card__ring-track" cx="80" cy="80" r={readinessRingRadius} />
                      <circle
                        className="readiness-card__ring-progress readiness-card__ring-progress--left"
                        cx="80"
                        cy="80"
                        r={readinessRingRadius}
                        strokeDasharray={readinessRingCircumference}
                        strokeDashoffset={readinessRingCircumference * (1 - readinessValues[0] / 100)}
                      />
                    </svg>
                    <div className="readiness-card__ring-value">{readinessValues[0]}%</div>
                  </div>

                  <div className="readiness-card__content readiness-card__content--stat">
                    <p className="readiness-card__statement">
                      <span>Organizations are not prepared for quantum cybersecurity challenges</span>
                    </p>
                  </div>

                  <div className="readiness-card__meta">
                    {/* <span className="readiness-card__tag">Keyfactor</span> */}
                    <span className="readiness-card__source">Keyfactor PQC report, 2025</span>
                  </div>
                </article>

                <article className="readiness-card readiness-card--quote">
                  {/* <div className="readiness-card__eyebrow">Multi-year process</div> */}

                  <div className="readiness-card__content">
                    <p className="readiness-card__quote">
              
                        &ldquo;The transition to post-quantum cryptography will be a complex, multi-year process. OT owners 
                        and operators cannot wait until the advent of a CRQC to develop and implement a plan.&rdquo;
                    </p>
                  </div>

                  <div className="readiness-card__meta">
                    {/* <span className="readiness-card__tag">CISA</span> */}
                    <span className="readiness-card__source">
                      CISA Post-Quantum Considerations for Operational Technology, Oct. 2024
                    </span>
                  </div>
                </article>

                <article className="readiness-card readiness-card--stat readiness-card--stat-b">
                  <div className="readiness-card__ring" aria-hidden="true">
                    <svg viewBox="0 0 160 160" role="presentation">
                      <defs>
                        <linearGradient id="readinessGradientRight" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#13274d" />
                          <stop offset="32%" stopColor="#fdffc6" />
                          <stop offset="70%" stopColor="#784ed4" />
                          <stop offset="100%" stopColor="#82e9ff" />
                        </linearGradient>
                      </defs>
                      <circle className="readiness-card__ring-track" cx="80" cy="80" r={readinessRingRadius} />
                      <circle
                        className="readiness-card__ring-progress readiness-card__ring-progress--right"
                        cx="80"
                        cy="80"
                        r={readinessRingRadius}
                        strokeDasharray={readinessRingCircumference}
                        strokeDashoffset={readinessRingCircumference * (1 - readinessValues[1] / 100)}
                      />
                    </svg>
                    <div className="readiness-card__ring-value">{readinessValues[1]}%</div>
                  </div>

                  <div className="readiness-card__content readiness-card__content--stat">
                    <p className="readiness-card__statement">
                      <span className="readiness-card__statement-title">Mid-sized orgs are not ready for quantum cybersecurity challenges</span>
                    
                    </p>
                  </div>

                  <div className="readiness-card__meta">
                    {/* <span className="readiness-card__tag">Keyfactor</span> */}
                    <span className="readiness-card__source">Keyfactor PQC report, 2025</span>
                  </div>
                </article>
              </div>
            </section>

            <section className="audience-section" id="audience" aria-label="Target users">
              <div className="audience-section__intro">
                <h2 className="audience-section__title">
                  <span className="audience-section__title-target">Target</span>{" "}
                  <span className="audience-section__title-users">Users</span>
                </h2>
                <span className="audience-section__rule" aria-hidden="true" />
                <p className="audience-section__copy">
                  Onyx is built for <strong>people who code</strong>, teams working
                  with <strong>Operational Technology (OT)</strong>, and anyone who
                  wants to understand <strong>quantum cyber risks</strong>.
                </p>
                <div className="audience-section__focus">
                  <span
                    className={`audience-section__focus-label${
                      activeAudience ? ` audience-section__focus-label--${audienceToneFor(activeAudience.id)}` : ""
                    }`}
                  >
                    {activeAudience ? activeAudience.title : "See who Onyx supports"}
                  </span>
                  <p>
                    {activeAudience
                      ? activeAudience.description
                      : "Hover over each target to learn how Onyx can support different users and teams."}
                  </p>
                </div>
              </div>

              <div className="audience-orbit" onMouseLeave={() => setActiveAudienceId(null)}>
                <div className="audience-orbit__bullseye" aria-hidden="true">
                  <span className="audience-orbit__ring audience-orbit__ring--outer" />
                  <span className="audience-orbit__ring audience-orbit__ring--mid" />
                  <span className="audience-orbit__ring audience-orbit__ring--inner" />
                  <span className="audience-orbit__ring audience-orbit__ring--core" />
                  <span className="audience-orbit__center" />
                </div>

                {audienceOrbits.map((orbit) => {
                  const isOrbitActive = orbit.nodes.some((audience) => audience.id === activeAudienceId);

                  return (
                    <div
                      key={orbit.id}
                      className={`audience-orbit__lane audience-orbit__lane--${orbit.tone}${isOrbitActive ? " is-active" : ""}`}
                      style={
                        {
                          "--orbit-width": orbit.width,
                          "--orbit-height": orbit.height,
                          "--orbit-duration": orbit.duration,
                          "--orbit-delay": orbit.delay,
                          "--orbit-tilt": orbit.tilt,
                          "--orbit-start-angle": "0deg",
                          "--orbit-counter-tilt": invertAngle(orbit.tilt),
                          "--orbit-counter-start-angle": "0deg",
                        } as CSSProperties
                      }
                    >
                      <div className="audience-orbit__lane-spin">
                        <span className="audience-orbit__lane-ring" aria-hidden="true" />

                        {orbit.nodes.map((audience) => {
                          const AudienceIcon = audience.Icon;
                          const isActive = activeAudienceId === audience.id;

                          return (
                            <div
                              key={audience.id}
                              className={`audience-orbit__slot${isActive ? " is-active" : ""}`}
                              style={
                                {
                                  "--orbit-slot-angle": audience.angle,
                                  "--orbit-slot-counter-angle": invertAngle(audience.angle),
                                } as CSSProperties
                              }
                            >
                              <span className="audience-orbit__slot-beam" aria-hidden="true" />

                              <button
                                className={`audience-node audience-node--${audienceToneFor(audience.id)}${isActive ? " is-active" : ""}`}
                                type="button"
                                aria-pressed={isActive}
                                aria-label={`${audience.title}. ${audience.description}`}
                                onMouseEnter={() => setActiveAudienceId(audience.id)}
                                onMouseLeave={() => setActiveAudienceId((current) => (current === audience.id ? null : current))}
                                onFocus={() => setActiveAudienceId(audience.id)}
                                onBlur={() => setActiveAudienceId((current) => (current === audience.id ? null : current))}
                                onClick={() => setActiveAudienceId((current) => (current === audience.id ? null : audience.id))}
                              >
                                <span className="audience-node__counter">
                                  <span className="audience-node__content">
                                    <span className="audience-node__icon-shell" aria-hidden="true">
                                      <span className="audience-node__icon-ring" />
                                      <AudienceIcon className="audience-node__icon" />
                                    </span>
                                    <span className="audience-node__label">{audience.title}</span>
                                  </span>
                                </span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <ul className="audience-cards" aria-label="Target users">
                {audienceCards.map((audience, index) => {
                  const AudienceIcon = audience.Icon;
                  const tone = (["cyan", "purple", "yellow"] as const)[index % 3];

                  return (
                    <li className={`audience-card audience-card--${tone}`} key={audience.id}>
                      <span className="audience-card__icon-shell" aria-hidden="true">
                        <AudienceIcon className="audience-card__icon" />
                      </span>
                      <span className="audience-card__label">{audience.title}</span>
                      <p className="audience-card__description">{audience.description}</p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="feature-stage" id="features" aria-label="Onyx features timeline">
              <div className="feature-stage__header" aria-label="Features">
                <span>F</span>
                <span>E</span>
                <span>A</span>
                <span>T</span>
                <span>U</span>
                <span>R</span>
                <span>E</span>
                <span>S</span>
              </div>

              <aside className="feature-stage__rail-shell" id="featureRailShell">
                <div className="feature-stage__rail" id="featureRail">
                  <div className="feature-rail">
                    <div className="feature-rail__line" aria-hidden="true">
                      <span className="feature-rail-fill" />
                    </div>
                    <div className="feature-rail__items" aria-label="Feature progress">
                      <div className="feature-rail__item is-active" data-feature-indicator="0" aria-label="Awareness Level" />
                      <div className="feature-rail__item" data-feature-indicator="1" aria-label="Assessment Level" />
                      <div className="feature-rail__item" data-feature-indicator="2" aria-label="Mitigation Layer" />
                    </div>
                  </div>
                </div>
              </aside>

              <div className="feature-stage__steps">
                <article className="feature-step feature-step--awareness" data-feature-step="0" aria-label="Awareness Level">
                  <div className="feature-awareness-showcase">
                    <div className="feature-awareness-intro">
                      <h3>Understand the Risk</h3>
                      <span className="feature-awareness-rule" aria-hidden="true" />
                      <p>
                        Learn <span className="accent-purple">Quantum & OT</span>. Discover <span className="accent-purple">Standards</span>.
                        <br />
                        Explore simulations & stay up-to-date.
                      </p>
                    </div>

                    <div className="feature-badge-scene">
                      <div className="feature-badge-shell">
                        <span className="feature-badge-shine" aria-hidden="true" />
                        <Image
                          className="feature-badge-image"
                          src="/landing/landingpage-badge.png"
                          alt="Onyx Module Certificate badge"
                          width={518}
                          height={788}
                          priority
                        />
                      </div>
                    </div>

                    <div className="feature-awareness-preview">
                      <Image
                        className="feature-awareness-image"
                        src="/landing/awareness-learning-hub-wide.png"
                        alt="Awareness level learning hub interface"
                        width={1800}
                        height={1019}
                        sizes="(max-width: 1080px) 92vw, 66vw"
                      />
                    </div>
                  </div>
                </article>

                <article className="feature-step feature-step--assessment" data-feature-step="1" aria-label="Assessment Level">
                  <div className="feature-step__media feature-assessment-media">
                    <Image
                      src="/landing/laptop-ui.png"
                      alt="Assessment level questionnaire shown on a laptop"
                      fill
                      sizes="(max-width: 1080px) 100vw, 36vw"
                    />
                  </div>
                  <div className="feature-step__content feature-assessment-content">
                    <h3>
                      Find Your Exposure
                    </h3>
                    <span className="feature-assessment-rule" aria-hidden="true" />
                    <p>
                      Sandboxed assessment sessions let you test your website or code and get a standards-guided recommendation.{" "}
                      <span className="feature-assessment-privacy"> Your raw code files and website scan data are not stored after the session.</span>
                    </p>
                    <div className="feature-assessment-grid">
                      <article className="feature-assessment-card feature-assessment-card--questionnaire">
                        <span className="feature-assessment-card__number">01</span>
                        <span className="feature-assessment-card__divider" aria-hidden="true" />
                        <span className="feature-assessment-card__figure feature-assessment-card__figure--dots" aria-hidden="true" />
                        <div className="feature-assessment-card__copy">
                          <strong>Website &amp; Code Check</strong>
                          <p>Check code or a website URL for security and quantum-readiness gaps</p>
                        </div>
                      </article>
                      <article className="feature-assessment-card feature-assessment-card--checks">
                        <span className="feature-assessment-card__number">02</span>
                        <span className="feature-assessment-card__divider" aria-hidden="true" />
                        <span className="feature-assessment-card__figure feature-assessment-card__figure--waves" aria-hidden="true">
                          <svg viewBox="0 0 310 120" focusable="false">
                            <path d="M-10 76 C 46 28, 90 24, 145 62 S 238 104, 320 48" />
                            <path d="M-10 88 C 46 40, 92 38, 146 72 S 236 114, 320 60" />
                            <path d="M-10 100 C 44 54, 92 52, 146 84 S 236 126, 320 74" />
                            <path d="M-10 112 C 42 68, 92 66, 146 96 S 236 138, 320 88" />
                          </svg>
                        </span>
                        <div className="feature-assessment-card__copy">
                          <strong>AI-Guided Questionnaire</strong>
                          <p> Prefer not to upload code? Answer questions and get an AI-powered recommendation.</p>
                        </div>
                      </article>
                      <article className="feature-assessment-card feature-assessment-card--coverage">
                        <span className="feature-assessment-card__number">03</span>
                        <span className="feature-assessment-card__divider" aria-hidden="true" />
                        <span className="feature-assessment-card__figure feature-assessment-card__figure--flow" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                          <span />
                        </span>
                        <div className="feature-assessment-card__copy">
                          <strong>IT &amp; OT Coverage</strong>
                          <p>Supports both IT systems and Purdue-style OT environments.</p>
                        </div>
                      </article>
                      <article className="feature-assessment-card feature-assessment-card--recommendations">
                        <span className="feature-assessment-card__number">04</span>
                        <span className="feature-assessment-card__divider" aria-hidden="true" />
                        <span className="feature-assessment-card__figure feature-assessment-card__figure--orbit" aria-hidden="true">
                          <span className="feature-assessment-orbit__ring feature-assessment-orbit__ring--outer" />
                          <span className="feature-assessment-orbit__ring feature-assessment-orbit__ring--middle" />
                          <span className="feature-assessment-orbit__ring feature-assessment-orbit__ring--inner" />
                          <span className="feature-assessment-orbit__dot" />
                        </span>
                        <div className="feature-assessment-card__copy">
                          <strong>Private by Design</strong>
                          <p>AI uses summarized assessment signals only, never raw code, scan data, or secrets. </p>
                        </div>
                      </article>
                    </div>
                  </div>
                </article>

                <article className="feature-step feature-step--mitigation" data-feature-step="2" aria-label="Mitigation Layer">
                  <div className="feature-step__content feature-mitigation-content feature-mitigation-hud">
                    <h3>Layered Mitigation in Action</h3>
                    <span className="feature-mitigation-rule" aria-hidden="true" />
                    <p className="feature-mitigation-hud__subtitle">
                      You can explore a <span className="accent-cyan">defense-in-depth simulation</span> and see how
                      different <span className="accent-cyan">mitigation layers</span> can strengthen quantum readiness.
                    </p>

                    <div
                      className="feature-mitigation-hud__panel"
                      role="group"
                      aria-roledescription="carousel"
                      aria-label="Defense-in-depth steps"
                    >
                      <span className="feature-mitigation-hud__ticks feature-mitigation-hud__ticks--tr" aria-hidden="true" />
                      <span className="feature-mitigation-hud__ticks feature-mitigation-hud__ticks--bl" aria-hidden="true" />
                      <span className="feature-mitigation-hud__scan" aria-hidden="true" />

                      <div className="feature-mitigation-hud__topbar">
                        <span className="feature-mitigation-hud__step">
                          {String(mitigationSlide + 1).padStart(2, "0")}
                          <i aria-hidden="true">/</i>
                          {String(mitigationSlideCount).padStart(2, "0")}
                        </span>
                      </div>

                      <div className="feature-mitigation-hud__body" key={activeMitigationSlide.id}>
                        <h4 className="feature-mitigation-hud__title">{activeMitigationSlide.title}</h4>
                        <p className="feature-mitigation-hud__desc">{activeMitigationSlide.description}</p>
                        <button
                          type="button"
                          className="feature-mitigation-hud__cta"
                          onClick={openWaitlist}
                        >
                          <span>{activeMitigationSlide.cta}</span>
                        </button>
                      </div>

                      <div className="feature-mitigation-hud__nav">
                        <button
                          type="button"
                          className="feature-mitigation-hud__arrow"
                          onClick={() => goToMitigationSlide(mitigationSlide - 1)}
                          aria-label="Previous step"
                        >
                          &#8249;
                        </button>
                        <button
                          type="button"
                          className="feature-mitigation-hud__arrow"
                          onClick={() => goToMitigationSlide(mitigationSlide + 1)}
                          aria-label="Next step"
                        >
                          &#8250;
                        </button>
                      </div>

                      <span className="feature-mitigation-hud__wire" aria-hidden="true" />
                    </div>
                  </div>
                  <MitigationQuantumCanvas className="feature-step__media mitigation-quantum" activeLayer={mitigationSlide} />
                </article>
              </div>
            </section>

            <section className="secure-section" aria-label="Security compliance standards">
              <div className="secure-section__inner">
                {/* <span className="section-kicker secure-section__kicker">SECURITY-ALIGNED BY DESIGN</span> */}
                <h2 className="secure-section__statement">
                  <span>
                    ONYX IS DEVELOPED WITH GUIDANCE FROM RECOGNIZED CYBERSECURITY FRAMEWORKS AND SECURE ENGINEERING
                    PRACTICES
                  </span>
                </h2>

                <div className="secure-section__logos" aria-label="Industry standards and framework logos">
                  <div className="secure-section__logo secure-section__logo--nist">
                    <Image
                      src="/landing/nist-logo.webp"
                      alt="NIST logo"
                      width={410}
                      height={149}
                      sizes="(max-width: 900px) 128px, 160px"
                    />
                  </div>
                  <div className="secure-section__logo secure-section__logo--owasp">
                    <Image
                      src="/landing/owasp-logo-white.png"
                      alt="OWASP logo"
                      width={2667}
                      height={817}
                      sizes="(max-width: 900px) 120px, 150px"
                    />
                  </div>
                  <div className="secure-section__logo secure-section__logo--iso">
                    <Image
                      src="/landing/iso-logo-white.png"
                      alt="ISO logo"
                      width={600}
                      height={575}
                      sizes="(max-width: 900px) 70px, 90px"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="faq-section" id="faqs">
              <h2 className="section-title">FAQ</h2>
              <div className="faq-list">
                {faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;

                  return (
                    <article key={faq.question} className={`faq-item${isOpen ? " is-open" : ""}`}>
                      <button
                        className="faq-item__trigger"
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => handleFaqToggle(index)}
                      >
                        <span>{faq.question}</span>
                        <span className="faq-item__icon" aria-hidden="true">
                          ⌄
                        </span>
                      </button>
                      <div className="faq-item__panel">
                        <div className="faq-item__panel-inner">
                          <p>{faq.answer}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="ready-section">
              <h2 className="section-title">Ready for the Future?</h2>
              <p className="section-copy">
                Seen enough of what Onyx can do? Come aboard and
                 join Onyx to get a look at the platform, explore the assessment experience, and start preparing early.
              </p>
              <div className="cta-actions">
                <button className="btn-grad" type="button" onClick={openWaitlist}>
                  Join Waitlist
                </button>
                <a className="btn-outline" href="#features">
                  Explore Features
                </a>
              </div>
            </section>

            <section className="contact-section" id="contact">
              <div className="contact-shell">
                <div className="contact-intro">
                  <h2 className="section-title">Get in touch</h2>
                  <p className="section-copy">
                       Have a question or collaboration idea? Feel free to drop us a message.
                  </p>
                </div>

                <ContactForm />
              </div>
            </section>
          </div>

          <footer className="footer-floor">
            <div className="footer-floor__inner">
              <div className="footer-floor__meta">
                <Image
                  className="footer-floor__brand"
                  src="/logo/onyx-logo-horizontal-white-transparent.png"
                  alt="Onyx"
                  width={220}
                  height={52}
                />
                <h3>Build toward quantum resilience with clarity.</h3>
               
                <div className="footer-floor__nav">
                  <div className="footer-floor__column">
                    <strong>Explore</strong>
                    <a href="#features">Features</a>
                    <a href="#faqs">FAQs</a>
                    <a href="#contact">Contact</a>
                  </div>
                </div>
              </div>

              <div className="newsletter-panel">
                <h3>Newsletter</h3>
                <p>Leave your email to receive product updates, release notes, and new platform highlights.</p>
                <NewsletterForm />
              </div>
            </div>

            <div className="footer-floor__copyright">
              © 2026 Onyx. All rights reserved.
            </div>
          </footer>
        </div>
        <WaitlistDialog open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
      </main>
    </>
  );
}
