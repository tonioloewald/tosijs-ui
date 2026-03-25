const isMacOS = typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || '');
export const modifierKeys = isMacOS
    ? { meta: '⌘', ctrl: '⌃', alt: '⌥', shift: '⇧', escape: '⎋' }
    : { meta: 'Meta', ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', escape: 'Esc' };
export const keycode = (evt) => {
    if (evt.code) {
        return evt.code.replace(/^Key|^Digit/, '');
    }
    return evt.key;
};
export const keystroke = (evt) => {
    const parts = [];
    if (evt.altKey)
        parts.push('alt');
    if (evt.ctrlKey)
        parts.push('ctrl');
    if (evt.metaKey)
        parts.push('meta');
    if (evt.shiftKey)
        parts.push('shift');
    parts.push(keycode(evt));
    return parts.join('-');
};
const MODIFIER_PATTERNS = [
    [/\^|ctrl-?/i, 'ctrlKey'],
    [/⌘|meta-?/i, 'metaKey'],
    [/⌥|⎇|alt-?|option-?/i, 'altKey'],
    [/⇧|shift-?/i, 'shiftKey'],
];
export const parseShortcut = (shortcut) => {
    let remaining = shortcut.trim();
    const result = {
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        shiftKey: false,
        key: '',
    };
    for (const [pattern, prop] of MODIFIER_PATTERNS) {
        if (pattern.test(remaining)) {
            ;
            result[prop] = true;
            remaining = remaining.replace(pattern, '');
        }
    }
    // Strip any remaining hyphens from between modifiers and key
    remaining = remaining.replace(/^-+/, '');
    result.key = remaining.toLowerCase();
    return result;
};
export const matchShortcut = (event, shortcut) => {
    const parsed = parseShortcut(shortcut);
    return (event.key.toLowerCase() === parsed.key &&
        event.metaKey === parsed.metaKey &&
        event.ctrlKey === parsed.ctrlKey &&
        event.altKey === parsed.altKey &&
        event.shiftKey === parsed.shiftKey);
};
export const canonicalShortcut = (shortcut) => {
    const parsed = parseShortcut(shortcut);
    const parts = [];
    if (parsed.altKey)
        parts.push('alt');
    if (parsed.ctrlKey)
        parts.push('ctrl');
    if (parsed.metaKey)
        parts.push('meta');
    if (parsed.shiftKey)
        parts.push('shift');
    parts.push(parsed.key);
    return parts.join('-');
};
export const displayShortcut = (shortcut) => {
    const parsed = parseShortcut(shortcut);
    if (isMacOS) {
        const parts = [];
        if (parsed.ctrlKey)
            parts.push('⌃');
        if (parsed.altKey)
            parts.push('⌥');
        if (parsed.shiftKey)
            parts.push('⇧');
        if (parsed.metaKey)
            parts.push('⌘');
        parts.push(parsed.key.toUpperCase());
        return parts.join('');
    }
    const parts = [];
    if (parsed.ctrlKey)
        parts.push('Ctrl');
    if (parsed.altKey)
        parts.push('Alt');
    if (parsed.shiftKey)
        parts.push('Shift');
    if (parsed.metaKey)
        parts.push('Meta');
    parts.push(parsed.key.toUpperCase());
    return parts.join('+');
};
