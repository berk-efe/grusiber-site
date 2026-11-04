// Lives as long as the tab: the boot plays once per page load, not on every
// in-app navigation back to "/".
export const session = {
  booted: false,
  bootedAt: Date.now(),
}

export const VALUES = [
  ['katılımcılık', 'herkes katkı verebilir. dikey hiyerarşiye gereğinden fazla takılmıyoruz; fikir iyiyse iyidir, kimin söylediği önemli değil.'],
  ['yenilikçilik', 'her etkinlikte, her projede yeni bir şey arıyoruz. ortaya ne çıkıyorsa içinde bir orijinallik olsun, kopyala-yapıştır değil.'],
  ['eşitlik', 'burada çalışan bütün gönüllülerin hakları eşit. saygı default ayar, opsiyonel değil.'],
  ['paylaşımcılık', 'yaptığımız her şey bütün üyelere ve giresun üniversitesi\'ne açık. ürettiğimizi paylaşırız, bencillik yok.'],
  ['şeffaflık', 'bütün toplantılar raporlanır, tutanaklar üyelere açık. belgelerde de anlaşmalarda da gizli kapaklı iş yok.'],
  ['gönüllülük', 'kimse zorla burada değil. herkes istediği için burada, o kadar.'],
  ['sorumluluk', 'herkes bir ucundan tutar. hepimiz büyük bir bütünün parçasıyız ve bunu ciddiye alıyoruz.'],
]
