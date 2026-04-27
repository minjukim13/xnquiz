import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('C:/Users/김민주/AppData/Roaming/npm/node_modules/xlsx');

const rows = [
  ['용도','카테고리','커맨드','기능'],

  // 개발/배포 - 빌트인
  ['개발/배포','빌트인','/init','현재 코드베이스를 문서화하는 CLAUDE.md 초기 생성'],
  ['개발/배포','빌트인','/review','풀 리퀘스트 코드 리뷰'],
  ['개발/배포','빌트인','/security-review','현재 브랜치 변경분 보안 검토'],
  ['개발/배포','빌트인','/ultrareview','멀티 에이전트 기반 클라우드 리뷰 (사용자 트리거 전용)'],
  ['개발/배포','빌트인','/loop','프롬프트/슬래시 커맨드를 일정 간격으로 반복 실행'],
  ['개발/배포','빌트인','/schedule','크론 스케줄로 원격 에이전트(루틴) 실행'],
  ['개발/배포','빌트인','/simplify','변경된 코드를 재사용성/품질 관점으로 검토 후 정리'],
  ['개발/배포','빌트인','/fewer-permission-prompts','자주 쓰는 읽기 도구를 settings.json 에 자동 허용 처리'],
  ['개발/배포','빌트인','/update-config','settings.json 하네스/훅/권한 설정 변경'],
  ['개발/배포','빌트인','/keybindings-help','키바인딩(단축키) 커스터마이징 가이드'],
  ['개발/배포','빌트인','/claude-api','Claude API/Anthropic SDK 앱 빌드 및 모델 마이그레이션 도우미'],
  ['개발/배포','빌트인','/exp','방금 한 작업을 비개발자 관점에서 쉽게 설명'],

  // 개발/배포 - plannotator
  ['개발/배포','plannotator','/plannotator-annotate','마크다운 파일에 인터랙티브 주석 UI 열기'],
  ['개발/배포','plannotator','/plannotator-last','직전 어시스턴트 응답에 주석 달기'],
  ['개발/배포','plannotator','/plannotator-review','현재 변경분 또는 PR URL 인터랙티브 코드 리뷰'],

  // 디자인 - styleseed
  ['디자인','styleseed','/ss-setup','프로젝트 디자인 시스템 인터랙티브 셋업 위저드'],
  ['디자인','styleseed','/ss-page','모바일 페이지 스캐폴딩'],
  ['디자인','styleseed','/ss-component','UI 컴포넌트 자동 생성'],
  ['디자인','styleseed','/ss-pattern','UI 패턴(공통 구성요소) 생성'],
  ['디자인','styleseed','/ss-flow','UX 플로우 설계'],
  ['디자인','styleseed','/ss-tokens','디자인 토큰(컬러/타이포 등) 관리'],
  ['디자인','styleseed','/ss-copy','UX 마이크로카피 작성'],
  ['디자인','styleseed','/ss-feedback','로딩/성공/에러/빈 상태 등 피드백 상태 추가'],
  ['디자인','styleseed','/ss-a11y','컴포넌트/페이지 접근성 감사 및 수정'],
  ['디자인','styleseed','/ss-audit','닐슨 휴리스틱 기반 모바일 UX 감사'],
  ['디자인','styleseed','/ss-lint','디자인 시스템 위반 자동 린트'],
  ['디자인','styleseed','/ss-review','UI 코드의 디자인 시스템/접근성/베스트 프랙티스 리뷰'],
  ['디자인','styleseed','/ss-update','StyleSeed 엔진 안전 업데이트'],

  // 기획 - pm-execution
  ['기획','pm-execution','/pm-execution:write-prd','기능 아이디어/문제 정의로 PRD 초안 생성'],
  ['기획','pm-execution','/pm-execution:write-stories','User Story / Job Story / WWA 형식 백로그 아이템 생성'],
  ['기획','pm-execution','/pm-execution:test-scenarios','유저 스토리/기능 명세 기반 테스트 시나리오 생성(엣지 케이스 포함)'],
  ['기획','pm-execution','/pm-execution:sprint','스프린트 계획 / 회고 / 릴리즈 노트 (plan/retro/release-notes)'],
  ['기획','pm-execution','/pm-execution:plan-okrs','팀 OKR 수립 (정량 KR 포함)'],
  ['기획','pm-execution','/pm-execution:pre-mortem','PRD/런칭 플랜 사전 부검 리스크 분석'],
  ['기획','pm-execution','/pm-execution:stakeholder-map','Power × Interest 매트릭스 + 커뮤니케이션 플랜'],
  ['기획','pm-execution','/pm-execution:meeting-notes','회의 트랜스크립트를 결정/액션아이템 구조로 정리'],
  ['기획','pm-execution','/pm-execution:generate-data','테스트용 더미 데이터셋 생성 (CSV/JSON/SQL/Python)'],
  ['기획','pm-execution','/pm-execution:transform-roadmap','기능 중심 로드맵을 아웃컴 중심 로드맵으로 전환'],

  // 기획 - pm-product-discovery
  ['기획','pm-product-discovery','/pm-product-discovery:discover','아이디에이션부터 가설 매핑까지 풀 디스커버리 사이클'],
  ['기획','pm-product-discovery','/pm-product-discovery:brainstorm','PM/디자이너/엔지니어 관점 아이디어 브레인스토밍'],
  ['기획','pm-product-discovery','/pm-product-discovery:interview','고객 인터뷰 스크립트 작성 또는 결과 정리'],
  ['기획','pm-product-discovery','/pm-product-discovery:setup-metrics','North Star/입력 지표/헬스 지표/알림 임계값 설계'],
  ['기획','pm-product-discovery','/pm-product-discovery:triage-requests','고객/스테이크홀더 기능 요청 분류 및 우선순위'],

  // 기획 - pm-product-strategy
  ['기획','pm-product-strategy','/pm-product-strategy:strategy','9섹션 Product Strategy Canvas 작성'],
  ['기획','pm-product-strategy','/pm-product-strategy:business-model','Lean Canvas / BMC / Startup Canvas / Value Prop 비즈니스 모델'],
  ['기획','pm-product-strategy','/pm-product-strategy:pricing','가격 모델/경쟁사 비교/WTP 추정/가격 실험 설계'],
  ['기획','pm-product-strategy','/pm-product-strategy:value-proposition','JTBD 6단계 템플릿으로 가치 제안 설계'],
  ['기획','pm-product-strategy','/pm-product-strategy:market-scan','SWOT + PESTLE + Porter Five Forces + Ansoff 통합'],

  // 마케팅/GTM - pm-go-to-market
  ['마케팅/GTM','pm-go-to-market','/pm-go-to-market:plan-launch','GTM 전략 수립 (비치헤드/ICP/메시징/채널/타임라인)'],
  ['마케팅/GTM','pm-go-to-market','/pm-go-to-market:growth-strategy','성장 루프 + GTM 모션(PLG/SLG 등 7가지) 설계'],
  ['마케팅/GTM','pm-go-to-market','/pm-go-to-market:battlecard','경쟁사 배틀카드 (포지셔닝/기능 비교/오브젝션 대응)'],

  // 데이터/리서치 - pm-data-analytics
  ['데이터/리서치','pm-data-analytics','/pm-data-analytics:analyze-cohorts','코호트별 리텐션/기능 도입률/인게이지먼트 분석'],
  ['데이터/리서치','pm-data-analytics','/pm-data-analytics:analyze-test','A/B 테스트 통계적 유의성/Ship·Extend·Stop 권고'],
  ['데이터/리서치','pm-data-analytics','/pm-data-analytics:write-query','자연어로 SQL 쿼리 생성 (BigQuery/PostgreSQL/MySQL)'],

  // 데이터/리서치 - pm-market-research
  ['데이터/리서치','pm-market-research','/pm-market-research:competitive-analysis','경쟁사 분석/포지셔닝/차별화 기회 도출'],
  ['데이터/리서치','pm-market-research','/pm-market-research:research-users','페르소나/세그먼트/고객 여정 맵 생성'],
  ['데이터/리서치','pm-market-research','/pm-market-research:analyze-feedback','대규모 유저 피드백 감성/테마 분석'],

  // 문서/협업 - pm-toolkit
  ['문서/협업','pm-toolkit','/pm-toolkit:proofread','문법/논리/흐름 오류 정밀 교정 (재작성 X)'],
  ['문서/협업','pm-toolkit','/pm-toolkit:draft-nda','NDA(비밀유지계약) 초안 작성'],
  ['문서/협업','pm-toolkit','/pm-toolkit:privacy-policy','개인정보처리방침 초안 (관할/컴플라이언스 포함)'],
  ['문서/협업','pm-toolkit','/pm-toolkit:review-resume','PM 이력서 10개 베스트 프랙티스 기준 리뷰'],
  ['문서/협업','pm-toolkit','/pm-toolkit:tailor-resume','JD 맞춤형 PM 이력서 최적화'],
  ['문서/협업','pm-toolkit','/pm-toolkit:exp','비개발자 관점에서 작업 내용 쉽게 설명'],

  // 디자인 - impeccable
  ['디자인','impeccable','/impeccable:impeccable','프로덕션 등급 프론트 UI 빌드 (craft/teach/extract 모드)'],
  ['디자인','impeccable','/impeccable:shape','코드 작성 전 UX/UI 디자인 브리프 작성'],
  ['디자인','impeccable','/impeccable:critique','정량 점수 + 페르소나 기반 디자인 평가'],
  ['디자인','impeccable','/impeccable:audit','접근성/성능/테마/반응형 종합 기술 감사 (P0~P3)'],
  ['디자인','impeccable','/impeccable:polish','정렬/간격/일관성 출시 전 최종 폴리싱'],
  ['디자인','impeccable','/impeccable:layout','레이아웃/간격/시각 리듬 개선'],
  ['디자인','impeccable','/impeccable:typeset','타이포그래피(서체/위계/크기/가독성) 개선'],
  ['디자인','impeccable','/impeccable:colorize','단조로운 디자인에 전략적 컬러 추가'],
  ['디자인','impeccable','/impeccable:animate','마이크로 인터랙션/모션 추가'],
  ['디자인','impeccable','/impeccable:delight','즐거움/개성/예상 못한 디테일 추가'],
  ['디자인','impeccable','/impeccable:clarify','UX 카피/에러 메시지/라벨 명확화'],
  ['디자인','impeccable','/impeccable:distill','불필요한 복잡성 제거 (단순화)'],
  ['디자인','impeccable','/impeccable:adapt','반응형/디바이스/플랫폼 대응'],
  ['디자인','impeccable','/impeccable:bolder','밋밋한 디자인을 더 대담하게 증폭'],
  ['디자인','impeccable','/impeccable:quieter','과도한 디자인을 차분하게 정제'],
  ['디자인','impeccable','/impeccable:overdrive','관습 한계를 넘는 기술적으로 야심찬 구현'],
  ['디자인','impeccable','/impeccable:optimize','UI 성능 진단 및 최적화 (로딩/렌더링/번들)'],

  // 개발/배포 - vercel
  ['개발/배포','vercel','/vercel:bootstrap','Vercel 연동 리소스 안전한 부트스트랩 (preflight + db/dev)'],
  ['개발/배포','vercel','/vercel:deploy','Vercel 배포 (인자 없으면 preview, prod 인자 시 production)'],
  ['개발/배포','vercel','/vercel:env','환경변수 관리 (list/pull/add/remove/diff)'],
  ['개발/배포','vercel','/vercel:marketplace','Vercel Marketplace 통합 탐색 및 설치'],
  ['개발/배포','vercel','/vercel:status','프로젝트 상태/최근 배포/환경변수 개요'],
];

const ws = XLSX.utils.aoa_to_sheet(rows);
ws['!cols'] = [
  { wch: 14 }, // 용도
  { wch: 22 }, // 카테고리
  { wch: 42 }, // 커맨드
  { wch: 70 }, // 기능
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'pm-skills');
const target = process.argv[2] || 'C:/Users/김민주/Downloads/pm-skills.xlsx';
XLSX.writeFile(wb, target);
console.log(`OK: ${rows.length - 1} rows written to ${target}`);
