import React from "react";

export function Footer() {
  return (
    <footer className="footer">
      <p className="footer__text">
        &copy; {new Date().getFullYear()} Glorius Lab &mdash; Data Science Subgroup
        <span>University of <span lang="de">M&uuml;nster</span></span>
      </p>
      <div className="footer__legal">
        <a href="https://www.uni-muenster.de/Chemie.oc/en/imprint.html" target="_blank" rel="noopener noreferrer">Legal Disclosure</a>
        <span className="footer__legal-sep">&middot;</span>
        <a href="https://www.uni-muenster.de/datenschutz/en/" target="_blank" rel="noopener noreferrer">Privacy Statement</a>
        <span className="footer__legal-sep">&middot;</span>
        <a href="https://www.uni-muenster.de/de/en/barrierefreiheit.html" target="_blank" rel="noopener noreferrer">Accessibility</a>
      </div>
    </footer>
  );
}
