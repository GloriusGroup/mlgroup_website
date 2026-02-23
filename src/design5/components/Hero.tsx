import React from "react";

export function Hero() {
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="hero">
      <div className="hero__label">DATA SCIENCE SUBGROUP</div>
      <h1 className="hero__title">
        Machine Learning<br />
        <span className="hero__title-accent">for Chemistry</span>
      </h1>
      <p className="hero__subtitle">
        <span lang="de">Organisch-Chemisches Institut</span> &middot; University of <span lang="de">M&uuml;nster</span> &middot; Glorius Lab
      </p>
      <div className="hero__buttons">
        <a href="#projects" className="hero__btn" onClick={scrollTo("projects")}>
          Our Projects &darr;
        </a>
        <a href="#team" className="hero__btn" onClick={scrollTo("team")}>
          Meet the Team &darr;
        </a>
        <a
          href="https://github.com/GloriusGroup"
          className="hero__btn hero__btn--github"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub &#8599;
        </a>
      </div>
    </section>
  );
}
