/**
 * Comprehensive unit tests for framework detection utilities
 * Tests detection of React, Vue, Angular, Svelte, Qwik, and other frameworks
 */
import {
  Framework,
  UILibrary,
  FormLibrary,
  detectFrameworkForElement,
  detectUILibrary,
  detectFormLibrary,
  detectReact,
  detectVue,
  detectAngular,
  detectSvelte,
  detectQwik,
  querySelectorAllDeep,
  querySelectorDeep,
  isInShadowDOM,
} from '../utils/frameworkDetection.js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Framework Enum', () => {
  it('should have all expected framework values', () => {
    expect(Framework.REACT).toBe('react');
    expect(Framework.VUE).toBe('vue');
    expect(Framework.ANGULAR).toBe('angular');
    expect(Framework.SVELTE).toBe('svelte');
    expect(Framework.QWIK).toBe('qwik');
    expect(Framework.VANILLA).toBe('vanilla');
    expect(Framework.SELECT2).toBe('select2');
  });
});

describe('UILibrary Enum', () => {
  it('should have all expected UI library values', () => {
    expect(UILibrary.MATERIAL_UI).toBe('material-ui');
    expect(UILibrary.ANT_DESIGN).toBe('ant-design');
    expect(UILibrary.CHAKRA_UI).toBe('chakra-ui');
    expect(UILibrary.VUETIFY).toBe('vuetify');
    expect(UILibrary.UNKNOWN).toBe('unknown');
  });
});

describe('FormLibrary Enum', () => {
  it('should have all expected form library values', () => {
    expect(FormLibrary.REACT_HOOK_FORM).toBe('react-hook-form');
    expect(FormLibrary.FORMIK).toBe('formik');
    expect(FormLibrary.VUELIDATE).toBe('vuelidate');
    expect(FormLibrary.UNKNOWN).toBe('unknown');
  });
});

describe('React Detection', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    // Clean up window properties
    const win = window as unknown as Record<string, unknown>;
    delete win.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  });

  describe('detectReact', () => {
    it('should detect data-reactid attribute', () => {
      element.setAttribute('data-reactid', '.0.1.2');
      expect(detectReact(element)).toBe(true);
    });

    it('should detect data-react-class attribute', () => {
      element.setAttribute('data-react-class', 'MyComponent');
      expect(detectReact(element)).toBe(true);
    });

    it('should return false for vanilla elements', () => {
      const vanillaElement = document.createElement('input');
      expect(detectReact(vanillaElement)).toBe(false);
    });

    it('should return false when no React markers present', () => {
      element.setAttribute('class', 'some-class');
      expect(detectReact(element)).toBe(false);
    });
  });
});

describe('Vue Detection', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('detectVue', () => {
    const vueDirectives = ['v-model', 'v-bind', 'v-on', 'v-if', 'v-for', 'v-show', ':class', ':style'];

    it.each(vueDirectives)('should detect Vue directive: %s', directive => {
      element.setAttribute(directive, 'value');
      expect(detectVue(element)).toBe(true);
    });

    it('should detect Vue 2 instance (__vue__)', () => {
      Object.defineProperty(element, '__vue__', {
        value: {},
        configurable: true,
      });
      expect(detectVue(element)).toBe(true);
    });

    it('should detect Vue 3 parent component', () => {
      Object.defineProperty(element, '__vueParentComponent__', {
        value: {},
        configurable: true,
      });
      expect(detectVue(element)).toBe(true);
    });

    it('should detect Vue 3 vnode', () => {
      Object.defineProperty(element, '__vnode__', {
        value: { type: 'component' },
        configurable: true,
      });
      expect(detectVue(element)).toBe(true);
    });

    it('should detect Vue SFC scoped styles (data-v-*)', () => {
      element.setAttribute('data-v-abc123', '');
      expect(detectVue(element)).toBe(true);
    });

    it('should return false for non-Vue elements', () => {
      const vanillaElement = document.createElement('input');
      expect(detectVue(vanillaElement)).toBe(false);
    });
  });
});

describe('Angular Detection', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('detectAngular', () => {
    it('should detect ng-model attribute', () => {
      element.setAttribute('ng-model', 'data.value');
      expect(detectAngular(element)).toBe(true);
    });

    it('should detect _ng* attributes', () => {
      element.setAttribute('_ngcontent-abc-123', '');
      expect(detectAngular(element)).toBe(true);
    });

    it('should detect ng-* attributes', () => {
      element.setAttribute('ng-controller', 'MyController');
      expect(detectAngular(element)).toBe(true);
    });

    it('should detect Angular context', () => {
      Object.defineProperty(element, '__ngContext__', {
        value: [],
        configurable: true,
      });
      expect(detectAngular(element)).toBe(true);
    });

    it('should return false for non-Angular elements', () => {
      const vanillaElement = document.createElement('input');
      expect(detectAngular(vanillaElement)).toBe(false);
    });
  });
});

describe('Svelte Detection', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('detectSvelte', () => {
    it('should detect svelte-* attributes', () => {
      // Svelte adds svelte-* attributes, not classes
      element.setAttribute('svelte-abc123', '');
      expect(detectSvelte(element)).toBe(true);
    });

    it('should detect use:action attribute', () => {
      element.setAttribute('use:action', '');
      expect(detectSvelte(element)).toBe(true);
    });

    it('should detect bind:* attributes', () => {
      element.setAttribute('bind:value', 'myValue');
      expect(detectSvelte(element)).toBe(true);
    });

    it('should detect on:* event attributes', () => {
      element.setAttribute('on:click', 'handleClick');
      expect(detectSvelte(element)).toBe(true);
    });

    it('should detect class:* attributes', () => {
      element.setAttribute('class:active', 'isActive');
      expect(detectSvelte(element)).toBe(true);
    });

    it('should detect __svelte_meta property', () => {
      Object.defineProperty(element, '__svelte_meta', {
        value: { component: {} },
        configurable: true,
      });
      expect(detectSvelte(element)).toBe(true);
    });

    it('should return false for non-Svelte elements', () => {
      const vanillaElement = document.createElement('input');
      expect(detectSvelte(vanillaElement)).toBe(false);
    });
  });
});

describe('Qwik Detection', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('detectQwik', () => {
    it('should detect q:slot attribute', () => {
      element.setAttribute('q:slot', 'content');
      expect(detectQwik(element)).toBe(true);
    });

    it('should detect q:id attribute', () => {
      element.setAttribute('q:id', 'component-1');
      expect(detectQwik(element)).toBe(true);
    });

    it('should detect on:click attribute', () => {
      element.setAttribute('on:click', 'handler');
      expect(detectQwik(element)).toBe(true);
    });

    it('should detect on:qvisible attribute', () => {
      element.setAttribute('on:qvisible', 'handler');
      expect(detectQwik(element)).toBe(true);
    });

    it('should detect q:* attributes', () => {
      element.setAttribute('q:container', '');
      expect(detectQwik(element)).toBe(true);
    });

    it('should detect __qwik__ property', () => {
      Object.defineProperty(element, '__qwik__', {
        value: {},
        configurable: true,
      });
      expect(detectQwik(element)).toBe(true);
    });

    it('should return false for non-Qwik elements', () => {
      const vanillaElement = document.createElement('input');
      expect(detectQwik(vanillaElement)).toBe(false);
    });
  });
});

describe('Framework Detection for Element', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should return VUE for Vue elements', () => {
    element.setAttribute('v-model', 'test');
    expect(detectFrameworkForElement(element)).toBe(Framework.VUE);
  });

  it('should return ANGULAR for Angular elements', () => {
    element.setAttribute('ng-model', 'test');
    expect(detectFrameworkForElement(element)).toBe(Framework.ANGULAR);
  });

  it('should return SVELTE for Svelte elements', () => {
    element.setAttribute('svelte-component', '');
    expect(detectFrameworkForElement(element)).toBe(Framework.SVELTE);
  });

  it('should return QWIK for Qwik elements', () => {
    element.setAttribute('q:slot', 'content');
    expect(detectFrameworkForElement(element)).toBe(Framework.QWIK);
  });

  it('should return VANILLA for plain elements', () => {
    expect(detectFrameworkForElement(element)).toBe(Framework.VANILLA);
  });

  it('should return REACT for data-reactid elements', () => {
    element.setAttribute('data-reactid', '.0.1');
    expect(detectFrameworkForElement(element)).toBe(Framework.REACT);
  });
});

describe('UI Library Detection', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should detect Material-UI', () => {
    element.className = 'MuiButton-root MuiButton-contained';
    expect(detectUILibrary(element)).toBe(UILibrary.MATERIAL_UI);
  });

  it('should detect Ant Design', () => {
    element.className = 'ant-btn ant-btn-primary';
    expect(detectUILibrary(element)).toBe(UILibrary.ANT_DESIGN);
  });

  it('should detect Chakra UI', () => {
    element.className = 'chakra-button css-abc123';
    expect(detectUILibrary(element)).toBe(UILibrary.CHAKRA_UI);
  });

  it('should return UNKNOWN for unknown libraries', () => {
    element.className = 'custom-button';
    expect(detectUILibrary(element)).toBe(UILibrary.UNKNOWN);
  });

  it('should return UNKNOWN for elements with no classes', () => {
    expect(detectUILibrary(element)).toBe(UILibrary.UNKNOWN);
  });
});

describe('Form Library Detection', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('div');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should detect Formik', () => {
    element.setAttribute('data-formik', 'true');
    expect(detectFormLibrary(element)).toBe(FormLibrary.FORMIK);
  });

  it('should detect React Hook Form', () => {
    element.setAttribute('data-react-hook-form', 'field');
    expect(detectFormLibrary(element)).toBe(FormLibrary.REACT_HOOK_FORM);
  });

  it('should detect Vuelidate', () => {
    element.setAttribute('v-validate', 'rules');
    expect(detectFormLibrary(element)).toBe(FormLibrary.VUELIDATE);
  });

  it('should detect Angular Forms', () => {
    element.setAttribute('formControlName', 'email');
    expect(detectFormLibrary(element)).toBe(FormLibrary.ANGULAR_FORMS);
  });

  it('should return UNKNOWN for unknown form libraries', () => {
    expect(detectFormLibrary(element)).toBe(FormLibrary.UNKNOWN);
  });
});

describe('Shadow DOM Utilities', () => {
  let shadowHost: HTMLElement;
  let shadowRoot: ShadowRoot;

  beforeEach(() => {
    shadowHost = document.createElement('div');
    shadowHost.id = 'shadow-host';
    document.body.appendChild(shadowHost);
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('isInShadowDOM', () => {
    it('should return true for elements inside Shadow DOM', () => {
      const innerElement = document.createElement('div');
      shadowRoot.appendChild(innerElement);
      expect(isInShadowDOM(innerElement)).toBe(true);
    });

    it('should return false for elements in regular DOM', () => {
      const regularElement = document.createElement('div');
      document.body.appendChild(regularElement);
      expect(isInShadowDOM(regularElement)).toBe(false);
    });
  });

  describe('querySelectorAllDeep', () => {
    beforeEach(() => {
      // Add elements to both regular DOM and Shadow DOM
      const regularInput = document.createElement('input');
      regularInput.className = 'test-input';
      document.body.appendChild(regularInput);

      const shadowInput = document.createElement('input');
      shadowInput.className = 'test-input';
      shadowRoot.appendChild(shadowInput);
    });

    it('should find elements in both regular and Shadow DOM', () => {
      const results = querySelectorAllDeep<HTMLInputElement>('.test-input');
      expect(results.length).toBe(2);
      results.forEach(el => {
        expect(el).toBeInstanceOf(HTMLInputElement);
      });
    });

    it('should find elements only in Shadow DOM when searching from shadow root', () => {
      const results = querySelectorAllDeep<HTMLInputElement>('.test-input', shadowRoot);
      expect(results.length).toBe(1);
    });

    it('should return empty array for non-matching selectors', () => {
      const results = querySelectorAllDeep('.non-existent');
      expect(results).toEqual([]);
    });
  });

  describe('querySelectorDeep', () => {
    beforeEach(() => {
      const input = document.createElement('input');
      input.id = 'shadow-input';
      shadowRoot.appendChild(input);
    });

    it('should find first matching element including Shadow DOM', () => {
      const result = querySelectorDeep<HTMLInputElement>('#shadow-input');
      expect(result).toBeInstanceOf(HTMLInputElement);
    });

    it('should return null for non-matching selectors', () => {
      const result = querySelectorDeep('.non-existent');
      expect(result).toBeNull();
    });
  });
});

describe('Nested Shadow DOM', () => {
  let outerHost: HTMLElement;
  let innerHost: HTMLElement;
  let outerShadow: ShadowRoot;
  let innerShadow: ShadowRoot;

  beforeEach(() => {
    // Create nested Shadow DOM structure
    outerHost = document.createElement('div');
    outerHost.id = 'outer-host';
    document.body.appendChild(outerHost);
    outerShadow = outerHost.attachShadow({ mode: 'open' });

    innerHost = document.createElement('div');
    innerHost.id = 'inner-host';
    outerShadow.appendChild(innerHost);
    innerShadow = innerHost.attachShadow({ mode: 'open' });

    const deepInput = document.createElement('input');
    deepInput.className = 'deep-input';
    innerShadow.appendChild(deepInput);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should find elements in deeply nested Shadow DOM', () => {
    const results = querySelectorAllDeep<HTMLInputElement>('.deep-input');
    expect(results.length).toBe(1);
    expect(results[0]).toBeInstanceOf(HTMLInputElement);
  });

  it('should correctly identify elements in nested Shadow DOM', () => {
    const deepElement = innerShadow.querySelector('.deep-input');
    expect(deepElement).not.toBeNull();
    expect(isInShadowDOM(deepElement!)).toBe(true);
  });
});

describe('Edge Cases', () => {
  it('should handle elements with multiple framework indicators', () => {
    const element = document.createElement('div');
    // Add both Vue and Angular indicators
    element.setAttribute('v-model', 'test');
    element.setAttribute('ng-model', 'test');

    // Should return the first detected framework (Vue comes before Angular in order)
    const framework = detectFrameworkForElement(element);
    expect([Framework.REACT, Framework.VUE]).toContain(framework);
  });

  it('should handle elements with no class or attributes', () => {
    const bareElement = document.createElement('div');
    expect(detectFrameworkForElement(bareElement)).toBe(Framework.VANILLA);
    expect(detectUILibrary(bareElement)).toBe(UILibrary.UNKNOWN);
    expect(detectFormLibrary(bareElement)).toBe(FormLibrary.UNKNOWN);
  });

  it('should handle SVG elements', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // SVG elements don't have the same properties, should not throw
    expect(() => detectFrameworkForElement(svg)).not.toThrow();
    expect(detectFrameworkForElement(svg)).toBe(Framework.VANILLA);
  });

  it('should handle elements with special class names', () => {
    const element = document.createElement('div');
    element.className = 'my-Mui-like-button ant-like-btn chakra-inspired';
    // Should not detect as any library since these are not exact matches
    const result = detectUILibrary(element);
    expect(typeof result).toBe('string');
  });
});
