import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '500', '600', '700', '800'],
});

export { fontFamily };
