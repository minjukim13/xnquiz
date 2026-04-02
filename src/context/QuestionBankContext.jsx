import { createContext, useContext, useState, useEffect } from 'react'
import { MOCK_BANKS, MOCK_BANK_QUESTIONS } from '../data/mockData'

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
      return loaded.map(q => ({ difficulty: 'medium', groupTag: '', ...q }))
    } catch { return MOCK_BANK_QUESTIONS }
  })

  useEffect(() => {
    localStorage.setItem(LS_BANKS_KEY, JSON.stringify(banks))
  }, [banks])

  useEffect(() => {
    localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify(questions))
  }, [questions])

  const addBank = (bank) => setBanks(prev => [...prev, bank])

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

  const getBankQuestions = (bankId) =>
    questions.filter(q => q.bankId === bankId)

  const getBankById = (bankId) =>
    banks.find(b => b.id === bankId)

  return (
    <QuestionBankContext.Provider value={{
      banks,
      questions,
      addBank,
      deleteBank,
      addQuestions,
      updateQuestion,
      deleteQuestion,
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
