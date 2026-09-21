import Script from 'next/script';
import roomMarkup from '../src/generated/room-markup.json';

export default function Home() {
  return <>
    <div dangerouslySetInnerHTML={{ __html: roomMarkup }} />
    <noscript>나의 공간을 둘러보려면 브라우저의 JavaScript를 켜주세요.</noscript>
    <Script src="/prototype/app.js" type="module" strategy="afterInteractive" />
  </>;
}
