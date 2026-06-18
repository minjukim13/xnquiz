import {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption,
} from 'xn-quiz-prototype'

export function Results() {
  return (
    <div style={{ maxWidth: 560 }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>응시자</TableHead>
            <TableHead>제출 시각</TableHead>
            <TableHead style={{ textAlign: 'right' }}>점수</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell style={{ fontWeight: 600 }}>학생 A</TableCell>
            <TableCell>06.20 14:32</TableCell>
            <TableCell style={{ textAlign: 'right' }}>92</TableCell>
            <TableCell style={{ color: 'var(--primary)' }}>채점완료</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 600 }}>학생 B</TableCell>
            <TableCell>06.20 14:48</TableCell>
            <TableCell style={{ textAlign: 'right' }}>78</TableCell>
            <TableCell style={{ color: 'var(--primary)' }}>채점완료</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 600 }}>학생 C</TableCell>
            <TableCell>06.20 15:05</TableCell>
            <TableCell style={{ textAlign: 'right', color: 'var(--muted-foreground)' }}>-</TableCell>
            <TableCell style={{ color: 'var(--muted-foreground)' }}>진행중</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 600 }}>학생 D</TableCell>
            <TableCell>06.20 15:11</TableCell>
            <TableCell style={{ textAlign: 'right' }}>85</TableCell>
            <TableCell style={{ color: 'var(--primary)' }}>채점완료</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

export function WithFooter() {
  return (
    <div style={{ maxWidth: 560 }}>
      <Table>
        <TableCaption>3주차 쪽지시험 채점 요약</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>응시자</TableHead>
            <TableHead>제출 시각</TableHead>
            <TableHead style={{ textAlign: 'right' }}>점수</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell style={{ fontWeight: 600 }}>학생 E</TableCell>
            <TableCell>06.18 09:21</TableCell>
            <TableCell style={{ textAlign: 'right' }}>88</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 600 }}>학생 F</TableCell>
            <TableCell>06.18 09:40</TableCell>
            <TableCell style={{ textAlign: 'right' }}>96</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 600 }}>학생 G</TableCell>
            <TableCell>06.18 09:52</TableCell>
            <TableCell style={{ textAlign: 'right' }}>74</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>평균 점수</TableCell>
            <TableCell style={{ textAlign: 'right' }}>86</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
