import React from "react";
import { useScrollReveal } from "../shared/hooks";
import { EmailIcon, ExternalLinkIcon } from "../shared/icons";

export function Contact() {
  const ref = useScrollReveal();
  return (
    <section className="section" id="contact" ref={ref}>
      <div className="reveal">
        <div className="section__label">CONTACT</div>
        <h2 className="section__heading">Get in Touch</h2>
      </div>
      <div className="card contact__card reveal reveal-delay-1">
        <address className="contact__address" lang="de">
          Organisch-Chemisches Institut<br />
          Corrensstra&szlig;e 36<br />
          48149 M&uuml;nster, <span lang="en">Germany</span>
        </address>
        <div>
          <a
            className="contact__link"
            href="mailto:glorius@uni-muenster.de"
          >
            <EmailIcon />
            glorius@uni-muenster.de
          </a>
          <a
            className="contact__uni-link"
            href="https://www.uni-muenster.de/Chemie.oc/glorius/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLinkIcon />
            Glorius Lab Website
          </a>
        </div>
      </div>
    </section>
  );
}
