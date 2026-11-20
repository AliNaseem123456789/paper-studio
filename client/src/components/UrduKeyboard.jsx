import React, { useEffect, useRef, useState } from 'react';

/**
 * On-screen Urdu keyboard.
 *
 * Types into whichever input or textarea was last focused, so it works for
 * every Urdu field in the app without each one knowing about it. Teachers
 * without an Urdu layout installed can still fix a letter.
 *
 * Layout follows the standard Urdu phonetic arrangement, which is what most
 * people in Pakistan recognise.
 */

const ROWS = [
  ['ق', 'و', 'ع', 'ر', 'ت', 'ے', 'ء', 'ی', 'ہ', 'پ'],
  ['ا', 'س', 'د', 'ف', 'گ', 'ح', 'ج', 'ک', 'ل'],
  ['ز', 'ش', 'چ', 'ط', 'ب', 'ن', 'م', '،', '۔'],
  ['ژ', 'ص', 'ض', 'غ', 'ث', 'ذ', 'خ', 'ظ'],
  ['ٹ', 'ڈ', 'ڑ', 'ں', 'ھ', 'آ', 'ؤ', 'ئ', 'ة'],
];

// Marks sit apart: they attach to the letter before them.
const MARKS = ['َ', 'ِ', 'ُ', 'ً', 'ٍ', 'ٌ', 'ّ', 'ْ', 'ٰ'];

const DIGITS = ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹', '۰'];

/** The zero-width non-joiner, for breaking a ligature. */
const ZWNJ = '‌';

export default function UrduKeyboard({ onClose }) {
  const [showMarks, setShowMarks] = useState(false);
  const target = useRef(null);
  const [targetName, setTargetName] = useState('');

  /* Remember the last text field the teacher was in. The keyboard's own
     buttons must not steal it, so mousedown is prevented on the panel. */
  useEffect(() => {
    const onFocus = (e) => {
      const el = e.target;
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') {
        if (el.closest('.urdu-kb')) return;
        target.current = el;
        const label = el.closest('label')?.childNodes?.[0]?.textContent?.trim();
        setTargetName(label || el.placeholder || 'the selected field');
      }
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, []);

  /**
   * Insert at the caret. React tracks value on the DOM node, so setting
   * `.value` directly is ignored on the next render -- the native setter plus
   * a dispatched input event is what makes React see the change.
   */
  function type(text) {
    const el = target.current;
    if (!el || !document.body.contains(el)) return;

    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + text + el.value.slice(end);

    const proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
    setter.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));

    const caret = start + text.length;
    el.setSelectionRange(caret, caret);
    el.focus();
  }

  function backspace() {
    const el = target.current;
    if (!el || !document.body.contains(el)) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;

    const next = start === end
      ? el.value.slice(0, Math.max(0, start - 1)) + el.value.slice(end)
      : el.value.slice(0, start) + el.value.slice(end);

    const proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));

    const caret = start === end ? Math.max(0, start - 1) : start;
    el.setSelectionRange(caret, caret);
    el.focus();
  }

  const keys = showMarks ? [MARKS] : ROWS;

  return (
    <div
      className="urdu-kb"
      // Keep focus in the text field the teacher was editing.
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="kb-head">
        <span className="kb-target">
          {target.current ? <>Typing into <strong>{targetName}</strong></>
                          : 'Click an Urdu field first'}
        </span>
        <div className="kb-head-actions">
          <button
            className={showMarks ? 'chip on' : 'chip'}
            onClick={() => setShowMarks((v) => !v)}
          >
            {showMarks ? 'Letters' : 'اعراب Marks'}
          </button>
          <button className="chip" onClick={onClose}>Hide</button>
        </div>
      </div>

      <div className="kb-rows" dir="rtl">
        {keys.map((row, i) => (
          <div className="kb-row" key={i}>
            {row.map((k) => (
              <button className="kb-key" key={k} onClick={() => type(k)}>{k}</button>
            ))}
          </div>
        ))}

        <div className="kb-row">
          {DIGITS.map((d) => (
            <button className="kb-key digit" key={d} onClick={() => type(d)}>{d}</button>
          ))}
        </div>

        <div className="kb-row">
          <button className="kb-key wide" onClick={() => type(' ')}>فاصلہ (space)</button>
          <button className="kb-key" title="Break the join between letters"
                  onClick={() => type(ZWNJ)}>‌⁞</button>
          <button className="kb-key" onClick={() => type('؟')}>؟</button>
          <button className="kb-key danger" onClick={backspace}>⌫</button>
        </div>
      </div>
    </div>
  );
}
