import React from "react";
import { useScrollReveal } from "../shared/hooks";
import type { Publication } from "../shared/types";
import publicationsData from "../../data/publications.json";

export function Publications() {
  const ref = useScrollReveal();
  const pubs = (publicationsData as Publication[])
    .slice()
    .sort((a, b) => b.year - a.year);

  return (
    <section className="section" id="publications" ref={ref}>
      <div className="reveal">
        <div className="section__label">PUBLICATIONS</div>
        <h2 className="section__heading">Selected Works</h2>
      </div>
      <div className="publications-list">
        {pubs.map((pub, i) => (
          <div
            className={`pub-card reveal reveal-delay-${Math.min(i + 1, 10)}`}
            key={pub.title}
          >
            <div className="pub-card__year">{pub.year}</div>
            <div className="pub-card__body">
              <div className="pub-card__title">{pub.title}</div>
              <div className="pub-card__authors">{pub.authors.join(", ")}</div>
              <div className="pub-card__journal">
                <em>{pub.journal}</em>
                {pub.volume && <>{" "}{pub.volume}</>}
                {pub.pages && <>, {pub.pages}</>}
              </div>
              <div className="pub-card__footer">
                {pub.doi && (
                  <a
                    className="pub-card__doi"
                    href={pub.doi}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    DOI &rarr;
                  </a>
                )}
                {pub.tags.map((tag) => (
                  <span className="pub-card__tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
