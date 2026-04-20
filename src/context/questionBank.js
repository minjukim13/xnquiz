import { createContext, useContext } from 'react'

export const QuestionBankContext = createContext(null)

export function useQuestionBank() {
  return useContext(QuestionBankContext)
}
