const IGNORED_DIRS = ['.agents', 'remotion-demo', '.claude'];

const isIgnored = filepath => IGNORED_DIRS.some(dir => filepath.includes(`/${dir}/`) || filepath.startsWith(`${dir}/`));

export default {
  '*.{js,jsx,ts,tsx,json}': filenames => {
    const filtered = filenames.filter(f => !isIgnored(f));
    if (filtered.length === 0) return [];
    return [
      `prettier --write ${filtered.map(f => `"${f}"`).join(' ')}`,
      `eslint --fix --no-warn-ignored ${filtered.map(f => `"${f}"`).join(' ')}`,
    ];
  },
};
