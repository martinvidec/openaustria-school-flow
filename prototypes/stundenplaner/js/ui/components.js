// Kleine UI-Helfer: DOM-Templating, Toasts, Bestätigungs- und Formular-Dialoge.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'value') node.value = value;
    else if (key === 'checked') node.checked = true;
    else if (key === 'selected') node.selected = true;
    else if (key === 'disabled') node.disabled = true;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function toast(message, kind = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const node = el('div', { class: `toast toast-${kind}` }, message);
  container.append(node);
  setTimeout(() => node.remove(), kind === 'error' ? 7000 : 4000);
}

export function confirmDialog(message, confirmLabel = 'Ja') {
  return new Promise((resolve) => {
    const dialog = el(
      'dialog',
      { class: 'modal' },
      el('p', { class: 'modal-message' }, message),
      el(
        'div',
        { class: 'modal-actions' },
        el('button', { class: 'btn', onClick: () => close(false) }, 'Abbrechen'),
        el('button', { class: 'btn btn-primary', onClick: () => close(true) }, confirmLabel),
      ),
    );
    function close(result) {
      dialog.close();
      dialog.remove();
      resolve(result);
    }
    dialog.addEventListener('cancel', () => close(false));
    document.body.append(dialog);
    dialog.showModal();
  });
}

// Generischer Formular-Dialog.
// fields: [{ name, label, type: 'text'|'number'|'select'|'checkbox'|'color'|'custom',
//            options?: [{value,label}], required?, min?, max?, hint?,
//            render?(container, values), collect?(container) }]
export function openFormDialog({ title, fields, values = {}, submitLabel = 'Speichern', onSubmit }) {
  const inputs = new Map();
  const customs = new Map();

  const body = el('div', { class: 'form-fields' });
  for (const field of fields) {
    const wrap = el('label', { class: `form-field form-field-${field.type}` });
    if (field.type !== 'checkbox') wrap.append(el('span', { class: 'form-label' }, field.label));
    let input = null;
    const current = values[field.name];
    if (field.type === 'select') {
      input = el('select', {});
      for (const opt of field.options ?? []) {
        input.append(el('option', { value: opt.value, selected: String(current ?? '') === String(opt.value) }, opt.label));
      }
    } else if (field.type === 'checkbox') {
      input = el('input', { type: 'checkbox', checked: !!current });
      wrap.append(input, el('span', { class: 'form-label' }, field.label));
    } else if (field.type === 'custom') {
      const container = el('div', { class: 'form-custom' });
      field.render(container, values);
      customs.set(field.name, { field, container });
      wrap.append(container);
    } else {
      input = el('input', {
        type: field.type,
        value: current ?? '',
        required: field.required,
        min: field.min,
        max: field.max,
      });
    }
    if (input && field.type !== 'checkbox') wrap.append(input);
    if (field.hint) wrap.append(el('span', { class: 'form-hint' }, field.hint));
    if (input) inputs.set(field.name, { field, input });
    body.append(wrap);
  }

  const form = el('form', { method: 'dialog', class: 'modal-form' });
  const dialog = el('dialog', { class: 'modal' }, el('h3', {}, title), form);
  form.append(
    body,
    el(
      'div',
      { class: 'modal-actions' },
      el('button', { class: 'btn', type: 'button', onClick: () => closeDialog() }, 'Abbrechen'),
      el('button', { class: 'btn btn-primary', type: 'submit' }, submitLabel),
    ),
  );

  function closeDialog() {
    dialog.close();
    dialog.remove();
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const result = {};
    for (const [name, { field, input }] of inputs) {
      if (field.type === 'checkbox') result[name] = input.checked;
      else if (field.type === 'number') result[name] = input.value === '' ? null : Number(input.value);
      else result[name] = input.value;
    }
    for (const [name, { field, container }] of customs) {
      result[name] = field.collect(container);
    }
    const error = onSubmit(result);
    if (typeof error === 'string') {
      toast(error, 'error');
      return;
    }
    closeDialog();
  });

  dialog.addEventListener('cancel', (ev) => {
    ev.preventDefault();
    closeDialog();
  });

  document.body.append(dialog);
  dialog.showModal();
}
