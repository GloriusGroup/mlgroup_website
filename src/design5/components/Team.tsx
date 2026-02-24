import React from "react";
import { useScrollReveal } from "../shared/hooks";
import { EmailIcon, linkIconMap } from "../shared/icons";
import { getInitials, getAvatarGradient } from "../shared/utils";
import type { Member } from "../shared/types";
import membersData from "../../data/members.json";
import { memberImages } from "../../data/assets/members";

/** Resolve an image field: local filename → bundled URL, or pass through full URLs */
function resolveImage(image: string | undefined): string | undefined {
  if (!image || !image.trim()) return undefined;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  return memberImages[image] ?? undefined;
}

function TeamCard({ member, index, useAltTheme }: { member: Member; index: number; useAltTheme: boolean }) {
  const resolvedImage = resolveImage(member.image);
  const hasImage = !!resolvedImage;

  return (
    <div
      className={`team-card reveal reveal-delay-${Math.min(index + 1, 12)}`}
    >
      <div
        className="team-card__avatar"
        style={
          hasImage ? {} : { background: getAvatarGradient(member.name, useAltTheme) }
        }
      >
        {hasImage ? (
          <img src={resolvedImage} alt={member.name} />
        ) : (
          getInitials(member.name)
        )}
      </div>
      <h3 className="team-card__name">{member.name}</h3>
      <div className="team-card__role">{member.role}</div>
      <p className="team-card__desc">{member.description}</p>
      <div className="team-card__links">
        {member.email && (
          <a
            href={`mailto:${member.email}`}
            title="Email"
            aria-label={`Email ${member.name}`}
          >
            <EmailIcon />
          </a>
        )}
        {Object.entries(member.links || {}).map(([key, url]) => {
          const Icon = linkIconMap[key];
          if (!Icon) return null;
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={key}
              aria-label={`${key} link for ${member.name}`}
            >
              <Icon />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function Team({ useAltTheme }: { useAltTheme: boolean }) {
  const ref = useScrollReveal();
  const members = membersData as Member[];

  return (
    <section className="section" id="team" ref={ref}>
      <div className="reveal">
        <div className="section__label">TEAM</div>
        <h2 className="section__heading">Our Researchers</h2>
      </div>
      <div className="team-grid">
        {members.map((m, i) => (
          <TeamCard key={m.name} member={m} index={i} useAltTheme={useAltTheme} />
        ))}
      </div>
    </section>
  );
}
