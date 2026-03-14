const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import Models (Adjust paths as needed)
const WasteType = require('./models/wastetype');
const Waste = require('./models/waste');

const dbURI = process.env.MONGODB_URI;

if (!dbURI) {
    console.error('Error: MONGODB_URI not found in .env file');
    process.exit(1);
}

// Existing Category IDs from wasteseed.js
const TYPES = {
    PLASTIC: '67e1e7497f647209b27dd4a8',
    PAPER: '67e1e7757f647209b27dd4ae',
    ALUMINUM: '67e1e7e87f647209b27dd4b4',
    METAL: '67e1e7ec7f647209b27dd4ba',
    GLASS: '67e1e81d7f647209b27dd4c0',
    ELECTRONIC: '69a2750a4d7927482193a611',
    OTHER: null
};

const newWasteData = [
    { wasteName: "เหล็ก", pricePerUnit: 6, type: "METAL" },
    { wasteName: "สังกะสี (แผ่น)", pricePerUnit: 3, type: "METAL" },
    { wasteName: "สังกะสี (กระป๋อง)", pricePerUnit: 4, type: "METAL" },
    { wasteName: "กระดาษลัง", pricePerUnit: 2.2, type: "PAPER" },
    { wasteName: "กระดาษจับจั๊ว (เศษ)", pricePerUnit: 1.5, type: "PAPER" },
    { wasteName: "กระดาษขาว-ดำ", pricePerUnit: 4, type: "PAPER" },
    { wasteName: "แผงไข่/แกนอ่อน", pricePerUnit: 1.5, type: "PAPER" },
    { wasteName: "ขวดแก้วแดง(สีชา/ขวดสปาย)", pricePerUnit: 1.2, type: "GLASS" },
    { wasteName: "ขวดแก้วเขียว", pricePerUnit: 1.2, type: "GLASS" },
    { wasteName: "ขวดแก้วขาว (สปอนเซอร์/โซดา)", pricePerUnit: 1.3, type: "GLASS" },
    { wasteName: "แก้วรวมสี (ขวดเหล้า/เบียร์/M100)", pricePerUnit: 1, type: "GLASS" },
    { wasteName: "ขวด pet ใส (ขวดโค้ก/ขวดน้ำดื่ม)", pricePerUnit: 5.5, type: "PLASTIC" },
    { wasteName: "พลาสติกรวมสี", pricePerUnit: 3, type: "PLASTIC" },
    { wasteName: "พลาสติกกรอบ", pricePerUnit: 3, type: "PLASTIC" },
    { wasteName: "พลาสติก (สีดำ)", pricePerUnit: 2, type: "PLASTIC" },
    { wasteName: "ลวดหนาม", pricePerUnit: 4, type: "METAL" },
    { wasteName: "ทองแดงปอกสาย", pricePerUnit: 230, type: "METAL" },
    { wasteName: "ช็อต (ทองแดง)", pricePerUnit: 220, type: "METAL" },
    { wasteName: "ใหญ่ (ดำ,หลอด,ท่อแอร์) ทองแดง", pricePerUnit: 210, type: "METAL" },
    { wasteName: "เล็กแกะ (ทองแดง)", pricePerUnit: 200, type: "METAL" },
    { wasteName: "ทองเหลือง", pricePerUnit: 100, type: "METAL" },
    { wasteName: "ทองหม้อน้ำ", pricePerUnit: 100, type: "METAL" },
    { wasteName: "แอร์ไส้ทอง", pricePerUnit: 100, type: "METAL" },
    { wasteName: "ไดหม้อน้ำ/ไดแอร์", pricePerUnit: 30, type: "METAL" },
    { wasteName: "ฉากหนา(ไม่ติดสติ๊กเกอร์)", pricePerUnit: 45, type: "ALUMINUM" },
    { wasteName: "ไดสายไฟ (ปอก)", pricePerUnit: 40, type: "METAL" },
    { wasteName: "ล้อแม็กซ์", pricePerUnit: 50, type: "ALUMINUM" },
    { wasteName: "โลโค้ก/โลกระป๋อง(อลูมิเนียม)", pricePerUnit: 35, type: "ALUMINUM" },
    { wasteName: "โลบาง (สะอาด)", pricePerUnit: 40, type: "ALUMINUM" },
    { wasteName: "โลแข็ง (สะอาด)", pricePerUnit: 45, type: "ALUMINUM" },
    { wasteName: "กระทะ(อลูมิเนียมไม่ติดเหล็ก)", pricePerUnit: 20, type: "ALUMINUM" },
    { wasteName: "ก้นหม้อ(อลูมิเนียมไม่ติดเหล็ก)", pricePerUnit: 12, type: "ALUMINUM" },
    { wasteName: "ก้ามเบรค (ไม่ติดเหล็ก)", pricePerUnit: 20, type: "ALUMINUM" },
    { wasteName: "ตะกั่ว(อลูมิเนียมไม่ติดเหล็ก)", pricePerUnit: 15, type: "METAL" },
    { wasteName: "ถุงเหนียว", pricePerUnit: 1, type: "PLASTIC" },
    { wasteName: "เลสชิ้นใหญ่", pricePerUnit: 10, type: "METAL" },
    { wasteName: "ขวดเหล้าขาวใหญ่ (พร้อมลัง)", pricePerUnit: 12, type: "GLASS" },
    { wasteName: "ขวดเหล้าขาวเล็ก(พร้อมลัง)", pricePerUnit: 21, type: "GLASS" },
    { wasteName: "ขวดเบียร์ช้าง (พร้อมลัง)", pricePerUnit: 12, type: "GLASS" },
    { wasteName: "ขวดเบียร์ลีโอ (พร้อมลัง)", pricePerUnit: 11, type: "GLASS" },
    { wasteName: "ขวดเบียร์สิงห์ (พร้อมลัง)", pricePerUnit: 8, type: "GLASS" },
    { wasteName: "แบตเตอรี่ใหญ่ (ก.ก)", pricePerUnit: 15, type: "METAL" },
    { wasteName: "แบตเตอรี่เล็ก (ก.ก)", pricePerUnit: 15, type: "METAL" },
    { wasteName: "โซฟา (แกะ)", pricePerUnit: 30, type: "OTHER" },
    { wasteName: "โซฟา (ไม่แกะ)", pricePerUnit: 12, type: "OTHER" },
    { wasteName: "กล่องเปล่า (ใบละ)", pricePerUnit: 2, type: "PAPER" },
    { wasteName: "โลติดเหล็ก", pricePerUnit: 15, type: "METAL" },
    { wasteName: "น้ำมันพืชใช้แล้ว", pricePerUnit: 7, type: "OTHER" },
    { wasteName: "กระทะ (โลกระทะ)", pricePerUnit: 15, type: "ALUMINUM" },
    { wasteName: "สายไฟสีขาว (ไฟบ้าน)", pricePerUnit: 20, type: "METAL" },
    { wasteName: "สายไฟสีดำ", pricePerUnit: 5, type: "METAL" },
    { wasteName: "ท่อ PVC (ก.ก)", pricePerUnit: 3.5, type: "PLASTIC" },
    { wasteName: "รองเท้าบู๊ท (ก.ก)", pricePerUnit: 2, type: "PLASTIC" },
    { wasteName: "กล่องนม", pricePerUnit: 4, type: "PAPER" },
    { wasteName: "สายยาง", pricePerUnit: 2, type: "PLASTIC" },
    { wasteName: "ขี้เทียน (สีเหลือง)", pricePerUnit: 10, type: "OTHER" },
    { wasteName: "ขี้เทียน (สีแดง+ขาว)", pricePerUnit: 7, type: "OTHER" },
    { wasteName: "แผ่น CD", pricePerUnit: 10, type: "PLASTIC" },
    { wasteName: "มุ้ง, เสื่อ", pricePerUnit: 2, type: "PLASTIC" },
    { wasteName: "หมอน", pricePerUnit: 1, type: "OTHER" },
    { wasteName: "ข้าวแห้ง", pricePerUnit: 3, type: "OTHER" },
    { wasteName: "คอยาวเก่าล้วน(ขวดซอสพริก,น้ำส้มสายชู)", pricePerUnit: 12, type: "GLASS" },
    { wasteName: "คอยาวใหม่ (หงส์นูน)ลัง", pricePerUnit: 12, type: "GLASS" },
    { wasteName: "หงส์แบนใหม่ (นูน) ลัง", pricePerUnit: 20, type: "GLASS" },
    { wasteName: "สแตนเลส 304", pricePerUnit: 10, type: "METAL" },
    { wasteName: "TV จอแบน (ใหญ่+เล็ก)", pricePerUnit: 25, type: "ELECTRONIC" },
    { wasteName: "TV จอนูน", pricePerUnit: 60, type: "ELECTRONIC" },
    { wasteName: "พัดลม", pricePerUnit: 20, type: "ELECTRONIC" },
    { wasteName: "เครื่องซักผ้า", pricePerUnit: 250, type: "ELECTRONIC" },
    { wasteName: "ตู้เย็น", pricePerUnit: 300, type: "ELECTRONIC" },
    { wasteName: "จอคอมพิวเตอร์+CPU", pricePerUnit: 100, type: "ELECTRONIC" },
    { wasteName: "ขวดน้ำสกรีน (ก.ก.)", pricePerUnit: 1, type: "PLASTIC" }
];

async function seed() {
    try {
        await mongoose.connect(dbURI);
        console.log('Connected to MongoDB');

        // 1. Ensure "OTHER" type exists (Electronic already has an ID)
        let otherType = await WasteType.findOne({ wasteTypeName: 'อื่นๆ' });
        if (!otherType) {
            otherType = new WasteType({
                wasteTypeName: 'อื่นๆ',
                colorTheme: '#9E9E9E' // Grey
            });
            await otherType.save();
            console.log('Created Other category');
        }
        TYPES.OTHER = otherType._id.toString();

        // 2. Identify new items only (prevent duplicates)
        const existingWastes = await Waste.find({ isDeleted: false }, 'wasteName');
        const existingNames = existingWastes.map(w => w.wasteName);

        const preparedData = newWasteData
            .filter(item => !existingNames.includes(item.wasteName))
            .map(item => ({
                wasteName: item.wasteName,
                pricePerUnit: item.pricePerUnit,
                wasteType: TYPES[item.type],
                isDeleted: false
            }));

        if (preparedData.length === 0) {
            console.log('No new items to add. All items already exist.');
        } else {
            const result = await Waste.insertMany(preparedData);
            console.log(`Successfully seeded ${result.length} new items`);
            console.log('Skipped items that already existed.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
}

seed();
