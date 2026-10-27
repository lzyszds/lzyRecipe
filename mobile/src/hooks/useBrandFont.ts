import { useFonts } from 'expo-font';

/**
 * 品牌展示字体：站酷快乐体（开屏动画与首页顶栏共用）。
 * expo-font 按字体源全局缓存，多处调用不会重复加载；
 * 加载失败时返回 false，调用方降级使用系统字体即可。
 */
export function useBrandFont(): boolean {
  const [loaded, error] = useFonts({
    'ZCOOL KuaiLe': require('../../assets/fonts/ZCOOLKuaiLe-Regular.ttf'),
  });
  return loaded || !!error;
}
