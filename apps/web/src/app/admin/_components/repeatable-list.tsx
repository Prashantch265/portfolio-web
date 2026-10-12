"use client";

export interface RepeatableListProps<T> {
  value: T[];
  onChange: (next: T[]) => void;
  /** `setItem` replaces the whole row — for an object row, spread the existing item yourself (`setItem({...item, field: x})`); a primitive row (e.g. `string[]`) just passes the new value directly. Full-replacement rather than a merged patch, so this works for both without a Partial<primitive> type that doesn't make sense. */
  renderRow: (item: T, setItem: (next: T) => void, index: number) => React.ReactNode;
  blank: () => T;
  addLabel: string;
  /** Field-error keys from a 422 `source` map addressed by numeric path (e.g. "edges.0.to") — row `index` gets `errorsByIndex[index]`, a plain message list to render under that row. Only used from A4 on; omit elsewhere. */
  errorsByIndex?: Record<number, string[]>;
}

/**
 * PRD §6's RepeatableList — add/remove rows (constraints, decisions,
 * diagram nodes/edges, CV entries). Controlled: the parent owns the
 * array, this component only ever calls `onChange` with a new array,
 * never mutates `value` in place.
 */
export function RepeatableList<T>({ value, onChange, renderRow, blank, addLabel, errorsByIndex }: RepeatableListProps<T>) {
  function update(index: number, next: T) {
    onChange(value.map((item, i) => (i === index ? next : item)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    onChange([...value, blank()]);
  }

  return (
    <div className="rlist">
      {value.map((item, index) => (
        <div className="rlist__row" key={index}>
          <div className="rlist__row-fields">{renderRow(item, (patch) => update(index, patch), index)}</div>
          {errorsByIndex?.[index]?.length ? (
            <div className="field__error">{errorsByIndex[index].join(" ")}</div>
          ) : null}
          <button type="button" className="rlist__row-remove" aria-label={`Remove row ${index + 1}`} onClick={() => remove(index)}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--small rlist__add" onClick={add}>
        {addLabel}
      </button>
    </div>
  );
}
