import React, { useState, useEffect } from "react";
import { useScrollReveal } from "../shared/hooks";
import { ExternalLinkIcon } from "../shared/icons";

import mml2026Flyer from "../assets/symposiums/mml_2026_flyer.webp";
import mml2025Flyer from "../assets/symposiums/mml_2025_flyer.webp";
import leopoldina2024Flyer from "../assets/symposiums/leopoldina_2024_flyer.webp";
import mml2024Flyer from "../assets/symposiums/mml_2024_flyer.webp";
import mml2023Flyer from "../assets/symposiums/mml_2023_flyer.webp";
import mml2022Flyer from "../assets/symposiums/mml_2022_flyer.webp";
import mml2021bFlyer from "../assets/symposiums/mml_2021b_flyer.webp";
import mml2021aFlyer from "../assets/symposiums/mml_2021a_flyer.webp";
import mml2020Flyer from "../assets/symposiums/mml_2020_flyer.webp";

interface Symposium {
  title: string;
  edition: string;
  date: string;
  flyer: string;
  pdfUrl: string;
}

const SYMPOSIUMS: Symposium[] = [
  {
    title: "8th International Mini-Symposium on Molecular Machine Learning",
    edition: "8th MML",
    date: "January 15, 2026",
    flyer: mml2026Flyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/mml_flyer_2026.pdf",
  },
  {
    title: "7th International Mini-Symposium Molecular Machine Learning",
    edition: "7th MML",
    date: "January 16, 2025",
    flyer: mml2025Flyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/mml_flyer_2025.pdf",
  },
  {
    title: "International Leopoldina Symposium",
    edition: "Leopoldina",
    date: "March 4\u20136, 2024",
    flyer: leopoldina2024Flyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/flyer_leopoldina_2024.pdf",
  },
  {
    title: "6th International Mini-Symposium Molecular Machine Learning",
    edition: "6th MML",
    date: "January 18, 2024",
    flyer: mml2024Flyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/flyer_januar_2024.pdf",
  },
  {
    title: "5th International Mini-Symposium Molecular Machine Learning",
    edition: "5th MML",
    date: "January 19, 2023",
    flyer: mml2023Flyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/flyer_januar_2023.pdf",
  },
  {
    title: "4th International Mini-Symposium Molecular Machine Learning",
    edition: "4th MML",
    date: "January 13, 2022",
    flyer: mml2022Flyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/flyer_mml_symposium_januar_2022.pdf",
  },
  {
    title: "3rd International Mini-Symposium Molecular Machine Learning",
    edition: "3rd MML",
    date: "April 29, 2021",
    flyer: mml2021bFlyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/flyer_2021_2_s.pdf",
  },
  {
    title: "2nd International Mini-Symposium Molecular Machine Learning",
    edition: "2nd MML",
    date: "January 14, 2021",
    flyer: mml2021aFlyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/2nd_mini_symposium_on_mml_flyer.pdf",
  },
  {
    title: "1st International Mini-Symposium Molecular Machine Learning",
    edition: "1st MML",
    date: "July 9, 2020",
    flyer: mml2020Flyer,
    pdfUrl:
      "https://www.uni-muenster.de/imperia/md/content/organisch_chemisches_institut2/glorius/international_mini-symposium_on_molecular_machine_learning.pdf",
  },
];

function FlyerModal({
  symposium,
  onClose,
}: {
  symposium: Symposium;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="symp-modal-overlay" onClick={onClose}>
      <div className="symp-modal" onClick={(e) => e.stopPropagation()}>
        <button className="symp-modal__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="symp-modal__img-scroll">
          <img
            src={symposium.flyer}
            alt={symposium.title}
            className="symp-modal__img"
          />
        </div>
        <div className="symp-modal__footer">
          <span className="symp-modal__title">{symposium.title}</span>
          <a
            href={symposium.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="symp-modal__download"
          >
            Download PDF
            <ExternalLinkIcon />
          </a>
        </div>
      </div>
    </div>
  );
}

export function Symposiums() {
  const ref = useScrollReveal();
  const [modalSymposium, setModalSymposium] = useState<Symposium | null>(null);

  return (
    <section className="section" id="symposiums" ref={ref}>
      <div className="reveal">
        <div className="section__label">EVENTS</div>
        <h2 className="section__heading">Symposium Series</h2>
      </div>

      <p className="symp__intro reveal reveal-delay-1">
        Since 2020, we organize the International Mini-Symposium on Molecular
        Machine Learning (MML), bringing together leading researchers at the
        intersection of chemistry and AI.
      </p>

      <div className="symp-grid">
        {SYMPOSIUMS.map((s, i) => (
          <button
            key={s.edition}
            className={`symp-card reveal reveal-delay-${Math.min(i + 2, 8)}`}
            onClick={() => setModalSymposium(s)}
            type="button"
          >
            <div className="symp-card__img-wrap">
              <img
                src={s.flyer}
                alt={s.title}
                loading="lazy"
                decoding="async"
              />
              <div className="symp-card__zoom-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
            </div>
            <div className="symp-card__info">
              <span className="symp-card__edition">{s.edition}</span>
              <span className="symp-card__date">{s.date}</span>
            </div>
          </button>
        ))}
      </div>

      {modalSymposium && (
        <FlyerModal
          symposium={modalSymposium}
          onClose={() => setModalSymposium(null)}
        />
      )}
    </section>
  );
}
