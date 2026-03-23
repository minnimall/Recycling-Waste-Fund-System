const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import Models
const WasteSaleRequest = require('./models/wasteSaleRequest');
const Waste = require('./models/waste');
const Family = require('./models/family');

const dbURI = process.env.MONGODB_URI;

if (!dbURI) {
    console.error('Error: MONGODB_URI not found in .env file');
    process.exit(1);
}

async function seed() {
    try {
        await mongoose.connect(dbURI);
        console.log('Connected to MongoDB');

        // Find some wastes and families to associate
        const wastes = await Waste.find().limit(2);
        const families = await Family.find().limit(20);

        if (wastes.length === 0 || families.length === 0) {
            console.error('Need at least 1 Waste and 1 Family in the DB to seed requests.');
            process.exit(1);
        }

        const familyId1 = families[11]._id;
        const familyId2 = families[12]._id;
        const familyId3 = families[13]._id;
        const familyId4 = families[14]._id;
        const wasteId1 = wastes[0]._id;
        const wasteId2 = wastes.length > 1 ? wastes[1]._id : wastes[0]._id;

        const getDate = (offsetDays = 0) => {
            const d = new Date();
            d.setDate(d.getDate() + offsetDays);
            return d;
        };

        const requests = [
            {
                waste: [wasteId1],
                weight: 10,
                date: getDate(0),
                location: "บ้านเลขที่ 123, ตำบล ขามป้อม อำเภอ เปือยน้อย ขอนแก่น 40340 ประเทศไทย",
                locationMoreDetail: "ซอย 1",
                latitude: 15.9514,
                longitude: 102.8824,
                family: familyId1,
                status: 'pending'
            },
            {
                waste: [wasteId1, wasteId2],
                weight: 20,
                date: getDate(0), // today
                location: "บ้านเลขที่ 124, ตำบล ขามป้อม อำเภอ เปือยน้อย ขอนแก่น 40340 ประเทศไทย",
                locationMoreDetail: "ซอย 2",
                latitude: 15.9340,
                longitude: 102.8660,
                family: familyId2,
                status: 'pending'
            },
            {
                waste: [wasteId1],
                weight: 5,
                date: getDate(0), // today
                location: "บ้านเลขที่ 125, ตำบล ขามป้อม อำเภอ เปือยน้อย ขอนแก่น 40340 ประเทศไทย",
                locationMoreDetail: "ซอย 3",
                latitude: 15.9294,
                longitude: 102.8854,
                family: familyId3,
                status: 'pending'
            },
            {
                waste: [wasteId2],
                weight: 15,
                date: getDate(1), // tomorrow
                location: "บ้านเลขที่ 126, ตำบล ขามป้อม อำเภอ เปือยน้อย ขอนแก่น 40340 ประเทศไทย",
                locationMoreDetail: "ซอย 4",
                latitude: 15.9446,
                longitude: 102.8678,
                family: familyId4,
                status: 'pending'
            }
        ];

        const result = await WasteSaleRequest.insertMany(requests);
        console.log(`Successfully seeded ${result.length} wasteSaleRequest records`);

        process.exit(0);
    } catch (err) {
        console.error('Seeding Error:', err);
        process.exit(1);
    }
}

seed();
