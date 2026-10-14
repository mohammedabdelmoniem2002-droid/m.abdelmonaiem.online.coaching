# Elite Coach — Railway Ready

تطبيق بروفايل المدرب + بوابة العملاء + المتجر، جاهز للنشر على Railway.

## المتغيرات (Variables)

أضفها في **Railway → Project → Variables**:

| المتغير | مثال | الوصف |
|---------|------|-------|
| `COACH_USERNAME` | `m.abdelmoniem` | يوزر المدرب |
| `COACH_PASSWORD` | `30210120200932` | باسورد المدرب |
| `COACH_PHONE` | `01284931730` | رقم إعادة تعيين الباسورد |
| `WHATSAPP_NUMBER` | `201284931730` | واتساب طلبات الشراء (بدون +) |
| `SESSION_MINUTES` | `10` | مدة جلسة المدرب |
| **`CLIENT_USERS`** | انظر بالأسفل | يوزرات العملاء مسبقة الزرع |

### صيغة CLIENT_USERS

**JSON (موصى بها):**
```json
[{"name":"أحمد","phone":"01012345678","pass":"1234","months":"3"},{"name":"سارة","phone":"01198765432","pass":"sara99","months":"1"}]
```

**أو CSV بسيط:**
```
أحمد:01012345678:1234:3,سارة:01198765432:sara99:1
```

لو تركت `CLIENT_USERS` فاضي، يتزرع تلقائياً:
- `01000000001` / باسورد `1111`
- `01000000002` / باسورد `2222`

العملاء يُضافون مرة واحدة في `localStorage` عند أول فتح للصفحة (مش بيتمسحوا لو اتعدلوا بعدين).

## الوجهات (Routes / Destinations)

| المسار | الوظيفة |
|--------|---------|
| `/` | الصفحة الرئيسية |
| `/client` أو `/?mode=client` أو `#client` | بوابة العميل |
| `/coach` | صفحة المدرب |
| `/health` | فحص صحة السيرفر (JSON) |
| `?elite_client=1&c=BASE64` | رابط شخصي مشفّر للعميل |

## تشغيل محلي

```bash
cd elite-coach
cp .env.example .env
# عدّل CLIENT_USERS حسب عملاءك
npm install
npm start
# افتح http://localhost:3000
```

### دخول المدرب
- Username: قيمة `COACH_USERNAME`
- Password: قيمة `COACH_PASSWORD`

### دخول عميل تجريبي
1. افتح `/?mode=client` أو اضغط Client Portal
2. Phone: `01000000001`
3. Password: `1111`

## الرفع على Railway

### من GitHub
1. ارفع مجلد `elite-coach` كامل
2. New Project → Deploy from GitHub
3. أضف المتغيرات في Variables (مهم: `CLIENT_USERS`)
4. Deploy — Start Command: `node server.js`

### Railway CLI
```bash
cd elite-coach
npm install
railway login
railway init
railway variables set COACH_USERNAME=m.abdelmoniem COACH_PASSWORD=xxx WHATSAPP_NUMBER=201284931730
# CLIENT_USERS كـ JSON string (استخدم علامات اقتباس مفردة)
railway variables set 'CLIENT_USERS=[{"name":"أحمد","phone":"01012345678","pass":"1234","months":"3"}]'
railway up
```

### Docker
الملف `Dockerfile` موجود — Railway يكتشفه تلقائياً.

## هيكل المشروع

```
elite-coach/
├── package.json
├── server.js          # سيرفر Express + حقن المتغيرات + زرع العملاء
├── public/
│   └── index.html     # التطبيق الكامل
├── Dockerfile
├── railway.toml
├── .env.example
└── README.md
```

## ملاحظات مهمة

- البيانات (خطط، منتجات، صور) تُحفظ في **localStorage** على جهاز الزائر.
- جلسة المدرب تنتهي بعد `SESSION_MINUTES` من عدم النشاط.
- العملاء المزروعين من `CLIENT_USERS` يظهرون في قائمة المشتركين عند المدرب.
- لإضافة عملاء جدد بعد النشر: غيّر `CLIENT_USERS` في Railway وأعد Deploy، أو أضفهم من لوحة المدرب (Subscribers).
