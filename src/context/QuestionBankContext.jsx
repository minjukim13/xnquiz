import { useState, useEffect } from 'react'
import { MOCK_BANKS, MOCK_BANK_QUESTIONS, QUIZ_TYPES } from '../data/mockData'
import { QuestionBankContext } from './questionBank'
import { useRole } from './role'
import {
  listBanks,
  getBankQuestions as apiGetBankQuestions,
  createBank as apiCreateBank,
  updateBank as apiUpdateBank,
  deleteBank as apiDeleteBank,
  createBankQuestion as apiCreateBankQuestion,
  updateBankQuestion as apiUpdateBankQuestion,
  deleteBankQuestion as apiDeleteBankQuestion,
} from '@/lib/data'

const LS_BANKS_KEY = 'xnq_banks_v3'
const LS_QUESTIONS_KEY = 'xnq_bank_questions_v4'
const MODE = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

export function QuestionBankProvider({ children }) {
  const { role } = useRole()

  const [banks, setBanks] = useState(() => {
    if (MODE === 'api') return []
    try {
      const raw = localStorage.getItem(LS_BANKS_KEY)
      const loaded = raw ? JSON.parse(raw) : MOCK_BANKS
      return loaded.map(b => ({ difficulty: '', ...b }))
    } catch { return MOCK_BANKS }
  })

  const [questions, setQuestions] = useState(() => {
    if (MODE === 'api') return []
    try {
      const raw = localStorage.getItem(LS_QUESTIONS_KEY)
      const loaded = raw ? JSON.parse(raw) : MOCK_BANK_QUESTIONS
      return loaded.map(q => {
        const mockQ = MOCK_BANK_QUESTIONS.find(m => m.id === q.id)
        const type = (q.type && QUIZ_TYPES[q.type]) ? q.type : (mockQ?.type || 'multiple_choice')
        return { difficulty: '', ...q, type }
      })
    } catch { return MOCK_BANK_QUESTIONS }
  })

  // api 모드: 서버에서 banks + 각 bank 의 questions 일괄 로드
  // 문제모음은 교수자 전용 (학생은 /api/banks 403). role 전환 시 재실행.
  useEffect(() => {
    if (MODE !== 'api') return
    if (role !== 'instructor') {
      setBanks([])
      setQuestions([])
      return
    }
    let mounted = true
    ;(async () => {
      try {
        // LTI 모드: 과목 스코프를 명시적으로 전달 (ADMIN 예외 로직은 courseCode 가 있어야 작동)
        const ltiCourseCode = typeof window !== 'undefined'
          ? localStorage.getItem('xnq_lti_course_code')
          : null
        const apiBanks = await listBanks(ltiCourseCode ? { courseCode: ltiCourseCode } : {})
        if (!mounted) return
        setBanks(apiBanks)
        const perBank = await Promise.all(apiBanks.map(b => apiGetBankQuestions(b.id)))
        if (mounted) setQuestions(perBank.flat())
      } catch (err) {
        console.error('[QuestionBankContext] api 로드 실패', err)
      }
    })()
    return () => { mounted = false }
  }, [role])

  // localStorage 싱크 — mock 모드만 (api 모드는 서버 권위)
  useEffect(() => {
    if (MODE === 'api') return
    localStorage.setItem(LS_BANKS_KEY, JSON.stringify(banks))
  }, [banks])

  useEffect(() => {
    if (MODE === 'api') return
    localStorage.setItem(LS_QUESTIONS_KEY, JSON.stringify(questions))
  }, [questions])

  const addBank = async (bank) => {
    if (MODE === 'api') {
      const created = await apiCreateBank({
        name: bank.name,
        courseCode: bank.courseCode || (bank.course ? String(bank.course).split(/\s+/)[0].toUpperCase() : ''),
        difficulty: bank.difficulty || null,
      })
      setBanks(prev => [...prev, created])
      return created
    }
    setBanks(prev => [...prev, bank])
    return bank
  }

  const updateBank = async (id, updated) => {
    if (MODE === 'api') {
      const patched = await apiUpdateBank(id, {
        ...(updated.name !== undefined ? { name: updated.name } : {}),
        ...(updated.difficulty !== undefined ? { difficulty: updated.difficulty || null } : {}),
        ...(updated.courseCode ? { courseCode: updated.courseCode } : {}),
      })
      setBanks(prev => prev.map(b => b.id === id ? { ...b, ...patched } : b))
      return patched
    }
    setBanks(prev => prev.map(b => b.id === id ? { ...b, ...updated } : b))
  }

  const deleteBank = async (bankId) => {
    if (MODE === 'api') {
      await apiDeleteBank(bankId)
    }
    setBanks(prev => prev.filter(b => b.id !== bankId))
    setQuestions(prev => prev.filter(q => q.bankId !== bankId))
  }

  const addQuestions = async (newQuestions) => {
    if (MODE === 'api') {
      const created = []
      for (const q of newQuestions) {
        const { id: _id, bankId, ...rest } = q   
        const saved = await apiCreateBankQuestion(bankId, rest)
        created.push({ ...saved, bankId })
      }
      setQuestions(prev => [...prev, ...created])
      return created
    }
    setQuestions(prev => [...prev, ...newQuestions])
    return newQuestions
  }

  const updateQuestion = async (id, updated) => {
    if (MODE === 'api') {
      const { bankId: _b, id: _id, ...body } = updated   
      const patched = await apiUpdateBankQuestion(id, body)
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patched } : q))
      return patched
    }
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q))
  }

  const deleteQuestion = async (id) => {
    if (MODE === 'api') {
      await apiDeleteBankQuestion(id)
    }
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

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
