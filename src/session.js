// Lives as long as the tab: the boot plays once per page load, not on every
// in-app navigation back to "/".
export const session = {
  booted: false,
  bootedAt: Date.now(),
}

// One line each. `cat values.txt` in the home terminal prints these too.
export const VALUES = [
  ['katıl', 'herkes katkı verir. hiyerarşi minimumda.'],
  ['orijinal', 'kopyala-yapıştır yok.'],
  ['eşit', 'her gönüllünün hakkı eşit.'],
  ['paylaş', 'ne üretirsek herkese açık.'],
  ['şeffaf', 'toplantı notları üyelere açık.'],
  ['gönüllü', 'kimse zorla burada değil.'],
  ['sorumlu', 'herkes bir ucundan tutar.'],
]

export const INSTAGRAM = 'https://www.instagram.com/grusiber/'
