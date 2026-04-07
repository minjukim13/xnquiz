import { createContext, useContext, useState, useEffect } from 'react'
import { MOCK_BANKS, MOCK_BANK_QUESTIONS, BANK_GROUP_MAP_EXPORTED as BANK_GROUP_MAP, QUIZ_TYPES } from '../data/mockData'

const LS_BANKS_KEY = 'xnq_banks'
const LS_QUESTIONS_KEY = 'xnq_bank_questions'

const QuestionBankContext = createContext(null)

export function QuestionBankProvider({ children }) {
  const [banks, setBanks] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_BANKS_KEY)
      return raw ? JSON.parse(raw) : MOCK_BANKS
    } catch { return MOCK_BANKS }
  })

  const [questions, setQuestions] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_QUESTIONS_KEY)
      const loaded = raw ? JSON.parse(raw) : MOCK_BANK_QUESTIONS
      // migration: difficulty/groupTag 필드 없는 기존 데이터에 기본값 주입
      // groupTag가 빈 경우 mock 원본 값으로 복원
      return loaded.map(q => {
        const mockQ = MOCK_BANK_QUESTIONS.find(m => m.id === q.id)
        const groupTag = q.groupTag || mockQ?.groupTag || ''
        const type = (q.type && QUIZ_TYPES[q.type]) ? q.type : (mockQ?.type || 'multiple_choice')
        return { difficulty: '', ...q, groupTag, type }
      })
    } catch { return MOCK_BANK_QUESTIONS }
  })

  useEffect(() => {
    localStorage.setItem(LS_BANKS_KEY, JSON.stringify(banks))
  }, [banks])

  useEffect(() => {
    localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify(questions))
  }, [questions])

  const addBank = (bank) => setBanks(prev => [...prev, bank])

  const updateBank = (id, updated) =>
    setBanks(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b))

  const deleteBank = (bankId) => {
    setBanks(prev => prev.filter(b => b.id !== bankId))
    setQuestions(prev => prev.filter(q => q.bankId !== bankId))
  }

  const addQuestions = (newQuestions) =>
    setQuestions(prev => [...prev, ...newQuestions])

  const updateQuestion = (id, updated) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q))

  const deleteQuestion = (id) =>
    setQuestions(prev => prev.filter(q => q.id !== id))

  const reorderQuestions = (bankId, fromIndex, toIndex) => {
    setQuestions(prev => {
      const bankQs = prev.filter(q => q.bankId === bankId)
      const others = prev.filter(q => q.bankId !== bankId)
      const next = [...bankQs]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return [...others, ...next]
    })
  }

  const getBankQuestions = (bankId) =>
    questions.filter(q => q.bankId === bankId)

  const getBankById = (bankId) =>
    banks.find(b => b.id === bankId)

  return (
    <QuestionBankContext.Provider value={{
      banks,
      questions,
      addBank,
      updateBank,
      deleteBank,
      addQuestions,
      updateQuestion,
      deleteQuestion,
      reorderQuestions,
      getBankQuestions,
      getBankById,
    }}>
      {children}
    </QuestionBankContext.Provider>
  )
}

export function useQuestionBank() {
  return useContext(QuestionBankContext)
}
