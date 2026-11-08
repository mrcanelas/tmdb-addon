import type { LucideIcon } from 'lucide-react';
import {
  EyeOff,
  Flag,
  Image,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';

/** Stable preset ids from AGENTS §32 — display copy via i18n. */

export type HomePresetId =
  | 'recommended'
  | 'family-friendly'
  | 'only-available'
  | 'brazilian-content'
  | 'anime-focus'
  | 'rich-artwork';

export const HOME_PRESETS: Array<{
  id: HomePresetId;
  nameKey: string;
  descriptionKey: string;
  Icon: LucideIcon;
}> = [
  {
    id: 'recommended',
    nameKey: 'overview.presets.recommended.name',
    descriptionKey: 'overview.presets.recommended.description',
    Icon: Star,
  },
  {
    id: 'family-friendly',
    nameKey: 'overview.presets.familyFriendly.name',
    descriptionKey: 'overview.presets.familyFriendly.description',
    Icon: Users,
  },
  {
    id: 'only-available',
    nameKey: 'overview.presets.onlyAvailable.name',
    descriptionKey: 'overview.presets.onlyAvailable.description',
    Icon: EyeOff,
  },
  {
    id: 'anime-focus',
    nameKey: 'overview.presets.animeFocus.name',
    descriptionKey: 'overview.presets.animeFocus.description',
    Icon: Sparkles,
  }
];

export const PENDING_PRESET_KEY = 'metalayer.pendingPreset';
