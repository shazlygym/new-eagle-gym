import { SHARED, type Food, type FoodCategory, type FoodPortion } from './schema'

// Egyptian food table. Values are per 100 g (per 100 ml for drinks).
//
// Where a food exists in USDA FoodData Central — every raw ingredient, every
// plain cooked staple, every packaged item — the row is that entry's figures.
// That is deliberately the same source MyFitnessPal's verified (green-tick)
// entries are built from, so a number here and a number there agree. MFP's
// wider database is user-submitted and openly contradicts itself, which makes
// it a reference you cannot copy from; USDA is what its trustworthy half
// resolves to.
//
// Composed Egyptian dishes have no USDA entry, so they are built from their
// ingredients as actually cooked here — home cooking uses far more oil and
// samna than a generic "cooked vegetables" entry assumes, and a table that
// ignores that under-counts a day by hundreds of calories. That licence covers
// *added fat only*: a staple boiled in plain water carries the USDA figure
// unchanged.
//
// Household portions matter more than the per-100 g figures: nobody weighs a
// loaf of baladi bread or a plate of koshari, so every common dish carries the
// measure people actually think in. Spoon portions are one tablespoon.

type Seed = [
  id: string,
  ar: string,
  en: string,
  category: FoodCategory,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  portions?: FoodPortion[],
]

const plate = (grams: number): FoodPortion => ({
  nameAr: 'طبق',
  nameEn: 'plate',
  grams,
})
const cup = (grams: number): FoodPortion => ({
  nameAr: 'كوب',
  nameEn: 'cup',
  grams,
})
const piece = (grams: number): FoodPortion => ({
  nameAr: 'قطعة',
  nameEn: 'piece',
  grams,
})
const spoon = (grams: number): FoodPortion => ({
  nameAr: 'ملعقة',
  nameEn: 'spoon',
  grams,
})
const loaf = (grams: number): FoodPortion => ({
  nameAr: 'رغيف',
  nameEn: 'loaf',
  grams,
})
const medium = (grams: number): FoodPortion => ({
  nameAr: 'حبة متوسطة',
  nameEn: 'medium',
  grams,
})
const glass = (grams: number): FoodPortion => ({
  nameAr: 'كوباية',
  nameEn: 'glass',
  grams,
})
const sandwich = (grams: number): FoodPortion => ({
  nameAr: 'ساندويتش',
  nameEn: 'sandwich',
  grams,
})

const SEEDS: Seed[] = [
  // ─── الأطباق المصرية ────────────────────────────────────────────────────────
  [
    'koshari',
    'كشري',
    'Koshari',
    'egyptian',
    168,
    5.2,
    28,
    4.2,
    [plate(400), { nameAr: 'طبق كبير', nameEn: 'large plate', grams: 600 }],
  ],
  ['foul-medames', 'فول مدمس', 'Foul Medames', 'egyptian', 132, 7.8, 19, 4.6, [plate(200), spoon(30)]],
  ['foul-bezeit', 'فول بالزيت', 'Foul with Oil', 'egyptian', 178, 7.2, 17.5, 10.5, [plate(200)]],
  ['taameya', 'طعمية', 'Taameya (Falafel)', 'egyptian', 330, 13, 27, 19, [piece(25)]],
  // The soup as served, not the leaf: it is thinned with a lot of broth, so the
  // 4.65 g protein of raw jute mallow does not survive into the bowl.
  ['molokhia', 'ملوخية', 'Molokhia', 'egyptian', 60, 2.5, 5.5, 3.6, [plate(250), cup(200)]],
  ['bamia', 'بامية بالصلصة', 'Okra Stew', 'egyptian', 105, 3.4, 8.5, 6.6, [plate(250)]],
  ['mahshi-waraq', 'محشي ورق عنب', 'Stuffed Vine Leaves', 'egyptian', 195, 3.6, 24, 9.5, [piece(20)]],
  ['mahshi-koronb', 'محشي كرنب', 'Stuffed Cabbage', 'egyptian', 168, 3.4, 22, 7.6, [piece(35)]],
  ['mahshi-kosa', 'محشي كوسة', 'Stuffed Courgette', 'egyptian', 148, 4.2, 19, 6.4, [piece(70)]],
  // The everyday version is fried aubergine in tomato sauce with no meat in it.
  ['mesa2a', 'مسقعة', "Mesa'aa", 'egyptian', 175, 1.3, 12, 12.8, [plate(250)]],
  ['bechamel', 'مكرونة بشاميل', 'Béchamel Pasta', 'egyptian', 215, 9.5, 22, 10.5, [plate(300), piece(150)]],
  ['roz-moammar', 'رز معمر', 'Roz Moammar', 'egyptian', 240, 6.5, 28, 11.5, [plate(250)]],
  ['fatta', 'فتة باللحمة', 'Fatta with Meat', 'egyptian', 215, 10.5, 22, 9.8, [plate(300)]],
  ['hamam-mahshi', 'حمام محشي', 'Stuffed Pigeon', 'egyptian', 225, 19, 12, 11.5, [piece(250)]],
  ['kebda-eskandarani', 'كبدة إسكندراني', 'Alexandrian Liver', 'egyptian', 205, 21, 5.5, 11, [plate(150), sandwich(180)]],
  ['sogo2', 'سجق', "Sogo' (Sausage)", 'egyptian', 285, 16, 4.5, 23, [plate(150), sandwich(180)]],
  ['hawawshi', 'حواوشي', 'Hawawshi', 'egyptian', 265, 13, 26, 12.5, [piece(200)]],
  ['shawarma-lahma', 'شاورما لحمة', 'Beef Shawarma', 'egyptian', 235, 17, 12, 13.5, [sandwich(220)]],
  ['shawarma-firakh', 'شاورما فراخ', 'Chicken Shawarma', 'egyptian', 195, 19, 11, 8.5, [sandwich(220)]],
  ['kofta', 'كفتة مشوية', 'Grilled Kofta', 'egyptian', 245, 18, 3.5, 18, [piece(60), plate(200)]],
  ['mombar', 'ممبار', 'Mombar', 'egyptian', 310, 8.5, 26, 19.5, [piece(60)]],
  ['torly', 'خضار مشكل بالصلصة', 'Mixed Vegetable Stew', 'egyptian', 92, 2.8, 10, 4.8, [plate(250)]],
  ['shorbet-lesan', 'شوربة لسان عصفور', 'Orzo Soup', 'egyptian', 68, 2.6, 10.5, 1.8, [cup(200)]],
  ['shorbet-firakh', 'شوربة فراخ', 'Chicken Soup', 'egyptian', 42, 3.2, 3.4, 1.7, [cup(200)]],
  ['batates-mohamara', 'بطاطس محمرة', 'Fried Potatoes', 'egyptian', 285, 3.4, 34, 15, [plate(180)]],
  ['sambousek', 'سمبوسك', 'Sambousek', 'egyptian', 340, 8.5, 30, 20.5, [piece(30)]],
  ['feteer', 'فطير مشلتت', 'Feteer Meshaltet', 'egyptian', 395, 7.5, 40, 22, [piece(150)]],
  ['eish-shamsi', 'عيش شمسي', 'Shamsi Bread', 'egyptian', 260, 8.5, 52, 1.4, [loaf(120)]],

  // ─── الخبز والنشويات ────────────────────────────────────────────────────────
  ['eish-baladi', 'عيش بلدي', 'Baladi Bread', 'carbs', 250, 8.4, 51, 1.3, [loaf(90)]],
  ['eish-fino', 'عيش فينو', 'Fino Roll', 'carbs', 275, 8.8, 53, 2.8, [piece(60)]],
  ['eish-sham', 'عيش شامي', 'Pita Bread', 'carbs', 270, 9, 54, 1.5, [loaf(70)]],
  ['toast', 'توست أبيض', 'White Toast', 'carbs', 265, 8.5, 49, 3.5, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 28 }]],
  ['roz-abyad', 'رز أبيض مطبوخ', 'Cooked White Rice', 'carbs', 145, 2.8, 30, 1.6, [cup(180), plate(250)]],
  // Boiled in plain water, so this one carries the reference figure untouched —
  // the added-fat licence in the header does not apply.
  ['makarona', 'مكرونة مسلوقة', 'Boiled Pasta', 'carbs', 157, 5.8, 30.9, 0.9, [plate(250), cup(180)]],
  ['batates-maslou2a', 'بطاطس مسلوقة', 'Boiled Potato', 'carbs', 86, 1.9, 20, 0.1, [medium(150)]],
  ['belila', 'بليلة', 'Belila', 'carbs', 118, 3.8, 24, 0.9, [cup(200)]],
  ['shofan', 'شوفان', 'Oats (dry)', 'carbs', 379, 13, 67, 6.5, [cup(80), spoon(6)]],
  ['cornflakes', 'كورن فليكس', 'Cornflakes', 'carbs', 357, 7.5, 84, 0.4, [cup(35)]],
  ['batata-helwa', 'بطاطا حلوة', 'Sweet Potato', 'carbs', 90, 2, 21, 0.1, [medium(150)]],

  // ─── البروتين ───────────────────────────────────────────────────────────────
  ['sedr-firakh', 'صدور فراخ مشوية', 'Grilled Chicken Breast', 'protein', 165, 31, 0, 3.6, [piece(150)]],
  ['werk-firakh', 'ورك فراخ', 'Chicken Thigh', 'protein', 209, 26, 0, 11, [piece(120)]],
  ['firakh-mohamara', 'فراخ محمرة', 'Fried Chicken', 'protein', 265, 24, 8, 15, [piece(150)]],
  ['firakh-panne', 'بانيه', 'Chicken Pané', 'protein', 290, 22, 16, 16, [piece(120)]],
  ['lahma-baqari', 'لحمة بقري', 'Beef', 'protein', 250, 26, 0, 16, [piece(150)]],
  ['lahma-mafrouma', 'لحمة مفرومة', 'Minced Beef', 'protein', 245, 22, 0, 17, [plate(150)]],
  ['lahma-danii', 'لحمة ضاني', 'Lamb', 'protein', 294, 25, 0, 21, [piece(150)]],
  ['bolti', 'سمك بلطي مشوي', 'Grilled Tilapia', 'protein', 128, 26, 0, 2.7, [piece(200)]],
  ['bolti-mo2li', 'سمك بلطي مقلي', 'Fried Tilapia', 'protein', 215, 24, 6, 11, [piece(200)]],
  ['bouri', 'سمك بوري', 'Mullet', 'protein', 150, 24, 0, 5.5, [piece(200)]],
  // Drained solids, which is what ends up on the plate — and what the standard
  // 140 g Egyptian tin leaves you with.
  ['tuna-zeit', 'تونة بالزيت', 'Tuna in Oil', 'protein', 198, 29, 0, 8.2, [{ nameAr: 'علبة', nameEn: 'can', grams: 100 }]],
  ['tuna-maya', 'تونة بالماء', 'Tuna in Water', 'protein', 116, 26, 0, 1, [{ nameAr: 'علبة', nameEn: 'can', grams: 100 }]],
  ['gambari', 'جمبري', 'Shrimp', 'protein', 99, 21, 0.2, 1.4, [plate(150)]],
  ['calamari', 'كاليماري', 'Calamari', 'protein', 175, 15, 8, 9, [plate(150)]],
  ['beid-maslou2', 'بيض مسلوق', 'Boiled Egg', 'protein', 155, 13, 1.1, 11, [piece(55)]],
  ['beid-mo2li', 'بيض مقلي', 'Fried Egg', 'protein', 200, 13, 1, 16, [piece(60)]],
  ['beid-omelette', 'أومليت', 'Omelette', 'protein', 185, 12, 2, 14, [piece(120)]],
  ['whey', 'واي بروتين', 'Whey Protein', 'protein', 390, 78, 8, 5, [{ nameAr: 'سكوب', nameEn: 'scoop', grams: 30 }]],

  // ─── الألبان ────────────────────────────────────────────────────────────────
  ['laban-kamel', 'لبن كامل الدسم', 'Whole Milk', 'dairy', 62, 3.3, 4.7, 3.4, [cup(240), glass(250)]],
  ['laban-khali', 'لبن خالي الدسم', 'Skimmed Milk', 'dairy', 35, 3.4, 5, 0.2, [cup(240)]],
  ['zabadi', 'زبادي', 'Yoghurt', 'dairy', 61, 3.5, 4.7, 3.3, [{ nameAr: 'علبة', nameEn: 'pot', grams: 105 }]],
  ['zabadi-yunani', 'زبادي يوناني', 'Greek Yoghurt', 'dairy', 97, 9, 3.9, 5, [{ nameAr: 'علبة', nameEn: 'pot', grams: 170 }]],
  ['gebna-beida', 'جبنة بيضاء', 'White Cheese', 'dairy', 264, 14, 3, 21, [spoon(30), piece(40)]],
  ['gebna-2arish', 'جبنة قريش', 'Areesh Cheese', 'dairy', 98, 14, 3.5, 3.2, [spoon(30), plate(120)]],
  ['gebna-roumi', 'جبنة رومي', 'Roumi Cheese', 'dairy', 390, 26, 2.5, 31, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 25 }]],
  ['gebna-mosarela', 'موتزاريلا', 'Mozzarella', 'dairy', 300, 22, 2.2, 22, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 28 }]],
  ['labna', 'لبنة', 'Labneh', 'dairy', 174, 6, 6, 14, [spoon(15)]],
  ['gebna-mothalathat', 'جبنة مثلثات', 'Triangle Cheese', 'dairy', 235, 10, 6, 19, [piece(17)]],
  ['2eshta', 'قشطة', 'Cream', 'dairy', 340, 2.5, 3.5, 35, [spoon(15)]],

  // ─── البقوليات ──────────────────────────────────────────────────────────────
  ['3ads-asfar', 'شوربة عدس', 'Lentil Soup', 'legumes', 88, 5.5, 13, 1.8, [cup(220), plate(300)]],
  ['3ads-bagebba', 'عدس بجبة', 'Lentils with Rice', 'legumes', 142, 5.4, 25, 2.6, [plate(250)]],
  ['lobia', 'لوبيا بالصلصة', 'Black-eyed Peas', 'legumes', 118, 6.5, 18, 2.4, [plate(250)]],
  ['fasolia-beida', 'فاصوليا بيضاء', 'White Beans', 'legumes', 125, 7, 19, 2.6, [plate(250)]],
  ['hommos-sham', 'حمص الشام', 'Chickpeas', 'legumes', 164, 8.9, 27, 2.6, [cup(160)]],
  ['tirmis', 'ترمس', 'Lupini Beans', 'legumes', 119, 16, 10, 2.9, [cup(150)]],

  // ─── الخضار ─────────────────────────────────────────────────────────────────
  ['salata-baladi', 'سلطة بلدي', 'Baladi Salad', 'vegetables', 32, 1.2, 6, 0.4, [plate(200)]],
  ['salata-tahina', 'سلطة طحينة', 'Tahini Salad', 'vegetables', 175, 4.5, 8, 14.5, [spoon(30), plate(120)]],
  ['tomatem', 'طماطم', 'Tomato', 'vegetables', 18, 0.9, 3.9, 0.2, [medium(120)]],
  ['khiar', 'خيار', 'Cucumber', 'vegetables', 15, 0.7, 3.6, 0.1, [medium(120)]],
  ['gazar', 'جزر', 'Carrot', 'vegetables', 41, 0.9, 10, 0.2, [medium(70)]],
  ['basal', 'بصل', 'Onion', 'vegetables', 40, 1.1, 9.3, 0.1, [medium(110)]],
  ['sabanekh', 'سبانخ', 'Spinach', 'vegetables', 23, 2.9, 3.6, 0.4, [cup(30)]],
  ['koronb', 'كرنب', 'Cabbage', 'vegetables', 25, 1.3, 5.8, 0.1, [cup(90)]],
  ['bazingan-mashwi', 'باذنجان مشوي', 'Grilled Aubergine', 'vegetables', 35, 1, 8.7, 0.2, [plate(150)]],
  ['felfel', 'فلفل ألوان', 'Bell Pepper', 'vegetables', 26, 1, 6, 0.3, [medium(120)]],

  // ─── الفاكهة ────────────────────────────────────────────────────────────────
  ['mooz', 'موز', 'Banana', 'fruit', 89, 1.1, 23, 0.3, [medium(120)]],
  ['tofah', 'تفاح', 'Apple', 'fruit', 52, 0.3, 14, 0.2, [medium(180)]],
  ['borto2an', 'برتقال', 'Orange', 'fruit', 47, 0.9, 12, 0.1, [medium(150)]],
  ['3enab', 'عنب', 'Grapes', 'fruit', 69, 0.7, 18, 0.2, [cup(150)]],
  ['manga', 'مانجو', 'Mango', 'fruit', 60, 0.8, 15, 0.4, [medium(200)]],
  ['balah', 'بلح', 'Dates', 'fruit', 282, 2.5, 75, 0.4, [piece(8)]],
  ['batteekh', 'بطيخ', 'Watermelon', 'fruit', 30, 0.6, 7.6, 0.2, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 280 }]],
  ['shamam', 'شمام', 'Melon', 'fruit', 34, 0.8, 8, 0.2, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 200 }]],
  ['gawafa', 'جوافة', 'Guava', 'fruit', 68, 2.6, 14, 1, [medium(100)]],
  ['farawla', 'فراولة', 'Strawberry', 'fruit', 32, 0.7, 7.7, 0.3, [cup(150)]],
  ['ta7in-fakha', 'تين', 'Fig', 'fruit', 74, 0.8, 19, 0.3, [medium(50)]],
  ['khokh', 'خوخ', 'Peach', 'fruit', 39, 0.9, 10, 0.3, [medium(150)]],

  // ─── الدهون والمكسرات ───────────────────────────────────────────────────────
  ['zeit-zeitoon', 'زيت زيتون', 'Olive Oil', 'fats', 884, 0, 0, 100, [spoon(14)]],
  ['zeit-3ebbad', 'زيت عباد الشمس', 'Sunflower Oil', 'fats', 884, 0, 0, 100, [spoon(14)]],
  ['samna', 'سمنة', 'Ghee', 'fats', 900, 0, 0, 100, [spoon(14)]],
  ['zebda', 'زبدة', 'Butter', 'fats', 717, 0.9, 0.1, 81, [spoon(14)]],
  ['tehina', 'طحينة', 'Tahini', 'fats', 595, 17, 21, 54, [spoon(15)]],
  ['fool-sudani', 'فول سوداني', 'Peanuts', 'fats', 567, 26, 16, 49, [cup(140), spoon(15)]],
  ['zebdet-fool', 'زبدة فول سوداني', 'Peanut Butter', 'fats', 588, 25, 20, 50, [spoon(16)]],
  ['loz', 'لوز', 'Almonds', 'fats', 579, 21, 22, 50, [spoon(12)]],
  ['3en-gamal', 'عين جمل', 'Walnuts', 'fats', 654, 15, 14, 65, [spoon(12)]],
  ['zeitoon', 'زيتون', 'Olives', 'fats', 115, 0.8, 6, 11, [piece(4)]],
  ['mayonnaise', 'مايونيز', 'Mayonnaise', 'fats', 680, 1, 1.5, 75, [spoon(14)]],

  // ─── الحلويات ───────────────────────────────────────────────────────────────
  ['basbousa', 'بسبوسة', 'Basbousa', 'sweets', 350, 4.5, 52, 14, [piece(70)]],
  ['konafa', 'كنافة', 'Konafa', 'sweets', 390, 6, 48, 19, [piece(100)]],
  ['ba2lawa', 'بقلاوة', 'Baklava', 'sweets', 430, 6.5, 45, 25, [piece(40)]],
  ['om-ali', 'أم علي', 'Om Ali', 'sweets', 285, 6, 32, 15, [cup(200)]],
  ['roz-belaban', 'أرز باللبن', 'Rice Pudding', 'sweets', 135, 3.2, 22, 3.8, [cup(180)]],
  ['mahalabeya', 'مهلبية', 'Mahalabeya', 'sweets', 118, 3, 19, 3.4, [cup(150)]],
  ['zalabya', 'زلابية', 'Zalabya', 'sweets', 380, 5, 47, 19, [piece(25)]],
  ['gateau', 'كيك', 'Cake', 'sweets', 370, 5, 50, 17, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 80 }]],
  [
    'shokolata',
    'شوكولاتة بالحليب',
    'Milk Chocolate',
    'sweets',
    535,
    7.6,
    59,
    30,
    [{ nameAr: 'لوح صغير', nameEn: 'small bar', grams: 40 }],
  ],
  ['biscuit', 'بسكويت', 'Biscuits', 'sweets', 480, 6.5, 66, 21, [piece(12)]],
  ['ice-cream', 'آيس كريم', 'Ice Cream', 'sweets', 207, 3.5, 24, 11, [cup(120)]],
  ['3asal-abyad', 'عسل نحل', 'Honey', 'sweets', 304, 0.3, 82, 0, [spoon(21)]],
  ['3asal-eswed', 'عسل أسود', 'Black Treacle', 'sweets', 290, 0, 75, 0.1, [spoon(20)]],
  ['sokkar', 'سكر', 'Sugar', 'sweets', 387, 0, 100, 0, [spoon(12), { nameAr: 'معلقة صغيرة', nameEn: 'teaspoon', grams: 5 }]],

  // ─── المشروبات ──────────────────────────────────────────────────────────────
  ['shay-sokkar', 'شاي بسكر', 'Tea with Sugar', 'drinks', 30, 0.1, 7.6, 0, [glass(200)]],
  ['shay-sada', 'شاي سادة', 'Tea, no sugar', 'drinks', 1, 0, 0.2, 0, [glass(200)]],
  ['2ahwa', 'قهوة تركي بسكر', 'Turkish Coffee', 'drinks', 35, 0.2, 8.5, 0.1, [{ nameAr: 'فنجان', nameEn: 'cup', grams: 80 }]],
  ['nescafe-laban', 'نسكافيه باللبن', 'Nescafé with Milk', 'drinks', 62, 2, 9, 2, [glass(200)]],
  ['3asir-2asab', 'عصير قصب', 'Sugarcane Juice', 'drinks', 74, 0.2, 18, 0.1, [glass(250)]],
  ['3asir-mango', 'عصير مانجو', 'Mango Juice', 'drinks', 54, 0.3, 13, 0.2, [glass(250)]],
  ['3asir-borto2an', 'عصير برتقال', 'Orange Juice', 'drinks', 45, 0.7, 10, 0.2, [glass(250)]],
  ['cola', 'كوكاكولا', 'Cola', 'drinks', 42, 0, 10.6, 0, [{ nameAr: 'علبة', nameEn: 'can', grams: 330 }]],
  ['cola-diet', 'دايت كولا', 'Diet Cola', 'drinks', 0.4, 0, 0.1, 0, [{ nameAr: 'علبة', nameEn: 'can', grams: 330 }]],
  ['sobia', 'سوبيا', 'Sobia', 'drinks', 88, 1.6, 15, 2.4, [glass(250)]],
  ['3ergsous', 'عرقسوس', 'Liquorice Drink', 'drinks', 38, 0.1, 9.5, 0, [glass(250)]],
  ['karkade', 'كركديه بسكر', 'Hibiscus with Sugar', 'drinks', 28, 0, 7, 0, [glass(250)]],
  [
    'laban-shokolata',
    'لبن بالشوكولاتة',
    'Chocolate Milk',
    'drinks',
    83,
    3.2,
    12,
    2.5,
    [{ nameAr: 'علبة', nameEn: 'carton', grams: 250 }],
  ],
  ['maya', 'مياه', 'Water', 'drinks', 0, 0, 0, 0, [glass(250)]],

  // ─── الوجبات السريعة ────────────────────────────────────────────────────────
  ['pizza', 'بيتزا', 'Pizza', 'fastfood', 266, 11, 33, 10, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 110 }]],
  ['burger', 'برجر لحمة', 'Beef Burger', 'fastfood', 295, 17, 24, 15, [piece(180)]],
  [
    'batates-mac',
    'بطاطس محمرة (فرايز)',
    'French Fries',
    'fastfood',
    312,
    3.4,
    41,
    15,
    [{ nameAr: 'وسط', nameEn: 'medium', grams: 115 }],
  ],
  ['crispy', 'دجاج كرسبي', 'Crispy Chicken', 'fastfood', 297, 20, 18, 17, [piece(120)]],
  ['shipsy', 'شيبسي', 'Crisps', 'fastfood', 536, 6.6, 53, 34, [{ nameAr: 'كيس صغير', nameEn: 'small bag', grams: 30 }]],
  ['crepe', 'كريب فراخ', 'Chicken Crêpe', 'fastfood', 245, 12, 24, 11, [piece(300)]],
  ['ro2a2', 'رقاق باللحمة', 'Ro2a2 with Meat', 'egyptian', 265, 11, 24, 14, [plate(250)]],
  ['kaware3', 'كوارع', 'Trotters', 'egyptian', 215, 22, 1, 14, [plate(250)]],
  ['sayadeya', 'صيادية', 'Sayadeya Rice & Fish', 'egyptian', 185, 11, 24, 5.5, [plate(300)]],
  ['shakshouka', 'شكشوكة', 'Shakshouka', 'egyptian', 118, 6.5, 6, 7.8, [plate(220)]],
  ['bastirma-beid', 'بيض بالبسطرمة', 'Eggs with Bastirma', 'egyptian', 235, 17, 2, 18, [plate(150)]],
  ['bastirma', 'بسطرمة', 'Bastirma', 'egyptian', 240, 34, 2, 11, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 6 }]],
  ['kishk', 'كشك', 'Kishk', 'egyptian', 145, 6, 18, 5.5, [cup(200)]],
  ['macarona-salsa', 'مكرونة بالصلصة', 'Pasta with Tomato Sauce', 'egyptian', 155, 5, 26, 3.6, [plate(300)]],
  ['she3reya', 'أرز بالشعرية', 'Rice with Vermicelli', 'egyptian', 155, 3.2, 30, 2.6, [plate(250)]],
  ['kebab', 'كباب مشوي', 'Kebab', 'egyptian', 240, 20, 2, 17, [{ nameAr: 'سيخ', nameEn: 'skewer', grams: 80 }]],
  ['shish-tawook', 'شيش طاووق', 'Shish Tawook', 'egyptian', 165, 25, 3, 6, [{ nameAr: 'سيخ', nameEn: 'skewer', grams: 90 }]],
  ['reyash', 'ريش ضاني', 'Lamb Chops', 'egyptian', 305, 24, 0, 23, [piece(90)]],
  // Squab is dark, fatty meat — the old figure was closer to chicken breast.
  ['hamam-mashwi', 'حمام مشوي', 'Grilled Pigeon', 'egyptian', 215, 24, 0, 12, [piece(200)]],
  ['batates-tagen', 'طاجن بطاطس باللحمة', 'Potato & Meat Tagine', 'egyptian', 145, 8, 13, 6.8, [plate(300)]],
  ['fasolia-lahma', 'فاصوليا باللحمة', 'Beans with Meat', 'egyptian', 138, 9.5, 13, 5.4, [plate(280)]],
  ['moza', 'موزة مطبوخة', 'Braised Shank', 'egyptian', 235, 26, 2, 14, [piece(200)]],
  ['eish-belahma', 'عيش باللحمة (شاورما بلدي)', 'Baladi Meat Wrap', 'egyptian', 245, 15, 24, 10, [sandwich(220)]],
  ['gebna-tomatem', 'جبنة بالطماطم', 'Cheese with Tomato', 'egyptian', 155, 9, 6, 11, [plate(150)]],
  // Cured roe is far denser in protein than the old row implied; all three
  // figures move together so the line still adds up.
  ['batarekh', 'بطارخ', 'Bottarga', 'egyptian', 390, 40, 0, 25, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 8 }]],
  ['fesikh', 'فسيخ', 'Fesikh', 'egyptian', 210, 22, 0, 13, [piece(120)]],
  ['renga', 'رنجة', 'Herring', 'egyptian', 217, 24.6, 0, 12.4, [piece(100)]],

  // ─── بروتين إضافي ───────────────────────────────────────────────────────────
  ['kebda-firakh', 'كبدة فراخ', 'Chicken Liver', 'protein', 167, 25, 1, 6.5, [plate(150)]],
  ['sardin', 'سردين', 'Sardines', 'protein', 208, 25, 0, 11.5, [{ nameAr: 'علبة', nameEn: 'can', grams: 90 }]],
  // Cooked, to match the other fish rows — 205 was the raw figure.
  ['makarel', 'ماكريل', 'Mackerel', 'protein', 262, 23.9, 0, 17.8, [piece(150)]],
  ['filet-samak', 'فيليه سمك', 'Fish Fillet', 'protein', 105, 22, 0, 1.5, [piece(150)]],
  ['beid-abyad', 'بياض البيض', 'Egg White', 'protein', 52, 11, 0.7, 0.2, [piece(33)]],
  ['deek-roumi', 'ديك رومي', 'Turkey', 'protein', 135, 29, 0, 1.7, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 25 }]],
  ['lonshon', 'لانشون', 'Luncheon Meat', 'protein', 290, 12, 5, 24, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 20 }]],

  // ─── ألبان إضافية ───────────────────────────────────────────────────────────
  ['gebna-cheddar', 'جبنة شيدر', 'Cheddar', 'dairy', 402, 25, 1.3, 33, [{ nameAr: 'شريحة', nameEn: 'slice', grams: 25 }]],
  ['gebna-kraimi', 'جبنة كريمي', 'Cream Cheese', 'dairy', 342, 6, 4, 34, [spoon(15)]],
  ['laban-rayeb', 'لبن رايب', 'Rayeb Milk', 'dairy', 58, 3.3, 4.5, 3, [glass(200)]],
  ['laban-half', 'لبن نصف دسم', 'Semi-skimmed Milk', 'dairy', 50, 3.4, 4.8, 1.8, [cup(240)]],

  // ─── خبز إضافي ──────────────────────────────────────────────────────────────
  ['eish-sen', 'عيش سن', 'Wholemeal Bread', 'carbs', 247, 10, 45, 3.2, [loaf(90)]],
  ['croissant', 'كرواسون', 'Croissant', 'carbs', 406, 8, 46, 21, [piece(60)]],
  ['tortilla', 'تورتيلا', 'Tortilla', 'carbs', 310, 8, 51, 8, [piece(50)]],
  ['bakset', 'بقسماط', 'Rusk', 'carbs', 395, 12, 72, 6, [piece(15)]],
  // Both are sold dry and eaten cooked, and a plate portion only makes sense for
  // the cooked grain — which takes up roughly three times its weight in water.
  ['fereek', 'فريك', 'Freekeh', 'carbs', 118, 4.8, 23, 1, [plate(250)]],
  ['borghol', 'برغل', 'Bulgur', 'carbs', 83, 3.1, 18.6, 0.24, [plate(250)]],

  // ─── بقوليات وخضار إضافية ───────────────────────────────────────────────────
  ['fool-nabet', 'فول نابت', 'Sprouted Fava', 'legumes', 112, 7.5, 16, 1.8, [plate(200)]],
  ['besela', 'بسلة بالصلصة', 'Peas Stew', 'legumes', 108, 5.5, 14, 3.6, [plate(250)]],
  ['2ar3', 'قرع عسل', 'Pumpkin', 'vegetables', 26, 1, 6.5, 0.1, [cup(150)]],
  ['2arnabeet', 'قرنبيط', 'Cauliflower', 'vegetables', 25, 1.9, 5, 0.3, [cup(100)]],
  ['brokoli', 'بروكلي', 'Broccoli', 'vegetables', 34, 2.8, 7, 0.4, [cup(90)]],
  ['kosa-nay', 'كوسة', 'Courgette', 'vegetables', 17, 1.2, 3.1, 0.3, [medium(150)]],
  ['bazingan', 'باذنجان', 'Aubergine', 'vegetables', 25, 1, 6, 0.2, [medium(180)]],
  ['khass', 'خس', 'Lettuce', 'vegetables', 15, 1.4, 2.9, 0.2, [cup(50)]],
  ['gargeer', 'جرجير', 'Rocket', 'vegetables', 25, 2.6, 3.7, 0.7, [cup(40)]],
  ['toom', 'ثوم', 'Garlic', 'vegetables', 149, 6.4, 33, 0.5, [{ nameAr: 'فص', nameEn: 'clove', grams: 3 }]],
  ['lamoon', 'ليمون', 'Lemon', 'vegetables', 29, 1.1, 9, 0.3, [medium(60)]],
  ['shatta', 'شطة', 'Chilli', 'vegetables', 40, 1.9, 9, 0.4, [spoon(10)]],

  // ─── فاكهة إضافية ───────────────────────────────────────────────────────────
  ['kommetra', 'كمثرى', 'Pear', 'fruit', 57, 0.4, 15, 0.1, [medium(180)]],
  ['romman', 'رمان', 'Pomegranate', 'fruit', 83, 1.7, 19, 1.2, [medium(280)]],
  ['yousefi', 'يوسفي', 'Mandarin', 'fruit', 53, 0.8, 13, 0.3, [medium(90)]],
  ['ananas', 'أناناس', 'Pineapple', 'fruit', 50, 0.5, 13, 0.1, [cup(165)]],
  ['kiwi', 'كيوي', 'Kiwi', 'fruit', 61, 1.1, 15, 0.5, [medium(75)]],
  ['mishmish', 'مشمش', 'Apricot', 'fruit', 48, 1.4, 11, 0.4, [medium(35)]],
  ['zabadi-fakha', 'أفوكادو', 'Avocado', 'fruit', 160, 2, 9, 15, [medium(150)]],

  // ─── سناكس ومكسرات ─────────────────────────────────────────────────────────
  ['lb-abyad', 'لب أبيض', 'Pumpkin Seeds', 'fats', 559, 30, 11, 49, [cup(60), spoon(10)]],
  ['sudani-malh', 'سوداني مملح', 'Salted Peanuts', 'fats', 599, 24, 21, 49, [spoon(15)]],
  ['boshar', 'فشار', 'Popcorn', 'fastfood', 387, 13, 78, 4.5, [cup(8)]],
  ['dora-mashweya', 'ذرة مشوية', 'Grilled Corn', 'vegetables', 96, 3.4, 21, 1.5, [piece(150)]],
  ['bondo2', 'بندق', 'Hazelnuts', 'fats', 628, 15, 17, 61, [spoon(12)]],
  ['kagoo', 'كاجو', 'Cashews', 'fats', 553, 18, 30, 44, [spoon(12)]],

  // ─── حلويات إضافية ──────────────────────────────────────────────────────────
  ['ka7k', 'كحك', 'Kahk', 'sweets', 465, 6, 52, 26, [piece(30)]],
  ['ghorayeba', 'غريبة', 'Ghorayeba', 'sweets', 500, 5, 52, 30, [piece(20)]],
  ['petit-four', 'بيتي فور', 'Petit Four', 'sweets', 470, 6, 58, 24, [piece(15)]],
  ['balah-elsham', 'بلح الشام', 'Balah El Sham', 'sweets', 400, 4.5, 50, 21, [piece(30)]],
  ['lo2met-el2adi', 'لقمة القاضي', "Lo'met El Qadi", 'sweets', 385, 4, 52, 18, [piece(15)]],
  ['custard', 'كسترد', 'Custard', 'sweets', 122, 3.5, 19, 3.5, [cup(150)]],
  ['halawa', 'حلاوة طحينية', 'Halva', 'sweets', 540, 12, 50, 32, [spoon(20)]],
  ['mirenda', 'مربى', 'Jam', 'sweets', 278, 0.4, 69, 0.1, [spoon(20)]],
  ['nutella', 'نوتيلا', 'Chocolate Spread', 'sweets', 539, 6, 58, 31, [spoon(20)]],

  // ─── مشروبات إضافية ─────────────────────────────────────────────────────────
  ['yansoon', 'ينسون', 'Anise', 'drinks', 2, 0, 0.4, 0, [glass(200)]],
  ['2erfa', 'قرفة', 'Cinnamon Drink', 'drinks', 25, 0.1, 6, 0.1, [glass(200)]],
  ['sahlab', 'سحلب', 'Sahlab', 'drinks', 105, 3, 17, 2.8, [glass(220)]],
  ['tamr-hendi', 'تمر هندي', 'Tamarind Drink', 'drinks', 52, 0.2, 13, 0.1, [glass(250)]],
  ['kharob', 'خروب', 'Carob Drink', 'drinks', 48, 0.4, 12, 0.1, [glass(250)]],
  ['ne3na3', 'نعناع', 'Mint Tea', 'drinks', 2, 0, 0.4, 0, [glass(200)]],
  ['3asir-lamoon', 'عصير ليمون بسكر', 'Lemonade', 'drinks', 40, 0.1, 10, 0, [glass(250)]],
  ['energy-drink', 'مشروب طاقة', 'Energy Drink', 'drinks', 45, 0, 11, 0, [{ nameAr: 'علبة', nameEn: 'can', grams: 250 }]],

  // ─── وجبات سريعة إضافية ─────────────────────────────────────────────────────
  ['shawerma-farkha-sandwich', 'ساندويتش فراخ مشوي', 'Grilled Chicken Sandwich', 'fastfood', 210, 16, 22, 6, [sandwich(200)]],
  // Sausage and bun together, which is what the 120 g piece weighs.
  ['hot-dog', 'هوت دوج', 'Hot Dog', 'fastfood', 247, 11.1, 18.4, 14.1, [piece(120)]],
  ['nuggets', 'ناجتس', 'Chicken Nuggets', 'fastfood', 296, 15, 18, 19, [piece(17)]],
  ['onion-rings', 'حلقات بصل', 'Onion Rings', 'fastfood', 411, 5.5, 46, 23, [{ nameAr: 'وسط', nameEn: 'medium', grams: 100 }]],
  ['ketchup', 'كاتشب', 'Ketchup', 'fastfood', 101, 1.2, 25, 0.1, [spoon(17)]],
]

export const SEED_FOODS: Food[] = SEEDS.map(([id, nameAr, nameEn, category, kcal, protein, carbs, fat, portions]) => ({
  id: `food-${id}`,
  profileId: SHARED,
  nameAr,
  nameEn,
  category,
  kcal,
  protein,
  carbs,
  fat,
  portions,
  isCustom: 0,
}))

export const FOOD_CATEGORIES: FoodCategory[] = [
  'egyptian',
  'protein',
  'carbs',
  'dairy',
  'legumes',
  'vegetables',
  'fruit',
  'fats',
  'sweets',
  'drinks',
  'fastfood',
]
