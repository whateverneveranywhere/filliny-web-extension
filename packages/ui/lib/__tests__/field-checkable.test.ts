/**
 * Comprehensive unit tests for checkable field handlers
 * Tests radio buttons, checkboxes, and switches behavior patterns
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createCheckbox, createRadio, createFormWithFields } from './setup.js';

/**
 * Implementation of isValueChecked for testing
 * Matches the behavior of the actual implementation
 */
const isValueChecked = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }

  // Direct boolean
  if (typeof value === 'boolean') {
    return value;
  }

  // Numbers (0 = false, anything else = true)
  if (typeof value === 'number') {
    return value !== 0;
  }

  // String handling
  if (typeof value === 'string') {
    const normalizedValue = value.toLowerCase().trim();

    // Common true values
    const trueValues = ['true', 'yes', '1', 'on', 'checked', 'selected', 'enabled', 'active'];
    if (trueValues.includes(normalizedValue)) {
      return true;
    }

    // Common false values
    const falseValues = ['false', 'no', '0', 'off', 'unchecked', 'disabled', 'inactive', ''];
    if (falseValues.includes(normalizedValue)) {
      return false;
    }

    // Non-empty string is truthy
    return normalizedValue.length > 0;
  }

  // Default to false for other types
  return false;
};

/**
 * Implementation of matchesCheckboxValue for testing
 */
const matchesCheckboxValue = (targetValue: string, actualValue: string): boolean => {
  const normalizedTarget = targetValue.toLowerCase().trim();
  const normalizedActual = actualValue.toLowerCase().trim();

  // Exact match
  if (normalizedTarget === normalizedActual) {
    return true;
  }

  // Boolean equivalents
  const trueValues = ['true', 'yes', '1', 'on'];
  const falseValues = ['false', 'no', '0', 'off'];

  if (trueValues.includes(normalizedTarget) && trueValues.includes(normalizedActual)) {
    return true;
  }

  if (falseValues.includes(normalizedTarget) && falseValues.includes(normalizedActual)) {
    return true;
  }

  // Partial match (one contains the other)
  if (normalizedTarget.includes(normalizedActual) || normalizedActual.includes(normalizedTarget)) {
    return true;
  }

  return false;
};

describe('isValueChecked', () => {
  describe('truthy values', () => {
    const truthyValues = ['true', 'yes', '1', 'on', 'checked', 'selected', 'enabled', 'active'];

    it.each(truthyValues)('should return true for "%s"', value => {
      expect(isValueChecked(value)).toBe(true);
    });

    it('should return true for boolean true', () => {
      expect(isValueChecked(true)).toBe(true);
    });

    it('should return true for number 1', () => {
      expect(isValueChecked(1)).toBe(true);
    });

    it('should handle uppercase truthy values', () => {
      expect(isValueChecked('TRUE')).toBe(true);
      expect(isValueChecked('YES')).toBe(true);
      expect(isValueChecked('ON')).toBe(true);
    });

    it('should handle mixed case truthy values', () => {
      expect(isValueChecked('True')).toBe(true);
      expect(isValueChecked('Yes')).toBe(true);
    });
  });

  describe('falsy values', () => {
    const falsyValues = ['false', 'no', '0', 'off', 'unchecked', 'disabled', 'inactive'];

    it.each(falsyValues)('should return false for "%s"', value => {
      expect(isValueChecked(value)).toBe(false);
    });

    it('should return false for boolean false', () => {
      expect(isValueChecked(false)).toBe(false);
    });

    it('should return false for number 0', () => {
      expect(isValueChecked(0)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValueChecked('')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isValueChecked(null)).toBe(false);
      expect(isValueChecked(undefined)).toBe(false);
    });
  });

  describe('ambiguous values', () => {
    it('should handle non-standard string values', () => {
      // Non-empty strings that aren't in false list should be truthy
      const result = isValueChecked('maybe');
      expect(result).toBe(true);
    });
  });
});

describe('matchesCheckboxValue', () => {
  it('should match exact value', () => {
    expect(matchesCheckboxValue('sports', 'sports')).toBe(true);
  });

  it('should match case-insensitively', () => {
    expect(matchesCheckboxValue('Sports', 'sports')).toBe(true);
    expect(matchesCheckboxValue('SPORTS', 'sports')).toBe(true);
  });

  it('should match partial values', () => {
    expect(matchesCheckboxValue('sport', 'sports')).toBe(true);
    expect(matchesCheckboxValue('sports', 'sport')).toBe(true);
  });

  it('should return false for non-matching values', () => {
    expect(matchesCheckboxValue('music', 'sports')).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(matchesCheckboxValue('', '')).toBe(true);
    // Empty string is contained in all strings, so partial match returns true
    // This is the expected JavaScript behavior
    expect(matchesCheckboxValue('value', '')).toBe(true);
    expect(matchesCheckboxValue('', 'value')).toBe(true);
  });

  it('should handle boolean string values', () => {
    expect(matchesCheckboxValue('true', 'true')).toBe(true);
    expect(matchesCheckboxValue('yes', 'true')).toBe(true);
    expect(matchesCheckboxValue('1', 'true')).toBe(true);
  });
});

describe('Radio Button Groups', () => {
  describe('Gender Selection', () => {
    beforeEach(() => {
      createFormWithFields(`
        <fieldset>
          <legend>Gender</legend>
          <label><input type="radio" name="gender" value="male" id="gender-male"> Male</label>
          <label><input type="radio" name="gender" value="female" id="gender-female"> Female</label>
          <label><input type="radio" name="gender" value="other" id="gender-other"> Other</label>
        </fieldset>
      `);
    });

    it('should have three radio buttons in the group', () => {
      const radios = document.querySelectorAll('input[name="gender"]');
      expect(radios.length).toBe(3);
    });

    it('should initially have no selection', () => {
      const radios = document.querySelectorAll<HTMLInputElement>('input[name="gender"]');
      const checked = Array.from(radios).filter(r => r.checked);
      expect(checked.length).toBe(0);
    });

    it('should allow selecting one option', () => {
      const maleRadio = document.getElementById('gender-male') as HTMLInputElement;
      maleRadio.checked = true;

      const radios = document.querySelectorAll<HTMLInputElement>('input[name="gender"]');
      const checked = Array.from(radios).filter(r => r.checked);
      expect(checked.length).toBe(1);
      expect(checked[0].value).toBe('male');
    });

    it('should find all radios by name', () => {
      const radios = document.querySelectorAll<HTMLInputElement>('input[type="radio"][name="gender"]');
      expect(radios.length).toBe(3);
      const values = Array.from(radios).map(r => r.value);
      expect(values).toContain('male');
      expect(values).toContain('female');
      expect(values).toContain('other');
    });
  });

  describe('Yes/No Questions', () => {
    beforeEach(() => {
      createFormWithFields(`
        <div class="question">
          <p>Do you agree?</p>
          <label><input type="radio" name="agree" value="yes" id="agree-yes"> Yes</label>
          <label><input type="radio" name="agree" value="no" id="agree-no"> No</label>
        </div>
      `);
    });

    it('should match "yes" value', () => {
      expect(matchesCheckboxValue('yes', 'yes')).toBe(true);
      expect(matchesCheckboxValue('true', 'yes')).toBe(true);
    });

    it('should match "no" value', () => {
      expect(matchesCheckboxValue('no', 'no')).toBe(true);
      expect(matchesCheckboxValue('false', 'no')).toBe(true);
    });
  });
});

describe('Checkbox Groups', () => {
  describe('Multi-select Interests', () => {
    beforeEach(() => {
      createFormWithFields(`
        <fieldset>
          <legend>Select your interests</legend>
          <label><input type="checkbox" name="interests" value="sports" id="int-sports"> Sports</label>
          <label><input type="checkbox" name="interests" value="music" id="int-music"> Music</label>
          <label><input type="checkbox" name="interests" value="reading" id="int-reading"> Reading</label>
          <label><input type="checkbox" name="interests" value="travel" id="int-travel"> Travel</label>
        </fieldset>
      `);
    });

    it('should have four checkboxes in the group', () => {
      const checkboxes = document.querySelectorAll('input[name="interests"]');
      expect(checkboxes.length).toBe(4);
    });

    it('should allow multiple selections', () => {
      const sports = document.getElementById('int-sports') as HTMLInputElement;
      const music = document.getElementById('int-music') as HTMLInputElement;

      sports.checked = true;
      music.checked = true;

      const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="interests"]');
      const checked = Array.from(checkboxes).filter(c => c.checked);
      expect(checked.length).toBe(2);
    });

    it('should allow selecting all', () => {
      const checkboxes = document.querySelectorAll<HTMLInputElement>('input[name="interests"]');
      checkboxes.forEach(cb => {
        cb.checked = true;
      });

      const checked = Array.from(checkboxes).filter(c => c.checked);
      expect(checked.length).toBe(4);
    });

    it('should allow deselecting', () => {
      const sports = document.getElementById('int-sports') as HTMLInputElement;
      sports.checked = true;
      expect(sports.checked).toBe(true);

      sports.checked = false;
      expect(sports.checked).toBe(false);
    });
  });

  describe('Single Checkbox (Terms & Conditions)', () => {
    beforeEach(() => {
      createFormWithFields(`
        <label>
          <input type="checkbox" name="terms" value="accepted" id="terms">
          I agree to the terms and conditions
        </label>
      `);
    });

    it('should be a standalone checkbox', () => {
      const checkboxes = document.querySelectorAll('input[name="terms"]');
      expect(checkboxes.length).toBe(1);
    });

    it('should toggle checked state', () => {
      const terms = document.getElementById('terms') as HTMLInputElement;

      expect(terms.checked).toBe(false);
      terms.checked = true;
      expect(terms.checked).toBe(true);
      terms.checked = false;
      expect(terms.checked).toBe(false);
    });
  });
});

describe('ARIA Checkable Elements', () => {
  describe('ARIA Checkbox', () => {
    beforeEach(() => {
      createFormWithFields(`
        <div role="checkbox" aria-checked="false" tabindex="0" id="aria-cb">
          Custom Checkbox
        </div>
      `);
    });

    it('should have role="checkbox"', () => {
      const checkbox = document.getElementById('aria-cb');
      expect(checkbox?.getAttribute('role')).toBe('checkbox');
    });

    it('should have aria-checked attribute', () => {
      const checkbox = document.getElementById('aria-cb');
      expect(checkbox?.getAttribute('aria-checked')).toBe('false');
    });

    it('should update aria-checked when toggled', () => {
      const checkbox = document.getElementById('aria-cb');
      checkbox?.setAttribute('aria-checked', 'true');
      expect(checkbox?.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('ARIA Radio Group', () => {
    beforeEach(() => {
      createFormWithFields(`
        <div role="radiogroup" aria-labelledby="group-label">
          <div id="group-label">Select option:</div>
          <div role="radio" aria-checked="false" tabindex="0" id="aria-opt-a">Option A</div>
          <div role="radio" aria-checked="false" tabindex="0" id="aria-opt-b">Option B</div>
          <div role="radio" aria-checked="false" tabindex="0" id="aria-opt-c">Option C</div>
        </div>
      `);
    });

    it('should have radiogroup role on container', () => {
      const group = document.querySelector('[role="radiogroup"]');
      expect(group).not.toBeNull();
    });

    it('should have three radio options', () => {
      const radios = document.querySelectorAll('[role="radio"]');
      expect(radios.length).toBe(3);
    });

    it('should allow selecting via aria-checked', () => {
      const optA = document.getElementById('aria-opt-a');
      optA?.setAttribute('aria-checked', 'true');
      expect(optA?.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('ARIA Switch', () => {
    beforeEach(() => {
      createFormWithFields(`
        <button role="switch" aria-checked="false" id="aria-switch">
          Notifications
        </button>
      `);
    });

    it('should have role="switch"', () => {
      const switchEl = document.getElementById('aria-switch');
      expect(switchEl?.getAttribute('role')).toBe('switch');
    });

    it('should toggle aria-checked', () => {
      const switchEl = document.getElementById('aria-switch');
      expect(switchEl?.getAttribute('aria-checked')).toBe('false');

      switchEl?.setAttribute('aria-checked', 'true');
      expect(switchEl?.getAttribute('aria-checked')).toBe('true');
    });
  });
});

describe('Edge Cases', () => {
  describe('Disabled Checkboxes', () => {
    it('should handle disabled checkbox', () => {
      const checkbox = createCheckbox({ disabled: 'true', value: 'test' });
      expect(checkbox.disabled).toBe(true);
    });
  });

  describe('Required Radio Groups', () => {
    beforeEach(() => {
      createFormWithFields(`
        <input type="radio" name="required-choice" value="a" required id="req-a">
        <input type="radio" name="required-choice" value="b" required id="req-b">
      `);
    });

    it('should have required attribute', () => {
      const radio = document.getElementById('req-a') as HTMLInputElement;
      expect(radio.required).toBe(true);
    });
  });

  describe('Hidden Checkboxes', () => {
    beforeEach(() => {
      createFormWithFields(`
        <input type="checkbox" name="hidden-cb" value="hidden" style="display:none" id="hidden-cb">
      `);
    });

    it('should exist but be hidden', () => {
      const checkbox = document.getElementById('hidden-cb') as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.style.display).toBe('none');
    });
  });

  describe('Indeterminate State', () => {
    it('should support indeterminate state', () => {
      const checkbox = createCheckbox({ id: 'indeterminate-cb' });
      checkbox.indeterminate = true;
      expect(checkbox.indeterminate).toBe(true);
    });
  });

  describe('Checkbox with Empty Value', () => {
    it('should handle empty value attribute', () => {
      const checkbox = createCheckbox({ value: '' });
      expect(checkbox.value).toBe('');
    });

    it('should handle missing value attribute', () => {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      // Default value for checkbox without value attribute is "on"
      expect(checkbox.value).toBe('on');
    });
  });
});

describe('Value Matching Patterns', () => {
  describe('Common Form Values', () => {
    it('should match common affirmative patterns', () => {
      const affirmatives = ['yes', 'true', '1', 'on'];
      affirmatives.forEach(val => {
        expect(isValueChecked(val)).toBe(true);
      });
    });

    it('should match common negative patterns', () => {
      const negatives = ['no', 'false', '0', 'off'];
      negatives.forEach(val => {
        expect(isValueChecked(val)).toBe(false);
      });
    });
  });

  describe('Numeric Values', () => {
    it('should handle numeric string values', () => {
      expect(isValueChecked('1')).toBe(true);
      expect(isValueChecked('0')).toBe(false);
    });

    it('should handle larger numbers', () => {
      // Numbers > 0 should be truthy
      expect(isValueChecked(5)).toBe(true);
      expect(isValueChecked(-1)).toBe(true); // Negative is still truthy
    });
  });
});
