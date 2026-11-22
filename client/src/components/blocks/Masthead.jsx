import React from 'react';
import Spot from './spots.jsx';
import { Asset } from './Blocks.jsx';

/**
 * The syllabus masthead: monogram, school name, semester ribbon, and
 * "SYLLABUS for <class>".
 *
 * This is deliberately one fixed block rather than loose text, because it is
 * the part that must look identical on every sheet the school puts out. Only
 * the words and the two side pictures change; the arrangement does not.
 *
 * The monogram defaults to the school's own mark, shipped with the app as
 * the `school.monogram` asset. It is swappable like any other picture, and
 * the drawn shield below is only the fallback for when that asset is
 * missing — a sister school, say, that has not loaded its own yet.
 */

export const DEFAULT_MONOGRAM = 'school.monogram';

function FallbackShield() {
  return (
    <svg viewBox="0 0 100 110" className="monogram-fallback"
         xmlns="http://www.w3.org/2000/svg">
      <path d="M50 4 L92 18 v42 c0 24 -18 38 -42 46 C26 100 8 86 8 60 V18 Z"
            fill="#eaf4ff" stroke="#1971c2" strokeWidth="3" />
      <circle cx="50" cy="46" r="17" fill="none" stroke="#2f9e44" strokeWidth="2.5" />
      <ellipse cx="50" cy="46" rx="17" ry="7" fill="none"
               stroke="#2f9e44" strokeWidth="2" />
      <ellipse cx="50" cy="46" rx="17" ry="7" fill="none" stroke="#2f9e44"
               strokeWidth="2" transform="rotate(60 50 46)" />
      <ellipse cx="50" cy="46" rx="17" ry="7" fill="none" stroke="#2f9e44"
               strokeWidth="2" transform="rotate(120 50 46)" />
      <circle cx="50" cy="46" r="4" fill="#1971c2" />
      <path d="M14 74 h72 l-8 10 H22 Z" fill="#2f9e44" />
    </svg>
  );
}

export default function Masthead({ content = {}, assets }) {
  const {
    school = 'AL-SEHAR ACADEMY',
    term = 'FIRST SEMESTER 2026–27',
    title = 'SYLLABUS',
    forLabel = 'for',
    className = '',
    spotLeft = '',
    spotRight = 'book-stack',
    accent = '#1a5fb4',
    pill = '#7048e8',
    /* 'ribbon' is the school's printed sheet: notched banner, SYLLABUS for
       <class> on one line. 'pills' is the poster version: the term and the
       class each in their own rounded badge, stacked. */
    variant = 'ribbon',
  } = content;
  const pills = variant === 'pills';

  /* `crestAssetId` is the old name for this field. Documents saved under it
     live in the teacher's browser, not on the server, so the rename has to
     be honoured here too, not only where the server normalises a document. */
  const monogramAssetId =
    content.monogramAssetId ?? content.crestAssetId ?? DEFAULT_MONOGRAM;

  return (
    <header
      className={`masthead${pills ? ' mh-pills' : ''}`}
      style={{ '--mh': accent, '--pill': pill }}
    >
      <div className="mh-monogram">
        {monogramAssetId && assets?.[monogramAssetId]
          ? <Asset id={monogramAssetId} assets={assets} size="100%" />
          : <FallbackShield />}
      </div>

      <div className="mh-mid">
        <h1 className="mh-school">{school}</h1>

        {term && (pills ? (
          <div className="mh-term-pill">{term}</div>
        ) : (
          <div className="mh-ribbon">
            <span className="mh-ribbon-tail left" />
            <span className="mh-ribbon-body">{term}</span>
            <span className="mh-ribbon-tail right" />
          </div>
        ))}

        <div className="mh-title">
          {pills ? (
            <span className="mh-class-pill">
              {title} {className && `${forLabel} ${className}`}
            </span>
          ) : (
            <>
              <span className="mh-title-main">{title}</span>
              {className && (
                <>
                  <span className="mh-for">{forLabel}</span>
                  <span className="mh-pill">{className}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mh-spots">
        {spotLeft && <Spot id={spotLeft} size={16} />}
        {spotRight && <Spot id={spotRight} size={24} />}
      </div>
    </header>
  );
}
