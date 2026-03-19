import { useMemo, useState } from 'react';
import { Check, Search, Users, X } from 'lucide-react';

export interface SearchableOption {
  id: string;
  label: string;
  description?: string;
  meta?: string;
  group?: string;
  keywords?: string[];
  recent?: boolean;
  badge?: string;
}

type SharedSearchProps = {
  label: string;
  placeholder?: string;
  emptyLabel?: string;
  options: SearchableOption[];
  helperText?: string;
  suggestionLimit?: number;
};

interface SearchableSelectProps extends SharedSearchProps {
  value?: string;
  onChange: (value: string) => void;
}

interface SearchableMultiSelectProps extends SharedSearchProps {
  values: string[];
  onChange: (values: string[]) => void;
  selectedLabel?: string;
}

type SearchableOptionGroup = {
  label: string;
  options: SearchableOption[];
};

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const optionSearchText = (option: SearchableOption) => normalizeText(
  [
    option.label,
    option.description,
    option.meta,
    ...(option.keywords || [])
  ].filter(Boolean).join(' ')
);

const splitForHighlight = (text: string, query: string) => {
  if (!query.trim()) {
    return [{ text, match: false }];
  }

  const pattern = new RegExp(`(${escapeRegExp(query.trim())})`, 'ig');
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({
      text: part,
      match: part.toLowerCase() === query.trim().toLowerCase()
    }));
};

const HighlightedText = ({ text, query, className = '' }: { text: string; query: string; className?: string }) => (
  <span className={className}>
    {splitForHighlight(text, query).map((part, index) => (
      part.match
        ? <strong key={`${text}-${index}`} className="font-bold text-[var(--text-strong)]">{part.text}</strong>
        : <span key={`${text}-${index}`}>{part.text}</span>
    ))}
  </span>
);

const groupOptions = (options: SearchableOption[]): SearchableOptionGroup[] => {
  const groups = new Map<string, SearchableOption[]>();

  for (const option of options) {
    const groupLabel = option.group || 'Sugestões';
    const currentOptions = groups.get(groupLabel) || [];
    currentOptions.push(option);
    groups.set(groupLabel, currentOptions);
  }

  return [...groups.entries()].map(([label, groupedOptions]) => ({
    label,
    options: groupedOptions
  }));
};

const buildGroupedSuggestions = (options: SearchableOption[], query: string, suggestionLimit: number) => {
  const normalizedQuery = normalizeText(query);
  const scoredOptions = options
    .map((option) => {
      const searchText = optionSearchText(option);
      const matchIndex = normalizedQuery ? searchText.indexOf(normalizedQuery) : 0;
      const matches = normalizedQuery ? matchIndex >= 0 : true;

      return {
        option,
        matches,
        matchIndex,
        score: normalizedQuery
          ? (
            (matchIndex === 0 ? 140 : 0)
            + (option.recent ? 25 : 0)
            + Math.max(0, 60 - Math.max(matchIndex, 0))
          )
          : (option.recent ? 100 : 20)
      };
    })
    .filter((entry) => entry.matches)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.option.recent !== right.option.recent) {
        return left.option.recent ? -1 : 1;
      }

      return left.option.label.localeCompare(right.option.label, 'pt-BR');
    });

  const limited = normalizedQuery
    ? scoredOptions.slice(0, suggestionLimit).map((entry) => entry.option)
    : scoredOptions.reduce<SearchableOption[]>((accumulator, entry) => {
      const nextGroup = entry.option.group || 'Sugestões';
      const currentGroupCount = accumulator.filter((option) => (option.group || 'Sugestões') === nextGroup).length;

      if (currentGroupCount < Math.max(4, Math.ceil(suggestionLimit / 2))) {
        accumulator.push(entry.option);
      }

      return accumulator;
    }, []);

  return groupOptions(limited);
};

const SharedResults = ({
  groups,
  query,
  emptyLabel,
  selectedIds,
  onSelect
}: {
  groups: SearchableOptionGroup[];
  query: string;
  emptyLabel: string;
  selectedIds: string[];
  onSelect: (optionId: string) => void;
}) => {
  if (groups.length === 0) {
    return (
      <div className="nexus-panel rounded-[1.3rem] px-4 py-5 text-sm text-[var(--text-muted)]">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {group.label}
          </p>
          <div className="space-y-2">
            {group.options.map((option) => {
              const isSelected = selectedIds.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option.id)}
                  className={`nexus-panel w-full rounded-[1.35rem] px-4 py-4 text-left transition ${
                    isSelected
                      ? 'border-[rgba(79,70,229,0.28)] bg-[rgba(79,70,229,0.1)]'
                      : 'hover:border-[rgba(79,70,229,0.18)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <HighlightedText
                          text={option.label}
                          query={query}
                          className="font-semibold text-[var(--text-strong)]"
                        />
                        {option.badge ? (
                          <span className="nexus-chip">
                            {option.badge}
                          </span>
                        ) : null}
                      </div>
                      {option.description ? (
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          <HighlightedText text={option.description} query={query} />
                        </p>
                      ) : null}
                      {option.meta ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                          <HighlightedText text={option.meta} query={query} />
                        </p>
                      ) : null}
                    </div>
                    {isSelected ? (
                      <span className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-indigo)] text-white">
                        <Check size={15} />
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Seletor pesquisável unificado do sistema.
 *
 * Ao focar ou começar a digitar, o componente mostra sugestões agrupadas,
 * prioriza itens recentes e destaca em negrito o trecho digitado.
 */
export const SearchableSelect = ({
  label,
  placeholder = 'Buscar...',
  emptyLabel = 'Nenhum item encontrado.',
  options,
  value = '',
  onChange,
  helperText,
  suggestionLimit = 12
}: SearchableSelectProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value);
  const groups = useMemo(() => buildGroupedSuggestions(options, query, suggestionLimit), [options, query, suggestionLimit]);

  return (
    <div
      className="space-y-3"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-[var(--text-strong)]">{label}</label>
        {selectedOption ? (
          <span className="nexus-chip">
            <Check size={14} />
            {selectedOption.label}
          </span>
        ) : null}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="nexus-input pl-11 pr-11"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(true);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)] transition hover:text-[var(--text-strong)]"
            aria-label="Limpar busca"
          >
            <X size={15} />
          </button>
        ) : null}
        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-3 nexus-panel rounded-[1.5rem] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.4)]">
            <SharedResults
              groups={groups}
              query={query}
              emptyLabel={emptyLabel}
              selectedIds={value ? [value] : []}
              onSelect={(optionId) => {
                onChange(optionId);
                setQuery('');
                setIsOpen(false);
              }}
            />
          </div>
        ) : null}
      </div>

      {helperText ? (
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{helperText}</p>
      ) : null}
    </div>
  );
};

/**
 * Variante multisseleção para alunos, grupos e outros públicos do AI Hub.
 */
export const SearchableMultiSelect = ({
  label,
  placeholder = 'Buscar...',
  emptyLabel = 'Nenhum item encontrado.',
  options,
  values,
  onChange,
  helperText,
  selectedLabel = 'selecionado(s)',
  suggestionLimit = 12
}: SearchableMultiSelectProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectedOptions = options.filter((option) => values.includes(option.id));
  const groups = useMemo(() => buildGroupedSuggestions(options, query, suggestionLimit), [options, query, suggestionLimit]);

  const toggleOption = (optionId: string) => {
    onChange(
      values.includes(optionId)
        ? values.filter((value) => value !== optionId)
        : [...values, optionId]
    );
  };

  return (
    <div
      className="space-y-3"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-[var(--text-strong)]">{label}</label>
        <span className="nexus-chip">
          <Users size={14} />
          {values.length} {selectedLabel}
        </span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="nexus-input pl-11 pr-11"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setIsOpen(true);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-soft)] transition hover:text-[var(--text-strong)]"
            aria-label="Limpar busca"
          >
            <X size={15} />
          </button>
        ) : null}
        {isOpen ? (
          <div className="absolute left-0 right-0 top-full z-20 mt-3 nexus-panel rounded-[1.5rem] p-3 shadow-[0_24px_80px_rgba(15,23,42,0.4)]">
            <SharedResults
              groups={groups}
              query={query}
              emptyLabel={emptyLabel}
              selectedIds={values}
              onSelect={toggleOption}
            />
          </div>
        ) : null}
      </div>

      {selectedOptions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => toggleOption(option.id)}
              className="nexus-chip"
            >
              <Check size={13} />
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {helperText ? (
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">{helperText}</p>
      ) : null}

    </div>
  );
};

export default SearchableSelect;
