import React, { useRef, useState } from 'react';

const CLASSES = ['Nursery', 'KG-I', 'KG-II', 'Class 1', 'Class 2', 'Class 3'];
const SUBJECTS = ['Urdu', 'English', 'Maths', 'General Knowledge', 'Islamiat',
                  'Nature Study', 'Computer'];
const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'ur', label: 'اردو' },
  { id: 'mixed', label: 'Both' },
];

export default function Composer({ settings, setSettings, onGenerate, busy }) {
  const [tab, setTab] = useState('scan');
  const [idea, setIdea] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const inputRef = useRef(null);

  const set = (k) => (e) =>
    setSettings((s) => ({ ...s, [k]: e.target.value }));

  function addFiles(list) {
    const picked = Array.from(list).slice(0, 6);
    setFiles(picked);
    setPreviews(picked.map((f) => URL.createObjectURL(f)));
  }

  function onDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function submit() {
    onGenerate({ files: tab === 'scan' ? files : [], idea: tab === 'idea' ? idea : '' });
  }

  const ready = tab === 'scan' ? files.length > 0 : idea.trim().length > 4;

  return (
    <div className="panel">
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'scan'}
          className={tab === 'scan' ? 'tab on' : 'tab'}
          onClick={() => setTab('scan')}
        >
          Scan handwriting
        </button>
        <button
          role="tab"
          aria-selected={tab === 'idea'}
          className={tab === 'idea' ? 'tab on' : 'tab'}
          onClick={() => setTab('idea')}
        >
          Describe it
        </button>
      </div>

      {tab === 'scan' ? (
        <>
          <div
            className="dropzone"
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            {previews.length ? (
              <div className="thumbs">
                {previews.map((src, i) => (
                  <img src={src} alt={`page ${i + 1}`} key={i} />
                ))}
              </div>
            ) : (
              <>
                <div className="dz-icon">📄</div>
                <p className="dz-main">Drop photos of the handwritten paper</p>
                <p className="dz-sub">or click to choose — up to 6 pages</p>
              </>
            )}
          </div>
          {files.length > 0 && (
            <button className="link-btn" onClick={() => { setFiles([]); setPreviews([]); }}>
              Clear {files.length} page{files.length > 1 ? 's' : ''}
            </button>
          )}
        </>
      ) : (
        <textarea
          className="idea"
          rows={7}
          placeholder={
            'Describe the paper you want. For example:\n\n' +
            '"Nursery Urdu mid-term, 50 marks. Four questions: trace the first ' +
            'five letters, fill in the missing letters, match the letter to the ' +
            'picture, and circle the correct letter."'
          }
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
        />
      )}

      <div className="fields">
        <label>
          School
          <input value={settings.school} onChange={set('school')} placeholder="Al-Sehr Academy" />
        </label>
        <label>
          Exam
          <input value={settings.term} onChange={set('term')} placeholder="Mid Term 2026" />
        </label>
        <label>
          Class
          <input list="classes" value={settings.class} onChange={set('class')} />
          <datalist id="classes">
            {CLASSES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label>
          Subject
          <input list="subjects" value={settings.subject} onChange={set('subject')} />
          <datalist id="subjects">
            {SUBJECTS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </label>
        <label>
          Marks
          <input type="number" value={settings.totalMarks} onChange={set('totalMarks')} placeholder="50" />
        </label>
        <label>
          Time
          <input value={settings.duration} onChange={set('duration')} placeholder="1 hour" />
        </label>
      </div>

      <div className="seg" role="group" aria-label="Language">
        {LANGS.map((l) => (
          <button
            key={l.id}
            className={settings.language === l.id ? 'seg-btn on' : 'seg-btn'}
            onClick={() => setSettings((s) => ({ ...s, language: l.id }))}
          >
            {l.label}
          </button>
        ))}
      </div>

      <button className="primary" disabled={!ready || busy} onClick={submit}>
        {busy ? 'Reading…' : tab === 'scan' ? 'Create paper from scan' : 'Create paper'}
      </button>
    </div>
  );
}
