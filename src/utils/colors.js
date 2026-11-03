// Categorical chart palette: fixed order, validated for colour-blind separation in both
// themes (scripts: dataviz validate_palette). Colour follows the category's position in the
// month's list; a 9th+ category reuses the muted "other" grey rather than inventing a hue.

export const CATEGORY_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};
export const OTHER_COLOR = { light: '#8a9791', dark: '#6f827a' };

export function pickColor(index, theme = 'light') {
  const list = CATEGORY_COLORS[theme] ?? CATEGORY_COLORS.light;
  return index >= 0 && index < list.length ? list[index] : (OTHER_COLOR[theme] ?? OTHER_COLOR.light);
}

export const CHART_INK = {
  light: { tick: '#586861', grid: '#dae2de', surface: '#ffffff' },
  dark: { tick: '#9db0a8', grid: '#2a3a34', surface: '#16201c' },
};
