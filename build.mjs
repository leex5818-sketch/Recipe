// esbuild 빌드 — src/app.jsx 의 JSX를 사전 컴파일해 app.js 생성.
// 브라우저 Babel-standalone(런타임 컴파일) 제거가 목적 → 초기 로딩 대폭 단축.
// React/ReactDOM 은 index.html 의 CDN 전역(UMD)을 그대로 사용하므로 번들에 포함하지 않음.
import { build } from 'esbuild';

build({
  entryPoints: ['src/app.jsx'],
  outfile: 'app.js',
  bundle: true,
  minify: true,
  format: 'iife',
  jsx: 'transform',          // classic 런타임 → React.createElement (전역 React 사용)
  target: ['es2019'],
  define: {
    // 관리자 비밀번호는 빌드 시 env(ADMIN_PW)로 주입. 미설정 시 빈 문자열 → 관리자 로그인 비활성(배포는 정상).
    __ADMIN_PW__: JSON.stringify(process.env.ADMIN_PW || ''),
  },
  legalComments: 'none',
  logLevel: 'info',
})
  .then(() => console.log('✓ build 완료 → app.js' + (process.env.ADMIN_PW ? ' (ADMIN_PW 주입됨)' : ' (ADMIN_PW 미설정 → 관리자 비활성)')))
  .catch((e) => { console.error(e); process.exit(1); });
