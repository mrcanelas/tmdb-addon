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
  it('places a single General settings panel in the General group', () => {
    expect(getFieldEntry('general')?.group).toBe('general');
    expect(isSettingsFieldId('general')).toBe(true);
    expect(isResolutionFieldId('title')).toBe(true);
    expect(isResolutionFieldId('general')).toBe(false);
    expect(getFieldEntry('language')).toBeUndefined();
    expect(getFieldEntry('appearance')).toBeUndefined();
  });

  it('marks core fields editable and upcoming fields as coming soon', () => {
    expect(isEditableFieldId('title')).toBe(true);
    expect(isEditableFieldId('logo')).toBe(true);
    expect(isEditableFieldId('tagline')).toBe(false);
    expect(isEditableFieldId('episodeOrder')).toBe(false);
    expect(listEditableFields().every((entry) => entry.editable)).toBe(true);
  });

  it('parses deep-link field query with redirects from former settings panels', () => {
    expect(parseFieldQueryParam('poster')).toBe('poster');
    expect(parseFieldQueryParam('language')).toBe('general');
    expect(parseFieldQueryParam('appearance')).toBe('general');
    expect(parseFieldQueryParam('unknown')).toBe('general');
    expect(parseFieldQueryParam(null)).toBe('general');
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
    expect(adjacentEditableField('general', 1)).toBe('title');
    expect(adjacentEditableField('title', -1)).toBe('general');
    expect(adjacentEditableField('general', -1)).toBeNull();
    expect(getFieldEntry('poster')?.category).toBe('artwork');
  });
});
