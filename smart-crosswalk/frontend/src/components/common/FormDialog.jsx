import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
  Button,
  Input,
  Select,
  Badge,
} from '../ui';
import { GenericDetailCard } from './GenericDetailCard';
import { formatId, formatStatus } from '../../utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getNestedValue = (obj, key) =>
  key.split('.').reduce((acc, k) => acc?.[k], obj) ?? '';

// ─── useFormState ─────────────────────────────────────────────────────────────

/**
 * Shared hook for flat/nested form state.
 *
 * @param {(item: object) => object} initialFn
 * @param {object} item
 * @param {boolean} open
 * @returns {[object, (key: string, value: any) => void]}
 */
export function useFormState(initialFn, item, open) {
  const [formData, setFormData] = useState(() => initialFn(item));
  useEffect(() => setFormData(initialFn(item)), [item, open]);

  const handleFieldChange = (key, value) => {
    const parts = key.split('.');
    setFormData((prev) =>
      parts.length === 1
        ? { ...prev, [key]: value }
        : { ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: value } },
    );
  };
  return [formData, handleFieldChange];
}

// ─── useTabState ──────────────────────────────────────────────────────────────

/**
 * Internal hook for tabbed dialog state.
 *
 * @param {object} tabsConfig
 * @param {object} item
 * @param {boolean} open
 */
export function useTabState(tabsConfig, item, open) {
  const [activeTab, setActiveTab] = useState('');
  const [state, setState] = useState({});

  useEffect(() => {
    if (!item || !tabsConfig) return;
    setState(
      Object.fromEntries(
        tabsConfig.tabs.map((tab) => [
          tab.id,
          tab.type === 'form'
            ? (tab.initState?.(item) ?? {})
            : tab.type === 'device'
              ? { selected: item[tab.deviceKey]?._id || '' }
              : {},
        ]),
      ),
    );
    setActiveTab(tabsConfig.tabs[0]?.id || '');
  }, [item, open]);

  const setTabField = (tabId, key, value) =>
    setState((prev) => ({
      ...prev,
      [tabId]: { ...prev[tabId], [key]: value },
    }));

  return { activeTab, setActiveTab, state, setTabField };
}

// ─── renderField ──────────────────────────────────────────────────────────────

function renderField(field, j, formData, onFieldChange) {
  const shared = {
    label: field.label,
    value: getNestedValue(formData, field.key),
    onChange: (v) => onFieldChange?.(field.key, v),
    placeholder: field.placeholder,
    required: field.required,
    disabled: field.disabled,
  };
  return (
    <div key={j}>
      {field.type === 'select' ? (
        <Select {...shared} options={field.options || []} />
      ) : (
        <Input {...shared} type={field.inputType || 'text'} />
      )}
      {field.hint && (
        <p className="text-xs text-surface-500 mt-1">{field.hint}</p>
      )}
    </div>
  );
}

// ─── FormDialog ───────────────────────────────────────────────────────────────

/**
 * FormDialog — generic form-inside-a-dialog.
 * Renders `sections` of fields, plus Cancel / Submit buttons.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {(e: Event) => void} props.onSubmit
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {Array} props.sections
 * @param {object} props.formData
 * @param {(key: string, value: any) => void} props.onFieldChange
 * @param {boolean} [props.loading]
 * @param {string} [props.submitText]
 * @param {string} [props.cancelText]
 * @param {string} [props.maxWidth]
 */
export function FormDialog({
  open,
  onClose,
  onSubmit,
  title,
  description,
  sections,
  formData,
  onFieldChange,
  loading = false,
  submitText,
  cancelText = 'Cancel',
  maxWidth = 'max-w-md',
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth}>
      <form onSubmit={onSubmit}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {description && (
            <p className="text-sm text-surface-600 mb-4">{description}</p>
          )}
          <div className="space-y-6">
            {sections.map((s, i) => (
              <div key={i}>
                {s.title && (
                  <h4 className="text-lg font-semibold text-surface-900 mb-3">
                    {s.title}
                  </h4>
                )}
                {s.fields ? (
                  <div className="space-y-3">
                    {s.fields.map((f, j) =>
                      renderField(f, j, formData, onFieldChange),
                    )}
                  </div>
                ) : (
                  s.content
                )}
              </div>
            ))}
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {submitText || 'Submit'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

// ─── TabDialog ────────────────────────────────────────────────────────────────

/**
 * TabDialog — dialog with a horizontal tab bar.
 * Each tab either renders a mini-form or a device-linking panel.
 *
 * @param {object} props
 * @param {object} props.tabsConfig
 * @param {object} props.item
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {boolean} [props.loading]
 * @param {object} [props.context]
 */
export function TabDialog({ tabsConfig, item, open, onClose, loading, context }) {
  const { activeTab, setActiveTab, state, setTabField } = useTabState(
    tabsConfig,
    item,
    open,
  );
  if (!item || !tabsConfig) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{tabsConfig.title}</DialogTitle>
        {tabsConfig.getSubtitle && (
          <p className="text-sm text-surface-500 mt-1">
            {tabsConfig.getSubtitle(item)}
          </p>
        )}
      </DialogHeader>

      <DialogContent>
        {/* Tab bar */}
        <div className="flex border-b border-surface-200 mb-6">
          {tabsConfig.tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-none border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-surface-500 hover:text-surface-700'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Tab content */}
        {tabsConfig.tabs.map((tab) => {
          if (tab.id !== activeTab) return null;
          const tabState = state[tab.id] || {};

          if (tab.type === 'form')
            return (
              <div key={tab.id} className="space-y-4">
                {tab.sectionTitle && (
                  <h4 className="text-md font-semibold text-surface-900">
                    {tab.sectionTitle}
                  </h4>
                )}
                {tab.formFields.map((field) => (
                  <Input
                    key={field.key}
                    label={field.label}
                    value={tabState[field.key] ?? ''}
                    onChange={(v) => setTabField(tab.id, field.key, v)}
                    required={field.required}
                  />
                ))}
                <Button
                  variant="primary"
                  onClick={() => tab.onSubmit(item, tabState, context)}
                  loading={loading}
                >
                  {tab.submitLabel || 'Save'}
                </Button>
              </div>
            );

          if (tab.type === 'device') {
            const linked = item[tab.deviceKey];
            const options = tab.getOptions?.(context) || [];
            return (
              <div key={tab.id} className="space-y-4">
                {tab.sectionTitle && (
                  <h4 className="text-md font-semibold text-surface-900">
                    {tab.sectionTitle}
                  </h4>
                )}
                {linked && tab.getDeviceCard && (
                  <GenericDetailCard
                    {...tab.getDeviceCard(linked)}
                    actions={[
                      {
                        label: '🔗 Unlink',
                        onClick: () => tab.onUnlink(item, context),
                        variant: 'danger',
                        disabled: loading,
                      },
                    ]}
                  />
                )}
                <Select
                  label={tab.selectLabel || 'Select'}
                  value={tabState.selected || ''}
                  onChange={(v) => setTabField(tab.id, 'selected', v)}
                  options={options}
                  placeholder={tab.selectPlaceholder || 'Select...'}
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    onClick={() => tab.onLink(item, tabState.selected, context)}
                    disabled={!tabState.selected}
                    loading={loading}
                  >
                    {tab.linkLabel || '🔗 Link'}
                  </Button>
                  {tab.onCreate && (
                    <Button
                      variant="ghost"
                      onClick={() => tab.onCreate(context)}
                    >
                      {tab.createLabel || '➕ Add New'}
                    </Button>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })}
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
