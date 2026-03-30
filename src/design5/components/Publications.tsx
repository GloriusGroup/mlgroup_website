import React from "react";
import { useScrollReveal } from "../shared/hooks";
import type { Publication } from "../shared/types";
import publicationsData from "../../data/publications.json";

export function Publications() {
  const ref = useScrollReveal();
  const pubs = (publicationsData as Publication[])
    .slice()
    .sort((a, b) => b.year - a.year);
  const years = [...new Set(pubs.map((pub) => pub.year))];

  return (
    <section className="section" id="publications" ref={ref}>
      <div className="reveal">
        <div className="section__label">PUBLICATIONS</div>
        <h2 className="section__heading">Selected Works</h2>
      </div>
      <div className="publications-list">
        {years.map((year, groupIndex) => {
          const yearPubs = pubs.filter((pub) => pub.year === year);

          return (
            <details
              className={`pub-year-group reveal reveal-delay-${Math.min(groupIndex + 1, 10)}`}
              key={year}
              open={groupIndex < 2}
            >
              <summary className="pub-year-group__summary">
                <span className="pub-year-group__heading">
                  <span className="pub-year-group__year">{year}</span>
                  <span className="pub-year-group__count">
                    {yearPubs.length} publication{yearPubs.length === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="pub-year-group__indicator" aria-hidden="true">
                  ›
                </span>
              </summary>
              <div className="pub-year-group__items">
                {yearPubs.map((pub) => (
                  <a
                    className="pub-card"
                    key={pub.title}
                    href={pub.doi || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
                          <span className="pub-card__doi">
                            DOI &rarr;
                          </span>
                        )}
                        {pub.tags.map((tag) => (
                          <span className="pub-card__tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
