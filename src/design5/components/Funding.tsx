import { useScrollReveal } from "../shared/hooks";
import { ExternalLinkIcon } from "../shared/icons";

import spp2363Logo from "../assets/funding/spp2363.jpg";
import efrelogo from "../assets/funding/efre_eu_nrw.png";
import ercLogo from "../assets/funding/erc.jpeg";
import fciLogo from "../assets/funding/logofci.png";


interface Funder {
  name: string;
  logo: string;
  description: string;
  link?: string;
}

const FUNDERS: Funder[] = [
  {
    name: "DFG — SPP 2363",
    logo: spp2363Logo,
    description:
      'Deutsche Forschungsgemeinschaft, Priority Program "Molecular Machine Learning" (SPP 2363)',
    link: "https://uni-muenster.de/SPP2363/",
  },
  {
    name: "EFRE/JTF NRW 2021–2027",
    logo: efrelogo,
    description:
      "Projekt \"Digitaler KI-Assistent für die sichere und teilautomatisierte Aufklärung von molekularen Strukturen mittels GC-MS (AI4Mol)\" — Kofinanziert von der Europäischen Union",
  },
  {
    name: "ERC Advanced Grant",
    logo: ercLogo,
    description: "European Research Council — ERC Advanced Grant",
  },
  {
    name: "FCI Fonds der Chemischen Industrie",
    logo: fciLogo,
    description: "Fonds der Chemischen Industrie",
  }
];

export function Funding() {
  const ref = useScrollReveal();
  return (
    <section className="section" id="funding" ref={ref}>
      <div className="reveal">
        <div className="section__label">FUNDING</div>
        <h2 className="section__heading">Acknowledgements</h2>
      </div>
      <p className="funding__intro reveal reveal-delay-1">
        Generous financial support from the following organizations is gratefully
        acknowledged.
      </p>
      <div className="funding-grid">
        {FUNDERS.map((f, i) => {
          const inner = (
            <>
              <div className="funding-card__logo">
                <img src={f.logo} alt={f.name} />
              </div>
              <div className="funding-card__body">
                <h3 className="funding-card__name">
                  {f.name}
                  {f.link && (
                    <span className="funding-card__link-icon">
                      <ExternalLinkIcon />
                    </span>
                  )}
                </h3>
                <p className="funding-card__desc">{f.description}</p>
              </div>
            </>
          );

          return f.link ? (
            <a
              key={f.name}
              className={`funding-card reveal reveal-delay-${i + 2}`}
              href={f.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {inner}
            </a>
          ) : (
            <div
              key={f.name}
              className={`funding-card funding-card--static reveal reveal-delay-${i + 2}`}
            >
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
