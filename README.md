# ♻️ Recycling Waste Fund System (ระบบกองทุนขยะรีไซเคิล)

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white)

**ระบบกองทุนขยะรีไซเคิล (Recycling Waste Fund System)** เป็นระบบ Web Application ที่พัฒนาขึ้นเพื่อจัดการการรับซื้อขยะจากสมาชิกในชุมชน อำนวยความสะดวกในการจัดเก็บ ค้นหา และบริหารจัดการข้อมูลต่าง ๆ อย่างเป็นระบบ เช่น การดูสรุปข้อมูลการรับซื้อขยะ, จำนวนสต็อกสินค้า, ประวัติการซื้อขายในแต่ละครั้ง และสรุปยอดรับซื้อในแต่ละเดือน

---

## 🌟 ฟีเจอร์หลัก (Key Features)

ระบบจัดการสิทธิ์การเข้าใช้งานเป็น **3 ระดับ** เพื่อความคล่องตัวและความปลอดภัย:

- 👑 **ผู้ดูแลระบบ (Admin):**
  - ดูเอกสารรายงานและภาพรวมทั้งหมดของระบบ
  - จัดการข้อมูลและสิทธิ์ของผู้ใช้งานในระบบ (รวมถึงพนักงานและสมาชิก)
- 👨‍💼 **พนักงาน / เจ้าหน้าที่ (Employee):**
  - ดำเนินการรับซื้อขยะจากสมาชิกและบันทึกข้อมูล
  - จัดการสต็อกและการเบิกจ่าย
  - ดูสรุปยอดรับซื้อและการทำงานในขอบเขตที่รับผิดชอบ
- 👤 **สมาชิก (User):**
  - ตรวจสอบประวัติการขายขยะของตนเอง
  - ดูยอดเงินหรือสถิติการขาย
  - ติดตามประกาศหรือสถานะของกองทุนขยะ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Backend:** Node.js, Express.js
- **Frontend Framework:** EJS, Bootstrap 5, HTML5, CSS3
- **Database:** MongoDB (ใช้งานผ่าน Mongoose)
- **Authentication:** express-session, bcryptjs
- **Utilities:** Axios, Multer (จัดการการอัปโหลดไฟล์), SweetAlert2, Node-cron

---

## ⚙️ การติดตั้งและรันโปรเจกต์ (Installation Details)

### สิ่งที่ต้องติดตั้งล่วงหน้า (Prerequisites)

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/) (Local หรือ MongoDB Atlas)

### ขั้นตอนการเริ่มทำงาน (Steps)

1. **โคลนโปรเจกต์ (Clone repository):**

   ```bash
   git clone https://github.com/minnimall/Recycling-Waste-Fund-System.git
   cd Recycling-Waste-Fund-System
   ```

2. **ติดตั้งแพ็คเกจต่างๆ (Install Dependencies):**

   ```bash
   npm install
   ```

3. **รันเซิร์ฟเวอร์ (Start App):**

   ```bash
   npm start
   ```

4. **การเข้าใช้งาน (Usage):**
   - เปิดเบราว์เซอร์แล้วไปที่: `http://localhost:3000`

---

## 📁 โครงสร้างโฟลเดอร์ที่สำคัญ (Project Structure)

```
Recycling-Waste-Fund-System/
├── config/           # ตั้งค่าต่างๆ ของระบบ (เช่น Database URI)
├── controllers/      # ควบคุม Logic ของแต่ละเส้นทาง Route
├── jobs/             # กระบวนการทำงานอัตโนมัติเบื้องหลัง (เช่น Cron Jobs)
├── models/           # โครงสร้างฐานข้อมูล (Schema ของ Mongoose)
├── public/           # ไฟล์ Static เช่น รูปภาพ, styles, สคริปต์หน้าบ้าน
├── routes/           # เส้นทาง URL ทั้งหมดแยกตาม Controller (Admin, Employee, User)
├── views/            # ไฟล์ หน้าจอส่วน Frontend ทั้งหมด (นามสกุล .ejs)
├── app.js            # แฟ้มหลักเริ่มต้นเซิร์ฟเวอร์ Backend
└── package.json      # แสดงรายการ Dependencies ของโปรเจกต์
```

---

## 📄 ลิขสิทธิ์ (License)

โปรเจกต์นี้ใช้งานภายใต้ลิขสิทธิ์ [ISC License](LICENSE)
