import React from "react";
import { useScrollReveal } from "../shared/hooks";
import { ExternalLinkIcon, WebsiteIcon } from "../shared/icons";
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
          <div
            className={`project-card reveal reveal-delay-${i + 1}`}
            key={proj.name}
          >
            <a
              className="project-card__header"
              href={proj.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <h3 className="project-card__name" style={{ marginLeft: 0 }}>
                {proj.name}
              </h3>
              <ExternalLinkIcon />
            </a>

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
            {proj.website && (
              <a
                href={proj.website}
                target="_blank"
                rel="noopener noreferrer"
                className="project-card__website"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  marginTop: "0.75rem",
                  padding: "0.35rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  alignSelf: "flex-start",
                  transition: "background 0.2s, color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--accent)";
                }}
              >
                <span style={{ width: "14px", height: "14px", display: "inline-flex" }}>
                  <WebsiteIcon />
                </span>
                Visit Website
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
