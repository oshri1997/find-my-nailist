export interface CityEntry {
  slug: string
  name: string
  alt?: string[]
}

export const CITIES: CityEntry[] = [
  { slug: 'tel-aviv', name: 'תל אביב', alt: ['תל אביב-יפו', 'ת"א', 'יפו'] },
  { slug: 'jerusalem', name: 'ירושלים' },
  { slug: 'haifa', name: 'חיפה' },
  { slug: 'rishon-lezion', name: 'ראשון לציון', alt: ['ראשל"צ'] },
  { slug: 'petah-tikva', name: 'פתח תקווה', alt: ['פ"ת'] },
  { slug: 'ashdod', name: 'אשדוד' },
  { slug: 'netanya', name: 'נתניה' },
  { slug: 'beer-sheva', name: 'באר שבע' },
  { slug: 'bnei-brak', name: 'בני ברק' },
  { slug: 'herzliya', name: 'הרצליה' },
  { slug: 'ramat-gan', name: 'רמת גן' },
  { slug: 'givatayim', name: 'גבעתיים' },
  { slug: 'raanana', name: 'רעננה' },
  { slug: 'kfar-saba', name: 'כפר סבא' },
  { slug: 'yavne', name: 'יבנה' },
  { slug: 'rosh-haayin', name: 'ראש העין' },
  { slug: 'modiin', name: 'מודיעין', alt: ['מודיעין-מכבים-רעות'] },
  { slug: 'ashkelon', name: 'אשקלון' },
  { slug: 'holon', name: 'חולון' },
  { slug: 'bat-yam', name: 'בת ים' },
  { slug: 'rehovot', name: 'רחובות' },
  { slug: 'nes-ziona', name: 'נס ציונה' },
  { slug: 'lod', name: 'לוד' },
  { slug: 'ramla', name: 'רמלה' },
  { slug: 'kiryat-gat', name: 'קריית גת' },
]
