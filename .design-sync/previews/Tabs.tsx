import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from 'xn-quiz-prototype'

export function Basic() {
  return (
    <div style={{ maxWidth: 420 }}>
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">문항</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
          <TabsTrigger value="results">결과</TabsTrigger>
        </TabsList>
        <TabsContent value="questions">
          <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6, paddingTop: 8 }}>
            객관식 8문항, 단답형 2문항으로 구성된 중간고사 퀴즈입니다.
          </p>
        </TabsContent>
        <TabsContent value="settings">
          <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6, paddingTop: 8 }}>
            제한시간 30분, 재응시 1회 허용, 마감 후 자동 제출됩니다.
          </p>
        </TabsContent>
        <TabsContent value="results">
          <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6, paddingTop: 8 }}>
            23명 응시 완료, 평균 82점, 미채점 3건이 남아 있습니다.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function LineVariant() {
  return (
    <div style={{ maxWidth: 420 }}>
      <Tabs defaultValue="all">
        <TabsList variant="line">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="grading">채점 대기</TabsTrigger>
          <TabsTrigger value="done">채점 완료</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6, paddingTop: 8 }}>
            전체 응시자 45명의 답안과 진행 상태를 한눈에 확인합니다.
          </p>
        </TabsContent>
        <TabsContent value="grading">
          <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6, paddingTop: 8 }}>
            서술형 답안 12건이 교수자 채점을 기다리고 있습니다.
          </p>
        </TabsContent>
        <TabsContent value="done">
          <p style={{ color: 'var(--secondary-foreground)', lineHeight: 1.6, paddingTop: 8 }}>
            채점이 끝난 응시자에게는 점수가 즉시 공개됩니다.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
