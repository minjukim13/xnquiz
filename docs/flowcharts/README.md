# XN Quizzes — 화면 흐름도 (Mermaid)

내부 검토용. FigJam에 import하여 사용.

## 파일 목록

| 파일 | 내용 |
|------|------|
| `flow_01_sitemap.mmd` | 전체 페이지 구조 및 라우트 맵 |
| `flow_02_instructor.mmd` | 교수자 퀴즈 관리 흐름 (생성→발행→채점→통계) |
| `flow_03_student.mmd` | 학생 퀴즈 응시 흐름 (목록→응시→제출→결과) |
| `flow_04_questionbank.mmd` | 문제은행 관리 흐름 (목록-상세-문항 CRUD) |

## 노드 색상 범례

| 색상 | 의미 |
|------|------|
| indigo (#EEF2FF) | 페이지 컴포넌트 |
| yellow (#FEF9C3) | 모달 |
| green (#DCFCE7) | 상태 변경 / 저장 액션 |
| red (#FEE2E2) | 삭제 / 경고 / 오류 |
| 밝은 green (#F0FDF4) | 진입점 (START) |

## FigJam import 방법

1. FigJam 파일 열기
2. 상단 메뉴 Plugins → "Mermaid" 플러그인 실행
   - 없으면: Plugins → Browse plugins → "Mermaid" 검색 → Install
3. `.mmd` 파일 내용 전체 복사
4. 플러그인 텍스트 박스에 붙여넣기
5. "Generate" 버튼 클릭
6. FigJam 캔버스에 자동 배치됨

## mermaid.live 미리보기

브라우저에서 확인: https://mermaid.live
- `.mmd` 파일 내용을 왼쪽 에디터에 붙여넣으면 오른쪽에 렌더링
