import { useState, useEffect, useRef } from 'react';
import { useTickerNote, useSetTickerNote } from '../../hooks/useNotes';

interface NoteEditorProps {
  portfolioId: string;
  ticker: string;
}

const MAX_NOTE_LENGTH = 5000;

export default function NoteEditor({ portfolioId, ticker }: NoteEditorProps) {
  const { data: noteData } = useTickerNote(portfolioId, ticker);
  const { mutate: setNote, isPending } = useSetTickerNote();

  const [localNote, setLocalNote] = useState('');
  const [saved, setSaved] = useState(false);
  // don't clobber unsaved edits when a background refetch lands
  const dirty = useRef(false);

  useEffect(() => {
    if (noteData && !dirty.current) setLocalNote(noteData.note ?? '');
  }, [noteData]);

  function handleBlur() {
    if (!dirty.current) return;
    dirty.current = false;
    setNote(
      { portfolioId, ticker, note: localNote },
      { onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 2000); } }
    );
  }

  return (
    <div>
      <textarea
        value={localNote}
        maxLength={MAX_NOTE_LENGTH}
        onChange={e => { dirty.current = true; setSaved(false); setLocalNote(e.target.value); }}
        onBlur={handleBlur}
        placeholder="Why did you buy this? Investment thesis, price targets, risks…"
        rows={4}
        className="w-full resize-y rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex justify-between mt-1">
        <p className="text-[10px] text-slate-400">
          {isPending ? 'Saving…' : saved ? 'Saved' : 'Saves automatically when you click away'}
        </p>
        {localNote.length > MAX_NOTE_LENGTH - 500 && (
          <p className="text-[10px] text-slate-400">{localNote.length} / {MAX_NOTE_LENGTH}</p>
        )}
      </div>
    </div>
  );
}
