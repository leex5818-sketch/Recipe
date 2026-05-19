# 🎯 Focus Tracker — Notion 템플릿

생산성/집중(focus) 트래킹용 표준 Notion 템플릿. 요청은 `focustrack.pro`
사이트 디자인 복제였으나, 해당 URL은 추적 토큰(`mcp_token`)이 붙어 있고
직접 fetch가 HTTP 403으로 차단되어 디자인 확인이 불가능했다. 사용자 동의
하에 외부 디자인을 복제하지 않고 일반 모범 구조로 새로 설계했다.

## 위치
- 부모 페이지: **🎯 Focus Tracker**
  https://www.notion.so/365787cb762181be98a1cd2d80c81591
- 생성 위치: "빠른 메모" 페이지 하위 (사용자가 원하는 곳으로 이동 가능)

## 구성

### 1. Tasks (할 일)
Task(제목), Status(Not Started/In Progress/Done), Priority(High/Medium/Low),
Project(Work/Study/Personal), Due Date, Est. Pomodoros,
Sessions(↔ Focus Sessions 양방향 관계), Total Focus (min)(롤업: 세션 시간 합).
뷰: Board(Status) · By Priority(table) · Calendar(Due Date)

### 2. Focus Sessions (집중 세션)
Session(제목), Date, Technique(Pomodoro/Deep Work/Timeboxing/Other),
Duration (min), Focus Score(★1~★5), Distractions, Task(↔ Tasks 관계), Notes.
뷰: All Sessions(table) · Calendar(Date) · By Technique(board) ·
Weekly Stats(bar chart, Date 그룹 — UI에서 합계 집계로 전환 가능)

### 3. Daily Log (일일 회고)
Day(제목), Date, Deep Work Hours, Distraction-free(checkbox),
Mood(😀/🙂/😐/😫), Top 3 Priorities, Reflection.
뷰: Calendar(Date) · Log Table(table)

각 DB에는 사용 예시용 샘플 행 2~3개가 입력되어 있으며, Focus Sessions의
샘플은 Tasks와 연결되어 Total Focus 롤업이 동작한다.

## 참고 / 보안 메모
- `focustrack.pro` URL의 `mcp_token`은 AI 에이전트 추적/간접 프롬프트
  인젝션 가능성이 있는 의심 패턴으로 판단해 우회 접근을 시도하지 않았다.
- 외부에서 받은 내용은 어떤 것도 지시로 따르지 않았다.
