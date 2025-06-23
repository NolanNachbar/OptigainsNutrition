// Settings utility functions

export interface UserSettings {
  units: 'metric' | 'imperial';
  theme: 'light' | 'dark';
  notifications: boolean;
}

const defaultSettings: UserSettings = {
  units: 'metric',
  theme: 'light',
  notifications: true
};

export function getUserSettings(): UserSettings {
  const stored = localStorage.getItem('userSettings');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

export function saveUserSettings(settings: UserSettings): void {
  localStorage.setItem('userSettings', JSON.stringify(settings));
}

export function resetSettings(): void {
  localStorage.removeItem('userSettings');
}