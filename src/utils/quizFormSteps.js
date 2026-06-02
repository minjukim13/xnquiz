export function getCompletedSteps(form, questions) {
  const done = []
  if (form.title) done.push('info')
  if (questions.length > 0) done.push('questions')
  return done
}
