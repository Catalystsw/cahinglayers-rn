# الدرس ٤.٢ — المعمل · React Native

## دليل المدرّس: إيه اللي نكتبه، وبأي ترتيب، وليه

---

## قبل ما تبدأ

الريبو فيه **برانشين**:

| البرانش | فيه إيه |
|---|---|
| `main` | التطبيق كامل وشغال. الـ ٦ tests خضرا. |
| `starter` | نفس التطبيق، بس **تلات ملفات مفرّغة**. التطبيق **بيفتح عادي** ومبيضربش. |

```bash
git clone <repo> && cd CatalystFeedRN
git checkout starter
npm install
npx expo start
```

**مهم:** إنت بتبدأ من `starter`، و`main` هي الإجابة. متفتحش `main` قدام الطلبة إلا
في الآخر.

### أول حاجة تعملها على الكاميرا — قبل أي كلام

شغّل الـ tests:

```bash
npm test
```

**ستة فشلوا.** وقف هنا ثانيتين وقول الجملة دي:

> «دول مش errors. دي **المواصفات**. إحنا هنكتب كود لحد ما الستة دول يخضروا.»

وبعدين شغّل التطبيق على الموبايل. هيفتح، وهيبان مكتوب **Nothing here yet.**

**وقفة.** قول:

> «التطبيق **مش** مكسور. الشاشة شغالة، السيرفر شغال، المخزن شغال. اللي ناقص هو
> **الوصلة** بينهم — وإحنا اللي هنكتبها.»

---

## الصورة الكبيرة — ارسمها على السبورة في ٣٠ ثانية

```
الشبكة  →  المخزن  →  الشاشة
```

تلات ملفات هنكتبهم، واحد لكل سهم:

| الملف | مين هو |
|---|---|
| `src/sqliteStore.ts` | **المخزن** — نفس الأربع دوال بتوع `MemoryStore`، بس على القرص |
| `src/repository.ts` | **السهمين** — اللي بيربط الشبكة بالمخزن |
| `src/useFeed.ts` | **الـ ViewModel** — في React مفيش كلاس اسمه ViewModel، فده hook |

---

# المرحلة الأولى · المخزن

**الملف:** `src/sqliteStore.ts` · **الخطوات ١ إلى ٣** · أصعب جزء في المعمل

افتح الملف وأشر على اللي **موجود فعلاً**: الـ `SCHEMA`، و`Row`، و`toPost`، ودالة
`insert`. قول:

> «دي كلها جاهزة عشان الدرس مش في كتابة SQL. الدرس في **التلات حاجات اللي اللستة كانت
> بتعملهالك ببلاش**.»

### خطوة ١ — `getAll`

امسح `return [];` واكتب:

```ts
async getAll(): Promise<Post[]> {
  const rows = await this.db.all<Row>('SELECT * FROM post ORDER BY position ASC');
  return rows.map(toPost);
}
```

**السؤال اللي تسأله قبل ما تكتب `ORDER BY`:**

> «لو شلت الـ `ORDER BY` دي، البوستات هتيجي بأي ترتيب؟»

الإجابة اللي هتسمعها: «بترتيب ما دخلت». **وهي غلط.** الجدول بيرجّعلك الصفوف باللي
يريحه هو، ومفيش وعد بأي ترتيب. اللستة فاكرة ترتيبها، الجدول لأ.

### خطوة ٢ — `replaceAll`

```ts
async replaceAll(items: Post[]): Promise<void> {
  await this.db.transaction(async () => {
    await this.db.run('DELETE FROM post');
    for (let i = 0; i < items.length; i++) {
      await this.insert(items[i], i);
    }
  });
  this.listeners.notify();
}
```

**تلات حاجات في الدالة دي، وكل واحدة تستاهل وقفة:**

**واحد — `DELETE` الأول.** اسم الدالة `replaceAll` مش `addAll`. اللي جه من السيرفر
**هو** الـ feed، مش حاجة بتتزوّد على اللي موجود.

**اتنين — الـ `i`.** الـ `position` جاية من الـ index. ترتيب السيرفر بنحفظه كـ **بيانات**
في عمود، مش بنستناه يحصل لوحده.

**تلاتة — الـ `transaction`.** دي أهم حاجة في الملف.

> «الـ subscribers بيقروا من أول الأول مع **كل** `notify`. لو مسحت وبعدين دخّلت تلاتة
> في أربع عمليات منفصلة، الشاشة هتشوف: فاضي، واحد، اتنين، تلاتة. اليوزر هيشوف الـ feed
> **بيرجرج** في كل refresh.»

الـ transaction بتخلّي الأربع عمليات **حدث واحد**.

### خطوة ٣ — `update`

```ts
async update(id: string, transform: (post: Post) => Post): Promise<void> {
  await this.db.transaction(async () => {
    const rows = await this.db.all<Row>('SELECT * FROM post WHERE id = ?', [id]);
    if (rows.length === 0) return;
    await this.insert(transform(toPost(rows[0])), rows[0].position);
  });
  this.listeners.notify();
}
```

**السطر الأخير هو الدرس كله.** خد `rows[0].position` واكتبه تاني زي ما هو.

**اعمل الغلطة قدامهم.** غيّرها لـ `0` أو لأي رقم، وشغّل، ودوس على قلب في بوست في النص.
البوست **هينزل آخر الـ feed قدام عينهم**.

وبعدين اشرح ليه:

> «`INSERT OR REPLACE` **مش** بيعدّل صف. بيمسحه ويدخّل صف جديد — و`rowid` الجديد بيبقى
> آخر الجدول. فالبوست مش بيتلخبط في الـ refresh، بيتلخبط **أول ما حد يدوس لايك**.»

### شغّل الـ tests

```bash
npm test
```

لسه فيه فشل، **بس أقل**. ده تقدّم محسوس ومهم يشوفوه.

---

# المرحلة التانية · الريبوزيتوري

**الملف:** `src/repository.ts` · **الخطوات ٤ إلى ٦** · أسرع ٥ دقايق في الدرس

```ts
feed(): Promise<Post[]> {
  return this.store.getAll();
}

async refresh(): Promise<void> {
  await this.store.replaceAll(await this.server.fetchFeed());
}

async setLiked(id: string, value: boolean): Promise<void> {
  await this.store.update(id, (post) => liked(post, value));
  await this.server.putLike(id, value);
}
```

**تلات سطور. خلاص.**

### السطر اللي في `refresh` — اقراه بصوت عالي

```ts
await this.store.replaceAll(await this.server.fetchFeed());
```

> «شوفوا الترتيب جوه السطر: `fetchFeed()` بتحصل **الأول**. لو السيرفر وقع، الـ exception
> بيطلع من هنا — و`replaceAll` **عمرها ما اتنادت**. المخزن مالوش دعوة.»

ودي حرفياً هي الحاجة اللي الدرس اللي فات كان عنها. مفيش `try`، ومفيش
`posts = emptyList()`. **اللي مكتبتوش هو اللي بيحميكم.**

### `setLiked` — الترتيب هو الدرس

> «المخزن الأول. السيرفر بعده.»

اقلب السطرين قدامهم، اقفل السيرفر، ودوس قلب. **مفيش حاجة هتحصل.** القلب مش هيتملي،
لأن السطر اللي بيكتب في المخزن مجاش عليه الدور.

### وقفة — السؤال اللي تسأله هنا

> «أنا فين في الملف ده كتبت كلمة `sqlite`؟»

**ولا مرة.** الملف ده شايف `PostStore` بس — أربع دوال. ومش عارف لو اللي جاله array
ولا قاعدة بيانات.

> «وعشان كده لما بدّلنا المخزن، الملف ده **متغيّرش فيه حرف**. المعمار مش بيتحسب بالكود
> اللي بتكتبه — بيتحسب بالكود اللي **مضطرتش تفتحه**.»

---

# المرحلة التالتة · الـ ViewModel

**الملف:** `src/useFeed.ts` · **الخطوات ٧ إلى ١٠**

### خطوة ٧ — اختار المخزن وابني الريبوزيتوري

```ts
const store = where === 'disk' ? disk : memory;

const repository = useMemo(
  () => (store ? new OfflineFirstRepository(server, store) : null),
  [server, store],
);
```

الـ `disk` ممكن يكون `null` لحظة فتح التطبيق، لأن فتح قاعدة البيانات `async`. عشان كده
الـ type فيه `| null` ومفيش `!` في أي مكان.

### خطوة ٨ — اسمع للمخزن

```ts
useEffect(() => {
  if (!repository) return;
  let alive = true;
  const read = () => {
    void repository.feed().then((next) => {
      if (alive) setPosts(next);
    });
  };
  const unsubscribe = repository.subscribe(read);
  read();
  return () => {
    alive = false;
    unsubscribe();
  };
}, [repository]);
```

تلات حاجات هنا بيتنسوا كتير:

- `read()` بتتنادى **مرة بإيدك** بعد الاشتراك، عشان أول قراية.
- `unsubscribe()` في الـ cleanup.
- `alive` — عشان قراية رجعت بعد ما الـ component مات متكتبش في state مش موجود.

**الجملة اللي تقولها هنا:**

> «ودي الحتة اللي **Room وdrift بيعملوهالك ببلاش**. Room بترجّع `Flow` بتتبعت لوحدها.
> `expo-sqlite` عنده `addDatabaseChangeListener` وخلاص — الـ reactivity إنت اللي
> بتبنيها. ودي **مش عيب في المكتبة**، دي الحاجة اللي لازم تسأل عنها قبل ما تختار.»

### خطوة ٩ — هات من الشبكة **بس** لو المخزن فاضي

```ts
useEffect(() => {
  if (!repository) return;
  void repository.feed().then((existing) => {
    if (existing.length === 0) void run(() => repository.refresh());
  });
}, [repository]);
```

**دي أهم ١٠ سطور في المعمل كله.** وقّف وقول:

> «لو شلت شرط `length === 0`، التطبيق هيضرب على الشبكة كل مرة تبدّل فيها السويتش.
> وساعتها القرص بقى **كاش**، مش **مصدر حقيقة**.»

### خطوة ١٠ — وصّل الأزرار

```ts
refresh: () => {
  if (repository) void run(() => repository.refresh());
},
toggleLike: (id) => {
  const post = posts.find((candidate) => candidate.id === id);
  if (repository && post) void run(() => repository.setLiked(id, !post.likedByMe));
},
```

`run` موجودة جاهزة، وهي اللي شايلة `busy` و`error`. فمفيش `try` في أي مكان تاني.

---

## الامتحان — على الموبايل، مش في الـ terminal

```bash
npm test
```

**ستة خضرا.** وبعدين على الموبايل:

| # | اعمل كده | Memory | Disk |
|---|---|---|---|
| ١ | افتح التطبيق وسيبه يحمّل | ٣ بوستات | ٣ بوستات |
| ٢ | اقفل السيرفر، دوس Refresh | البوستات موجودة + شريط أحمر | نفس الحاجة |
| ٣ | دوس قلب وإنت offline | بيتملي على طول | نفس الحاجة |
| ٤ | **اقفل التطبيق خالص. افتحه. والسيرفر مقفول.** | **فاضي** | **٣ بوستات** |

**أول تلات صفوف متطابقين.** وده مش صدفة — ده عشان كل اللي فوق المخزن **واحد**.

**الصف الرابع لوحده.** وهو الدرس.

---

## حاجات متقولهاش

| متقولش | قول بدالها |
|---|---|
| «القرص كاش أسرع» | القرص **مصدر الحقيقة**. السرعة نتيجة، مش السبب. |
| «`expo-sqlite` ضعيفة» | معندهاش reactive queries. دي **حاجة تعرفها وتحسبها**، مش عيب. |
| «AsyncStorage يعمل نفس الحاجة» | AsyncStorage اتشال من core الـ RN، وهو key–value مش جدول. اللي محتاج استعلام مش ينفع معاه. |
| «ده بس في React Native» | نفس التلات ملفات موجودة في الـ Kotlin lab بنفس الأسماء. **المعمار واحد، المكتبة بس اللي بتتغيّر.** |

---

## لو حصلت مشكلة

| المشكلة | السبب |
|---|---|
| `npm test` بيقول `node:sqlite` مش موجود | محتاج Node 22 أو أحدث. اتأكد بـ `node -v`. |
| التطبيق بيفضل Nothing here yet بعد خطوة ٩ | غالباً الـ `read()` بعد الـ `subscribe` مكتوبتش. |
| البوست بينزل تحت لما تدوس قلب | `position` في `update` — الخطوة ٣. |
| الـ feed بيرجرج في كل refresh | مفيش `transaction` في `replaceAll` — الخطوة ٢. |
| كل حاجة خضرا بس الصف ٤ فاضي | إنت على مخزن الـ Memory. بدّل السويتش. |

---

## اللي بعده

الدرس الجاي: **الكتابات اللي بتعيش بعد الطيارة**. اللايك دلوقتي بيوصل المخزن، بس لو
السيرفر مقفول **مبيوصلش السيرفر أبداً**. ودي الحاجة اللي هنصلّحها بـ **outbox**.
