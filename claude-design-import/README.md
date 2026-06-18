# XN Quiz · Claude Design Import Package

claude.ai/design 에 import 하여 xnquiz 프로토타입과 동일한 톤/구조의 시안을 생성하기 위한 패키지.

## 패키지 구조

```
claude-design-import/
├── README.md           ← 이 파일 (import 가이드)
├── tokens.css          ← 디자인 토큰 정의 (색상/타이포그래피/간격/모서리)
├── components.html     ← 핵심 컴포넌트 미리보기 (Button/Card/Dialog/Input/Badge/StatusBadge/TypeBadge)
└── screens/
    ├── quiz-list.html         ← 퀴즈 목록 (교수자 메인)
    ├── quiz-detail.html       ← 퀴즈 상세
    ├── quiz-create.html       ← 퀴즈 생성 (4단계 폼)
    ├── quiz-monitor.html      ← 응시 모니터링
    ├── quiz-stats.html        ← 퀴즈 통계
    └── question-bank-list.html ← 문제은행 목록
```

## 프로젝트 컨텍스트

- **제품**: 대학용 LMS 의 퀴즈 관리 시스템 (Canvas LMS Classic Quizzes 와 연동)
- **사용자**: 교수자 (퀴즈 생성/채점), 학습자 (응시), 운영자 (관리)
- **스타일**: Toss 스타일 화이트 모드. 신뢰감 있고 정보 위계가 명확한 톤
- **언어**: 한국어 (한국 대학 환경)
- **폰트**: Pretendard (한국어 최적화 산세리프)

## 디자인 시스템 핵심 원칙

1. **시맨틱 토큰 사용** — `bg-primary` / `text-foreground` 등 의미 기반. Hex 하드코딩 금지
2. **카드 = rounded-xl (12px)** — 모든 카드 모서리 일관
3. **버튼 = rounded-lg (8px)** — Button 컴포넌트 사용, raw button 에 bg-[#3182F6] 금지
4. **모달 = shadcn Dialog** — DialogTitle / DialogDescription 컴포넌트 필수
5. **계층 색상 3단계** — foreground > secondary-foreground > muted-foreground
6. **간격 = 4px 단위** — 8/12/16/20/24/32/40

## Import 절차

### claude.ai/design 에 패키지 업로드

**옵션 A. ZIP 업로드**:
1. 이 폴더(`claude-design-import/`) 전체를 zip 으로 압축
2. claude.ai/design → Project Settings → Design System → Import → ZIP 선택
3. 업로드 후 tokens.css 가 자동 매핑되는지 확인

**옵션 B. 개별 파일 업로드**:
1. tokens.css 먼저 업로드 (토큰 매핑)
2. components.html 업로드 (컴포넌트 카탈로그)
3. screens/ 폴더 안의 화면들을 각각 업로드 (페이지 ref)

**옵션 C. GitHub 연결** (레포가 public 인 경우):
1. xnquiz 레포 URL 입력
2. 자동 감지 후 토큰/컴포넌트 추출

## 시안 작성 시 가이드 (claude.ai/design 안에서)

> "tokens.css 의 시맨틱 변수만 사용. 카드는 rounded-xl, 버튼은 rounded-lg.
> 한국어 카피 유지, 영문 라벨 금지 (SCORE_REVEAL 같은 시스템 용어 X).
> 도장/회전 같은 장식 요소 추가 금지 — 깔끔한 Toss 톤 유지."

## Anti-patterns

작업 시 피해야 할 것 (xnquiz 의 디자인 시스템 위반):

- 다크모드 (지원하지 않음)
- 가운뎃점(·) 으로 단어 구분
- 말줄임표(...) 사용 — "진행중"(O), "진행중..."(X)
- 시스템 용어 (전역/글로벌/디폴트) 노출 → "기본값" 으로
- 한자 stamp / serif display / 종이 텍스처 (xnquiz 톤과 거리감 큼)
- 학생 실데이터 (실명/실제 학번/실제 이메일) — 익명 (학생 A~L) 만

## 변경 이력

- v1.0 (2026-06-18) — 초기 패키지. tokens.css + components.html + screens/ × 6
