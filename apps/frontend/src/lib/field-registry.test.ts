import { describe, expect, it } from 'vitest';
import {
  adjacentEditableField,
  filterFieldRegistry,
  getFieldEntry,
  groupFieldEntries,
  isEditableFieldId,
  isResolutionFieldId,
  isSettingsFieldId,
  listEditableFields,
  parseFieldQueryParam,
} from './field-registry.js';

describe('field registry', () => {
  it('places Language and Appearance in General as settings panels', () => {
    expect(getFieldEntry('language')?.group).toBe('general');
    expect(getFieldEntry('appearance')?.group).toBe('general');
    expect(isSettingsFieldId('language')).toBe(true);
    expect(isResolutionFieldId('title')).toBe(true);
    expect(isResolutionFieldId('language')).toBe(false);
  });

  it('marks core fields editable and upcoming fields as coming soon', () => {
    expect(isEditableFieldId('title')).toBe(true);
    expect(isEditableFieldId('logo')).toBe(true);
    expect(isEditableFieldId('tagline')).toBe(false);
    expect(isEditableFieldId('episodeOrder')).toBe(false);
    expect(listEditableFields().every((entry) => entry.editable)).toBe(true);
  });

  it('parses deep-link field query with a safe default', () => {
    expect(parseFieldQueryParam('poster')).toBe('poster');
    expect(parseFieldQueryParam('language')).toBe('language');
    expect(parseFieldQueryParam('unknown')).toBe('language');
    expect(parseFieldQueryParam(null)).toBe('language');
  });

  it('filters and groups rail entries for search', () => {
    const matched = filterFieldRegistry('title');
    expect(matched.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(['title', 'originalTitle']),
    );
    const groups = groupFieldEntries(filterFieldRegistry(''));
    expect(groups[0]?.group).toBe('general');
    expect(groups.some((group) => group.group === 'localizedText')).toBe(true);
  });

  it('navigates between editable fields including General', () => {
    expect(adjacentEditableField('language', 1)).toBe('appearance');
    expect(adjacentEditableField('appearance', 1)).toBe('title');
    expect(adjacentEditableField('language', -1)).toBeNull();
    expect(getFieldEntry('poster')?.category).toBe('artwork');
  });
});
