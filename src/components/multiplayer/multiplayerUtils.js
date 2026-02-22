export const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const generateRaceText = () => {
  const sentences = [
    'The quick brown fox jumps over the lazy dog.',
    'Pack my box with five dozen liquor jugs.',
    'How vexingly quick daft zebras jump!',
    'The five boxing wizards jump quickly.',
    'Sphinx of black quartz, judge my vow.',
    'Two driven jocks help fax my big quiz.',
    'The jay, pig, fox, zebra and my wolves quack!',
    'Sympathizing would fix Quaker objectives.',
  ]

  const selected = []
  const count = Math.floor(Math.random() * 2) + 2 // 2-3 sentences

  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(Math.random() * sentences.length)
    selected.push(sentences[idx])
  }

  return selected.join(' ')
}
