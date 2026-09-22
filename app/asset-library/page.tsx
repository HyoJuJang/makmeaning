import { listGameProducts } from '../../src/lib/game-assets';
import { AssetLibrary } from './AssetLibrary';
export const metadata = { title: 'G:Scene — 상품과 공간 에셋' };
export default function AssetLibraryPage() {
  return <AssetLibrary summary={listGameProducts({ status: 'ready' }).summary} />;
}
