# طبقات الكاش — معمل React Native

## دليل المدرّس: اللي نكتبه، واللي نقوله، بالترتيب

---

## الهدف في جملة واحدة

> **الكاش مش «عندي الداتا ولا لأ». الكاش «عندي الداتا، وهل لسه مسموح لها ترد؟»**

والحاجة اللي شايلة الإذن ده **رقم واحد في key–value store**.

### الفكرة اللي الطالب لازم يخرج بيها

في التطبيق ده الداتا ممكن تيجي من **تلات أماكن**، بالترتيب:

```
الذاكرة  →  قاعدة البيانات  →  الشبكة
```

وفيه **مخزن رابع** ملوش أي بوست جواه: الـ **key–value**. هو مش بيرد على القراية —
هو اللي **بيقرر التلاتة اللي فوق مسموح لهم يردّوا ولا لأ**.

وده أهم سوء فهم في الموضوع كله: أغلب الناس بتستخدم key–value عشان تخزّن **الداتا**.
وده غلط. الـ key–value بتاع **الإعدادات والميتاداتا**.

---

## الأربع مخازن — ارسم الجدول ده على السبورة

| المخزن | شايل إيه | بيعيش بعد قفل التطبيق | ينفع تعمل عليه query |
|---|---|---|---|
| **الذاكرة** | array | **لأ** | أيوة، هو array أصلاً |
| **قاعدة البيانات** | صفوف | أيوة | **أيوة — وده سبب وجودها** |
| **key–value** | `lastSyncedAt` والفلتر | أيوة | **لأ — مفتاح وقيمة وخلاص** |
| **السيرفر** | الحقيقة | — | — |

**السؤال اللي بيفرز بينهم:**

> «هتدوّر على الحاجة دي بحاجة **غير** المفتاح بتاعها؟»

أيوة → قاعدة بيانات. لأ → key–value.

---

## التشغيل

```bash
node -v                 # لازم 22 أو أحدث
git clone <repo> && cd CatalystFeedRN
git checkout starter
npm install             # قبل المحاضرة بيوم، مش والكاميرا شغالة
npm test                # ٨ فشلوا — ده المتوقع
npx expo start          # امسح الـ QR من Expo Go
```

لو شبكة المكان بتمنع الاتصال بين الأجهزة: `npx expo start --tunnel`.

**مفيش dependency جديدة.** الـ key–value جاي من `expo-sqlite/kv-store` — نفس الحزمة
اللي فيها قاعدة البيانات.

---

## أول تلات دقايق — الفرجة قبل الكلام

شغّل `main` على الموبايل **قبل** ما تبدأ تكتب أي حاجة، وخلّيهم يشوفوا الشارة اللي فوق.

**١.** افتح التطبيق وهو بارد.

> `NETWORK · ٧١٢ ms`

**٢.** دوس **Read**.

> `MEMORY · ٠ ms`

**٣.** دوس **Clear memory**، وبعدين **Read**.

> `DATABASE · ١٧ ms`

**٤.** دوس **Read** تاني.

> `MEMORY · ٠ ms`

**وقفة هنا.** اسأل: **«ليه رجعت MEMORY؟ أنا مسحتها من شوية.»**

الإجابة اسمها **promotion**: لما قاعدة البيانات ترد، بتكتب اللي لقته في الذاكرة.
عشان كده الكاش **بيبقى أسرع وإنت بتستعمله**.

**٥.** دوس **Make it stale**، وبعدين **Read**.

> `NETWORK`

**ووقفة تانية، أطول.** اسأل:

> **«الذاكرة مليانة. قاعدة البيانات مليانة. ليه راح للشبكة؟»**

سيب سكوت. ده السؤال اللي الدرس كله موجود عشانه.

وبعدين قول:

> «عشان في رقم واحد في الـ key–value بيقول إن النسخة اللي عندنا **بقت قديمة**. الكاش
> مش بيرد لأنه فاضي — الكاش بيرد لأنه **لسه مسموح له**.»

---

## الصورة اللي تقولها بالبلدي

> «تخيل عندك تلاجة، ودولاب، وسوبرماركت.
>
> التلاجة أسرع حاجة بس بتفضى بسرعة. الدولاب أبطأ شوية بس بيفضل مليان. والسوبرماركت
> فيه كل حاجة بس لازم تنزل.
>
> والـ key–value؟ ده **تاريخ الصلاحية** المكتوب على العلبة. مش أكل — بس هو اللي
> بيقررلك تاكل من التلاجة ولا تنزل تشتري.»

---

# المراحل — عشر خطوات في تلات ملفات

## المرحلة الأولى · قاعدة البيانات (خطوات ١–٣)

**الملف:** `src/sqliteStore.ts`

نفس الحتة اللي اتعلّمناها قبل كده. تلات دوال.

```ts
async getAll(): Promise<Post[]> {
  const rows = await this.db.all<Row>('SELECT * FROM post ORDER BY position ASC');
  return rows.map(toPost);
}

async replaceAll(items: Post[]): Promise<void> {
  await this.db.transaction(async () => {
    await this.db.run('DELETE FROM post');
    for (let i = 0; i < items.length; i++) {
      await this.insert(items[i], i);
    }
  });
}

async update(id: string, transform: (post: Post) => Post): Promise<void> {
  await this.db.transaction(async () => {
    const rows = await this.db.all<Row>('SELECT * FROM post WHERE id = ?', [id]);
    if (rows.length === 0) return;
    await this.insert(transform(toPost(rows[0])), rows[0].position);
  });
}
```

**التلات حاجات اللي الجدول مش هيعملها لك:**

**الترتيب.** من غير `ORDER BY` مفيش أي وعد بترتيب. اللستة فاكرة، الجدول لأ.

**الموضع.** `INSERT OR REPLACE` **مش** بيعدّل صف — بيمسحه ويدخّل واحد جديد آخر الجدول.
فمن غير عمود `position`، البوست بينزل تحت **أول ما حد يدوس لايك**.

**الذرّية.** الـ `transaction` بتخلّي المسح والإدخال **حدث واحد**.

---

## المرحلة التانية · الـ key–value (خطوات ٤–٦)

**الملف:** `src/settings.ts` · أقصر ملف، وأهم ملف في الدرس

```ts
async syncedAt(): Promise<number> {
  const raw = await this.kv.get(SYNCED_AT);
  return raw === null ? 0 : Number(raw);
}

async markSynced(at: number): Promise<void> {
  await this.kv.set(SYNCED_AT, String(at));
}

async expire(): Promise<void> {
  await this.kv.set(SYNCED_AT, '0');
}

async filter(): Promise<string> {
  return (await this.kv.get(FILTER)) ?? ALL;
}

async setFilter(value: string): Promise<void> {
  await this.kv.set(FILTER, value);
}
```

### تلات حاجات قولهم هنا

**واحد — كله strings.**

```ts
String(at)        // رايح
Number(raw)       // راجع
```

> «الـ key–value معندهاش أنواع. عندها نص وبس. وإنت اللي بتترجم على الحدود.»

**اتنين — المفتاح اللي متكتبش بيرجع `null`.**

ودي مش حالة استثنائية، دي **أول مرة** التطبيق بيفتح عند كل يوزر في الدنيا. لازم
تقرر بنفسك «مفيش sync» معناها إيه — متسيبش `Number(null)` يقررها لك.

**تلاتة — وريهم الـ import:**

```ts
import Storage from 'expo-sqlite/kv-store';
```

> «ودي SQLite من جوّه. يعني التخزين **جدول**، بس الـ API رافضة تخليك تعمل عليه query.
>
> **والرفض ده هو اللي بيخليها key–value.** هي مش أضعف من قاعدة بيانات — هي **أضيق**،
> وبتقفل عليك باب الغلط.»

وضيف:

> «ودي كمان اللي بتحل محل **AsyncStorage**، اللي اتشالت من core الـ React Native.»

---

## المرحلة التالتة · الطبقات (خطوات ٧–١٠)

**الملف:** `src/cascade.ts` · دالة واحدة اسمها `read()` · **الدرس كله هنا**

```ts
async read(): Promise<Answer> {
  const started = this.now();
  const fresh = this.now() - (await this.settings.syncedAt()) < TTL_MS;

  if (fresh) {
    const hot = await this.memory.getAll();
    if (hot.length > 0) return this.answer('memory', hot, started, false);

    const stored = await this.disk.getAll();
    if (stored.length > 0) {
      await this.memory.replaceAll(stored);
      return this.answer('database', stored, started, false);
    }
  }

  try {
    const live = await this.server.fetchFeed();
    await this.disk.replaceAll(live);
    await this.memory.replaceAll(live);
    await this.settings.markSynced(this.now());
    return this.answer('network', live, started, false);
  } catch (unreachable) {
    const kept = await this.disk.getAll();
    if (kept.length === 0) throw unreachable;
    await this.memory.replaceAll(kept);
    return this.answer('database', kept, started, true);
  }
}
```

### خطوة ٧ — سطر الصلاحية

```ts
const fresh = this.now() - (await this.settings.syncedAt()) < TTL_MS;
```

> «السطر ده قبل أي حاجة تانية. **قبل** ما نبص على الذاكرة، وقبل ما نبص على قاعدة
> البيانات. لأن مفيش فايدة من كاش سريع بيديك إجابة غلط.»

### خطوة ٨ — الترتيب، والـ promotion

السطر ده بالذات:

```ts
await this.memory.replaceAll(stored);
```

> «ده الـ **promotion**. قاعدة البيانات ردّت، وإحنا رفعنا اللي لقيناه لفوق طبقة.
> القراية الجاية هترد من الذاكرة.»

**اعمل الغلطة قدامهم:** شيل السطر ده، وشغّل، ودوس Read تلات مرات.
هتفضل `DATABASE` كل مرة.

> «الكاش من غير الـ promotion بيشتغل، بس مش بيتحسّن. وده الفرق بين كاش **بطبقات**
> وتلات مخازن مرصوصين جنب بعض.»

### خطوة ٩ — ترتيب الكتابة

```ts
await this.disk.replaceAll(live);
await this.memory.replaceAll(live);
await this.settings.markSynced(this.now());
```

> «القرص الأول، الذاكرة بعده، والختم **في الآخر**. لو ختمت قبل ما تكتب وحصل crash في
> النص، التطبيق هيصحى وهو فاكر إن عنده نسخة جديدة — وهي مش موجودة.»

### خطوة ١٠ — السيرفر وقع

```ts
const kept = await this.disk.getAll();
if (kept.length === 0) throw unreachable;
return this.answer('database', kept, started, true);
```

> «الداتا قديمة، ومش هنخبّي ده. بنوريها **ومكتوب جنبها stale**.
>
> وده اللي WhatsApp بيعمله لما تفتحه في المترو: الرسايل القديمة قدامك، وفوق مكتوب
> *connecting*. مش شاشة فاضية.»

---

## الفخ الكبير — اسأل عنه قبل ما يقعوا فيه

في `answer()`، الفلتر بيتطبّق **بعد** ما الطبقة ترد:

```ts
const visible = chosen === ALL ? posts : posts.filter((post) => post.author === chosen);
```

**اسألهم:** «لو طبّقنا الفلتر **قبل** ما نشوف الكاش فاضي ولا لأ، هيحصل إيه؟»

الإجابة: تختار كاتب ملوش بوستات → اللستة تطلع فاضية → الكود يفتكر إن الكاش فاضي →
يضرب على الشبكة. وكل مرة.

> «الكاش بيخزّن **المورد كله**. الفلتر **عرض**. اللي بيخلط بين الاتنين بيعمل تطبيق
> بيضرب على الشبكة كل ما حد يدوس زرار.»

---

## اللحظة التانية للـ key–value — الفلتر

بعد ما يخلّصوا:

**١.** اختار فلتر — «Nour» مثلاً.
**٢.** اقفل التطبيق خالص واسحبه.
**٣.** افتحه تاني.

**الفلتر لسه متحدد. والبوستات جت من قاعدة البيانات. والشبكة متلمستش.**

> «بصّوا على اللي حصل: **نوعين state مختلفين تماماً**.
>
> اللي اليوزر **اختاره** راح للـ key–value. واللي السيرفر **بعته** راح لقاعدة
> البيانات. ولو عكستهم، هتلاقي نفسك بتعمل `JSON.parse` لخمسمية بوست عشان تعرف هو
> اختار أنهي فلتر.»

---

## حاجات متقولهاش

| متقولش | قول بدالها |
|---|---|
| «key–value أبسط، نحط الداتا فيها» | هي أبسط لأنها **أضيق**. لحظة ما تحتاج صف واحد، بتقرا الملف كله. |
| «تلات مخازن» | **تلات طبقات**. الترتيب هو الحاجة. |
| «الكاش عشان السرعة» | الكاش عشان **التطبيق يشتغل والشبكة مش موجودة**. السرعة نتيجة. |
| «AsyncStorage تعمل نفس الحاجة» | اتشالت من core الـ RN، وهي key–value — نفس القيود بالظبط. |
| «TTL يعني ساعة» | TTL **قرار منتج**، مش رقم تقني. feed: دقيقة. رصيد بنك: صفر. |

---

## الامتحان النهائي

```bash
npm test     # ٨ خضرا
```

وعلى الموبايل:

| اعمل كده | الشارة |
|---|---|
| افتحه بارد | `NETWORK` |
| Read | `MEMORY` |
| Clear memory ← Read | `DATABASE` |
| Read | `MEMORY` ← الـ promotion |
| Wipe disk ← Clear memory ← Read | `NETWORK` |
| **Make it stale ← Read** | **`NETWORK` والمخازن مليانة** |
| Make it stale ← السيرفر down ← Read | `DATABASE · stale` |
| فلتر ← اقفل ← افتح | الفلتر موجود، والبوستات من `DATABASE` |

**الجملة اللي تقفل بيها الدرس:**

> «الستة والسابع دول اللي هيفرقوا معاك في الشغل. الباقي هتلاقيه في أي tutorial.»

---

## اللي بعده

**الكتابات.** دلوقتي اللايك بيوصل الطبقتين، بس لو السيرفر مقفول **مبيوصلش السيرفر
أبداً**. والحل اسمه **outbox**.

سيب السؤال ده معلّق — متجاوبش عليه.
