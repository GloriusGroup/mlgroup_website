import React from "react";
import { useScrollReveal } from "../shared/hooks";
import { ExternalLinkIcon } from "../shared/icons";
import type { Project } from "../shared/types";
import projectsData from "../../data/projects.json";
import { projectImages } from "../../data/assets/projects";

/** Resolve an image field: local filename → bundled URL, or pass through full URLs */
function resolveImage(image: string | undefined): string | undefined {
  if (!image) return undefined;
  // If it's a full URL, use it directly
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  // Otherwise look up the local filename in the static import map
  return projectImages[image] ?? undefined;
}

export function Projects() {
  const ref = useScrollReveal();
  const projects = projectsData as Project[];

  return (
    <section className="section" id="projects" ref={ref}>
      <div className="reveal">
        <div className="section__label">OPEN SOURCE</div>
        <h2 className="section__heading">GitHub Projects</h2>
      </div>
      <div className="project-grid">
        {projects.map((proj, i) => (
          <a
            className={`project-card reveal reveal-delay-${i + 1}`}
            key={proj.name}
            href={proj.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="project-card__header">
              <h3 className="project-card__name" style={{ marginLeft: 0 }}>
                {proj.name}
              </h3>
              <ExternalLinkIcon />
            </div>

            {resolveImage(proj.image) && (
              <div
                className="project-card__image-wrapper"
                style={{
                  marginTop: "0.75rem",
                  marginBottom: "0.75rem",
                  borderRadius: "6px",
                  overflow: "hidden",
                  border: "1px solid rgba(128, 128, 128, 0.2)",
                  width: "100%",
                  height: "250px",
                }}
              >
                <img
                  src={resolveImage(proj.image)}
                  alt={proj.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>
            )}

            <p className="project-card__desc">{proj.description}</p>
            <div className="project-card__meta">
              <span className="project-card__lang">
                <span className="project-card__lang-dot" />
                {proj.language}
              </span>
              <span className="project-card__license">{proj.license}</span>
            </div>
            <div className="project-card__tags">
              {proj.tags.map((tag) => (
                <span className="project-card__tag" key={tag}>{tag}</span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
